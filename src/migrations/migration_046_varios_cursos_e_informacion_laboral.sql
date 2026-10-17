-- ============================================================
-- Portal Municipal de Empleo — Migración 046
-- Varios cursos a la vez e información laboral del postulante
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_045_pre_entrevista_opcional.sql ya aplicada.
-- Re-ejecutable sin errores. No borra ni modifica datos existentes.
-- Después de aplicarla: npm run db:tipos
-- ============================================================
--
-- Parte 1 — Varios cursos a la vez (ver docs/decisiones/012):
--   BLOQUE 1  estado_cursos_calculo (043): la regla vive acá. Suma
--             puede_recibir_curso y cursos_activos. CAMBIA EL RETORNO:
--             DROP + CREATE.
--               puede_recibir_curso  umbral o más rechazos en la ventana,
--                                    posteriores al último curso completado
--                                    (la misma cuenta de siempre), tenga o no
--                                    cursos activos.
--               necesita_curso       puede_recibir_curso y sin ningún curso
--                                    activo (asignado o en_curso). La usan el
--                                    aviso a la oficina, el filtro "Esperando
--                                    curso" y el contador del inicio.
--             asignacion_activa_id / asignacion_activa_estado pasan a ser UNA
--             de las activas: la en_curso más reciente o, si no hay, la
--             asignada más reciente.
--   BLOQUE 2  estado_cursos_postulantes (043): mismo control de rol, mismo
--             retorno que estado_cursos_calculo. CAMBIA EL RETORNO: DROP +
--             CREATE. Las funciones que la llaman (rechazos_desde_ultimo_curso,
--             contar_postulantes_esperando_curso, postulantes_esperando_curso_ids,
--             rechazos_por_postulantes) son plpgsql, no dependen de ella en el
--             catálogo y solo leen columnas que siguen existiendo.
--   BLOQUE 3  Índices: un postulante no puede tener dos asignaciones activas
--             del MISMO curso. Se quita asignaciones_curso_una_activa_idx (035).
--   BLOQUE 4  asignaciones_curso_alta_fn (039), misma firma: rechaza el mismo
--             curso activo y, si asigna la oficina, exige puede_recibir_curso.
--   BLOQUE 5  asignaciones_curso_transicion_fn (038), misma firma: la
--             reactivación sin rol controla el mismo curso, no cualquiera.
--
-- Parte 2 — Información laboral (ver docs/decisiones/018):
--   BLOQUE 6  Columnas opcionales en postulantes con CHECK.
--   BLOQUE 7  Grants por columna: el postulante las edita en su perfil (la
--             política "postulantes: editar propio perfil" de 004 ya limita
--             la fila).
--   BLOQUE 8  actualizar_mi_perfil_postulante (040): suma los 4 campos en la
--             misma transacción. CAMBIA LA FIRMA: DROP + CREATE.
--   BLOQUE 9  candidato_para_empresa (028) y candidato_para_empresa_completo
--             (029): devuelven los 4 campos. CAMBIA EL RETORNO: DROP + CREATE.
--
-- Ningún trigger, política ni vista depende de las funciones que se borran:
-- las que las llaman son plpgsql o sql sin BEGIN ATOMIC, que Postgres no
-- registra como dependencias. Los triggers apuntan a las funciones *_fn, que
-- se reemplazan con CREATE OR REPLACE (misma firma).
-- ============================================================


-- ============================================================
-- BLOQUE 1 — estado_cursos_calculo
-- Mismo cuerpo que 043 salvo:
--   - activas: una fila por postulante (antes el índice garantizaba que
--     hubiera una sola) y la cantidad de activas.
--   - puede_recibir_curso y cursos_activos al final del retorno.
-- Sin EXECUTE para los roles del cliente, como en 043.
-- ============================================================

DROP FUNCTION IF EXISTS public.estado_cursos_calculo(uuid[]);

CREATE FUNCTION public.estado_cursos_calculo(p_postulante_ids uuid[])
RETURNS TABLE (
  postulante_id            uuid,
  rechazos_ventana         bigint,
  rechazos_totales         bigint,
  necesita_curso           boolean,
  asignacion_activa_id     uuid,
  asignacion_activa_estado text,
  ultima_asignacion_estado text,
  ultimo_completado_en     timestamptz,
  puede_recibir_curso      boolean,
  cursos_activos           bigint
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  WITH parametros AS (
    SELECT pc.umbral_rechazos, pc.ventana_dias
    FROM public.parametros_cursos() pc
  ),
  base AS (
    SELECT p.id AS pid
    FROM public.postulantes p
    WHERE p_postulante_ids IS NULL OR p.id = ANY (p_postulante_ids)
  ),
  completados AS (
    SELECT ac.postulante_id AS pid, MAX(ac.completado_en) AS ultimo
    FROM public.asignaciones_curso ac
    JOIN base b ON b.pid = ac.postulante_id
    WHERE ac.estado = 'completado'
    GROUP BY ac.postulante_id
  ),
  activas AS (
    SELECT DISTINCT ON (ac.postulante_id)
      ac.postulante_id AS pid,
      ac.id            AS asignacion_id,
      ac.estado        AS estado,
      COUNT(*) OVER (PARTITION BY ac.postulante_id) AS cantidad
    FROM public.asignaciones_curso ac
    JOIN base b ON b.pid = ac.postulante_id
    WHERE ac.estado IN ('asignado', 'en_curso')
    ORDER BY ac.postulante_id, (ac.estado = 'en_curso') DESC, ac.created_at DESC, ac.id DESC
  ),
  ultimas AS (
    SELECT DISTINCT ON (ac.postulante_id)
      ac.postulante_id AS pid, ac.estado AS estado
    FROM public.asignaciones_curso ac
    JOIN base b ON b.pid = ac.postulante_id
    ORDER BY ac.postulante_id, ac.created_at DESC, ac.id DESC
  ),
  rechazos AS (
    SELECT
      po.postulante_id AS pid,
      COALESCE(d.fecha_respuesta, d.updated_at) AS fecha
    FROM public.derivaciones d
    JOIN public.postulaciones po ON po.id = d.postulacion_id
    JOIN base b ON b.pid = po.postulante_id
    WHERE d.estado_empresa = 'rechazado'
  ),
  conteos AS (
    SELECT
      r.pid,
      COUNT(*) AS totales,
      COUNT(*) FILTER (
        WHERE r.fecha >= now() - pg_catalog.make_interval(days => par.ventana_dias)
          AND (c.ultimo IS NULL OR r.fecha > c.ultimo)
      ) AS en_ventana
    FROM rechazos r
    CROSS JOIN parametros par
    LEFT JOIN completados c ON c.pid = r.pid
    GROUP BY r.pid
  ),
  regla AS (
    SELECT
      b.pid,
      COALESCE(ct.en_ventana, 0)                        AS en_ventana,
      COALESCE(ct.totales, 0)                           AS totales,
      (COALESCE(ct.en_ventana, 0) >= par.umbral_rechazos) AS puede,
      COALESCE(a.cantidad, 0)                           AS activos
    FROM base b
    CROSS JOIN parametros par
    LEFT JOIN conteos ct ON ct.pid = b.pid
    LEFT JOIN activas a  ON a.pid  = b.pid
  )
  SELECT
    rg.pid                                AS postulante_id,
    rg.en_ventana::bigint                 AS rechazos_ventana,
    rg.totales::bigint                    AS rechazos_totales,
    (rg.puede AND rg.activos = 0)         AS necesita_curso,
    a.asignacion_id                       AS asignacion_activa_id,
    a.estado                              AS asignacion_activa_estado,
    u.estado                              AS ultima_asignacion_estado,
    c.ultimo                              AS ultimo_completado_en,
    rg.puede                              AS puede_recibir_curso,
    rg.activos::bigint                    AS cursos_activos
  FROM regla rg
  LEFT JOIN activas a     ON a.pid = rg.pid
  LEFT JOIN ultimas u     ON u.pid = rg.pid
  LEFT JOIN completados c ON c.pid = rg.pid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.estado_cursos_calculo(uuid[])
  FROM public, anon, authenticated;


-- ============================================================
-- BLOQUE 2 — estado_cursos_postulantes
-- Mismo control de rol que 035/043; devuelve lo que calcula
-- estado_cursos_calculo().
-- ============================================================

DROP FUNCTION IF EXISTS public.estado_cursos_postulantes(uuid[]);

CREATE FUNCTION public.estado_cursos_postulantes(p_postulante_ids uuid[] DEFAULT NULL)
RETURNS TABLE (
  postulante_id            uuid,
  rechazos_ventana         bigint,
  rechazos_totales         bigint,
  necesita_curso           boolean,
  asignacion_activa_id     uuid,
  asignacion_activa_estado text,
  ultima_asignacion_estado text,
  ultimo_completado_en     timestamptz,
  puede_recibir_curso      boolean,
  cursos_activos           bigint
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    e.postulante_id,
    e.rechazos_ventana,
    e.rechazos_totales,
    e.necesita_curso,
    e.asignacion_activa_id,
    e.asignacion_activa_estado,
    e.ultima_asignacion_estado,
    e.ultimo_completado_en,
    e.puede_recibir_curso,
    e.cursos_activos
  FROM public.estado_cursos_calculo(p_postulante_ids) e;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.estado_cursos_postulantes(uuid[]) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.estado_cursos_postulantes(uuid[]) TO authenticated;


-- ============================================================
-- BLOQUE 3 — Índices de asignaciones_curso
--
-- Nuevo: como máximo una asignación activa por (postulante, curso). Mientras
-- exista el índice de 035 no puede haber dos activas del mismo postulante,
-- así que el control no debería encontrar nada; si lo encuentra (por ejemplo,
-- al re-ejecutar después de que alguien corrigió datos a mano), no se crea el
-- índice y se avisa con un NOTICE. Los triggers de los BLOQUES 4 y 5 siguen
-- rechazando el mismo curso activo aunque falte el índice.
--
-- Después se quita asignaciones_curso_una_activa_idx (035): ya no hay límite
-- de cursos activos por postulante.
-- ============================================================

DO $$
BEGIN
  IF pg_catalog.to_regclass('public.asignaciones_curso_mismo_curso_activo_idx') IS NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.asignaciones_curso ac
      WHERE ac.estado IN ('asignado', 'en_curso')
      GROUP BY ac.postulante_id, ac.curso_id
      HAVING COUNT(*) > 1
    ) THEN
      RAISE NOTICE 'No se creó asignaciones_curso_mismo_curso_activo_idx: hay postulantes con dos asignaciones activas del mismo curso. Revisalas con: SELECT postulante_id, curso_id, COUNT(*) FROM public.asignaciones_curso WHERE estado IN (''asignado'', ''en_curso'') GROUP BY 1, 2 HAVING COUNT(*) > 1;';
    ELSE
      CREATE UNIQUE INDEX asignaciones_curso_mismo_curso_activo_idx
        ON public.asignaciones_curso (postulante_id, curso_id)
        WHERE estado IN ('asignado', 'en_curso');
    END IF;
  END IF;
END;
$$;

DROP INDEX IF EXISTS public.asignaciones_curso_una_activa_idx;


-- ============================================================
-- BLOQUE 4 — Trigger BEFORE INSERT de asignaciones_curso (reemplazo de 039)
--
--   Todos los roles: no se puede asignar un curso que el postulante ya tiene
--     asignado o en curso (P0001). El índice del BLOQUE 3 lo garantiza
--     igual; el trigger da el mensaje claro.
--   Municipalidad: además exige puede_recibir_curso (mismo mensaje que 039),
--     aunque ya tenga otros cursos activos.
--   Sin rol (SQL Editor o service role): no se exige la regla de rechazos,
--     como en 039, para correcciones manuales.
--
-- La fila del postulante se bloquea (FOR UPDATE) para que dos asignaciones
-- simultáneas del mismo curso se ordenen y la segunda reciba el mensaje del
-- trigger en lugar del error de clave duplicada.
-- ============================================================

CREATE OR REPLACE FUNCTION public.asignaciones_curso_alta_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_rol   text := public.rol_actual()::text;
  v_puede boolean;
BEGIN
  NEW.estado        := 'asignado';
  NEW.iniciado_en   := NULL;
  NEW.completado_en := NULL;
  NEW.abandonado_en := NULL;
  NEW.updated_at    := now();

  PERFORM 1
  FROM public.postulantes p
  WHERE p.id = NEW.postulante_id
  FOR UPDATE;

  IF EXISTS (
    SELECT 1
    FROM public.asignaciones_curso ac
    WHERE ac.postulante_id = NEW.postulante_id
      AND ac.curso_id      = NEW.curso_id
      AND ac.estado IN ('asignado', 'en_curso')
  ) THEN
    RAISE EXCEPTION 'Este postulante ya tiene este curso pendiente.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_rol IS NOT DISTINCT FROM 'municipalidad' THEN
    SELECT e.puede_recibir_curso INTO v_puede
    FROM public.estado_cursos_calculo(ARRAY[NEW.postulante_id]) e;

    IF v_puede IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Solo se puede asignar un curso a postulantes con 3 o más rechazos recientes.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS asignaciones_curso_alta ON public.asignaciones_curso;
CREATE TRIGGER asignaciones_curso_alta
  BEFORE INSERT ON public.asignaciones_curso
  FOR EACH ROW EXECUTE FUNCTION public.asignaciones_curso_alta_fn();


-- ============================================================
-- BLOQUE 5 — Trigger BEFORE UPDATE de asignaciones_curso (reemplazo de 038)
-- Igual que 038; el único cambio es la reactivación (abandonado → asignado,
-- solo sin rol): ahora solo la impide otra asignación activa del MISMO curso.
-- ============================================================

CREATE OR REPLACE FUNCTION public.asignaciones_curso_transicion_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_rol text := public.rol_actual()::text;
  v_permitida boolean;
BEGIN
  -- Columnas que nunca cambian después del alta. asignado_por sí puede pasar
  -- a NULL: es el ON DELETE SET NULL de la FK cuando se borra el usuario de
  -- la oficina que hizo la asignación (migration_030).
  IF NEW.postulante_id IS DISTINCT FROM OLD.postulante_id
     OR NEW.curso_id   IS DISTINCT FROM OLD.curso_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR (NEW.asignado_por IS DISTINCT FROM OLD.asignado_por AND NEW.asignado_por IS NOT NULL) THEN
    RAISE EXCEPTION 'No se pueden modificar los datos de la asignación.';
  END IF;

  IF NEW.estado IS NOT DISTINCT FROM OLD.estado THEN
    -- Sin cambio de estado (por ejemplo, editar la nota): las fechas no cambian.
    NEW.iniciado_en   := OLD.iniciado_en;
    NEW.completado_en := OLD.completado_en;
    NEW.abandonado_en := OLD.abandonado_en;
    NEW.updated_at    := now();
    RETURN NEW;
  END IF;

  IF OLD.estado = 'completado' THEN
    RAISE EXCEPTION 'Este curso ya está completado y no puede cambiar de estado.';
  END IF;

  v_permitida := CASE
    WHEN v_rol = 'postulante' THEN
      (OLD.estado = 'asignado' AND NEW.estado = 'en_curso')
      OR (OLD.estado = 'en_curso' AND NEW.estado = 'completado')
    WHEN v_rol IS NULL THEN
      (OLD.estado = 'asignado' AND NEW.estado = 'en_curso')
      OR (OLD.estado = 'en_curso' AND NEW.estado = 'completado')
      OR (OLD.estado IN ('asignado', 'en_curso') AND NEW.estado = 'abandonado')
      OR (OLD.estado = 'abandonado' AND NEW.estado = 'asignado')
    ELSE false
  END;

  IF NOT v_permitida THEN
    IF v_rol = 'postulante' THEN
      IF OLD.estado = 'asignado' AND NEW.estado = 'completado' THEN
        RAISE EXCEPTION 'Primero tenés que empezar el curso.';
      END IF;
      IF OLD.estado = 'abandonado' THEN
        RAISE EXCEPTION 'Este curso figura como abandonado y ya no puede cambiar de estado.';
      END IF;
    ELSIF v_rol = 'municipalidad' THEN
      IF NEW.estado = 'abandonado' THEN
        RAISE EXCEPTION 'La Oficina de Empleo no puede marcar un curso como abandonado. El curso sigue pendiente hasta que el postulante lo complete.';
      END IF;
      IF OLD.estado = 'abandonado' THEN
        RAISE EXCEPTION 'Los cursos abandonados quedan como historial y no se pueden reactivar. Si el postulante necesita un curso, asignale uno nuevo.';
      END IF;
      RAISE EXCEPTION 'La Oficina de Empleo no puede cambiar el estado de un curso asignado: lo actualiza el postulante.';
    END IF;
    RAISE EXCEPTION 'Cambio de estado no permitido: % → %', OLD.estado, NEW.estado;
  END IF;

  -- Reactivar (solo sin rol): no puede haber otra asignación activa del
  -- mismo curso para el mismo postulante. Otros cursos activos no importan.
  IF NEW.estado = 'asignado' AND EXISTS (
    SELECT 1
    FROM public.asignaciones_curso ac
    WHERE ac.postulante_id = NEW.postulante_id
      AND ac.curso_id      = NEW.curso_id
      AND ac.id <> NEW.id
      AND ac.estado IN ('asignado', 'en_curso')
  ) THEN
    RAISE EXCEPTION 'Este postulante ya tiene este curso pendiente.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Fechas según el estado nuevo.
  IF NEW.estado = 'en_curso' THEN
    NEW.iniciado_en := now();
  ELSIF NEW.estado = 'completado' THEN
    NEW.completado_en := now();
  ELSIF NEW.estado = 'abandonado' THEN
    NEW.abandonado_en := now();
  ELSIF NEW.estado = 'asignado' THEN
    -- Reactivación: la asignación vuelve a empezar.
    NEW.iniciado_en   := NULL;
    NEW.abandonado_en := NULL;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS asignaciones_curso_transicion ON public.asignaciones_curso;
CREATE TRIGGER asignaciones_curso_transicion
  BEFORE UPDATE ON public.asignaciones_curso
  FOR EACH ROW EXECUTE FUNCTION public.asignaciones_curso_transicion_fn();


-- ============================================================
-- BLOQUE 6 — Información laboral en postulantes
-- Todas opcionales (NULL = sin completar). Las filas existentes quedan en
-- NULL, así que los CHECK se validan sin problemas. Los valores cerrados se
-- repiten en src/lib/informacion-laboral.ts (etiquetas de la interfaz).
-- ============================================================

ALTER TABLE public.postulantes
  ADD COLUMN IF NOT EXISTS nivel_educativo     text,
  ADD COLUMN IF NOT EXISTS situacion_laboral   text,
  ADD COLUMN IF NOT EXISTS disponibilidad      text,
  ADD COLUMN IF NOT EXISTS experiencia_laboral text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conname = 'postulantes_nivel_educativo_check'
      AND c.conrelid = 'public.postulantes'::regclass
  ) THEN
    ALTER TABLE public.postulantes
      ADD CONSTRAINT postulantes_nivel_educativo_check
      CHECK (nivel_educativo IS NULL OR nivel_educativo IN (
        'primario_incompleto', 'primario_completo',
        'secundario_incompleto', 'secundario_completo',
        'terciario_incompleto', 'terciario_completo',
        'universitario_incompleto', 'universitario_completo'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conname = 'postulantes_situacion_laboral_check'
      AND c.conrelid = 'public.postulantes'::regclass
  ) THEN
    ALTER TABLE public.postulantes
      ADD CONSTRAINT postulantes_situacion_laboral_check
      CHECK (situacion_laboral IS NULL OR situacion_laboral IN (
        'desempleado', 'empleado', 'independiente', 'estudiante', 'otro'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conname = 'postulantes_disponibilidad_check'
      AND c.conrelid = 'public.postulantes'::regclass
  ) THEN
    ALTER TABLE public.postulantes
      ADD CONSTRAINT postulantes_disponibilidad_check
      CHECK (disponibilidad IS NULL OR disponibilidad IN (
        'manana', 'tarde', 'noche', 'completa', 'flexible'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conname = 'postulantes_experiencia_laboral_check'
      AND c.conrelid = 'public.postulantes'::regclass
  ) THEN
    ALTER TABLE public.postulantes
      ADD CONSTRAINT postulantes_experiencia_laboral_check
      CHECK (experiencia_laboral IS NULL OR pg_catalog.char_length(experiencia_laboral) <= 2000);
  END IF;
END;
$$;


-- ============================================================
-- BLOQUE 7 — Permisos por columna
-- 018 dejó UPDATE solo sobre (dni, domicilio); se suman las 4 columnas
-- nuevas. La fila la sigue limitando la política "postulantes: editar propio
-- perfil" (004). SELECT no cambia: el postulante ve su fila y la oficina
-- todas (004); la empresa no lee la tabla, usa las funciones del BLOQUE 9.
-- ============================================================

GRANT UPDATE (nivel_educativo, situacion_laboral, disponibilidad, experiencia_laboral)
  ON public.postulantes TO authenticated;


-- ============================================================
-- BLOQUE 8 — actualizar_mi_perfil_postulante
-- Igual que 040 más los 4 campos de información laboral, en la misma
-- transacción. Un texto vacío se guarda como NULL (sin completar). Los CHECK
-- del BLOQUE 6 rechazan valores fuera de la lista (23514); la server action
-- los valida antes.
-- ============================================================



CREATE FUNCTION public.actualizar_mi_perfil_postulante(
  p_nombre              text,
  p_apellido            text,
  p_telefono            text,
  p_domicilio           text,
  p_dni                 text,
  p_nivel_educativo     text,
  p_situacion_laboral   text,
  p_disponibilidad      text,
  p_experiencia_laboral text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'postulante' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  UPDATE public.usuarios u
  SET    nombre   = p_nombre,
         apellido = p_apellido,
         telefono = p_telefono
  WHERE  u.id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró tu perfil.';
  END IF;

  UPDATE public.postulantes p
  SET    domicilio           = NULLIF(pg_catalog.btrim(p_domicilio), ''),
         dni                 = p_dni,
         nivel_educativo     = NULLIF(pg_catalog.btrim(p_nivel_educativo), ''),
         situacion_laboral   = NULLIF(pg_catalog.btrim(p_situacion_laboral), ''),
         disponibilidad      = NULLIF(pg_catalog.btrim(p_disponibilidad), ''),
         experiencia_laboral = NULLIF(pg_catalog.btrim(p_experiencia_laboral), '')
  WHERE  p.usuario_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró tu perfil de postulante.';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.actualizar_mi_perfil_postulante(
  text, text, text, text, text, text, text, text, text
) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.actualizar_mi_perfil_postulante(
  text, text, text, text, text, text, text, text, text
) TO authenticated;


-- ============================================================
-- BLOQUE 9 — Datos del candidato para la empresa
-- Mismo cuerpo y mismo control de acceso que 028/029 (derivado alguna vez a
-- la empresa o guardado por ella); se suman al final las 4 columnas de
-- información laboral. Siguen sin exponer DNI, domicilio ni notas internas.
-- ============================================================

DROP FUNCTION IF EXISTS public.candidato_para_empresa(uuid);

CREATE FUNCTION public.candidato_para_empresa(p_postulante_id uuid)
RETURNS TABLE (
  nombre              text,
  apellido            text,
  email               text,
  telefono            text,
  cv_ruta             text,
  nivel_educativo     text,
  situacion_laboral   text,
  disponibilidad      text,
  experiencia_laboral text
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT
    u.nombre,
    u.apellido,
    au.email::text  AS email,
    u.telefono,
    a.ruta          AS cv_ruta,
    p.nivel_educativo,
    p.situacion_laboral,
    p.disponibilidad,
    p.experiencia_laboral
  FROM public.postulantes p
  JOIN public.usuarios u ON u.id = p.usuario_id
  JOIN auth.users au     ON au.id = u.id
  LEFT JOIN (
    SELECT ar.ruta, ar.usuario_id
    FROM public.archivos_usuario ar
    WHERE ar.tipo = 'cv' AND ar.activo = true
  ) a ON a.usuario_id = u.id
  WHERE p.id = p_postulante_id
    AND (
      -- Derivado alguna vez a esta empresa
      EXISTS (
        SELECT 1
        FROM public.postulaciones po
        JOIN public.derivaciones d ON d.postulacion_id = po.id
        JOIN public.ofertas o      ON o.id  = po.oferta_id
        JOIN public.empresas e     ON e.id  = o.empresa_id
        WHERE po.postulante_id = p_postulante_id
          AND e.usuario_id     = auth.uid()
      )
      OR
      -- Guardado por esta empresa
      EXISTS (
        SELECT 1
        FROM public.candidatos_guardados cg
        JOIN public.empresas e ON e.id = cg.empresa_id
        WHERE cg.postulante_id = p_postulante_id
          AND e.usuario_id     = auth.uid()
      )
    )
$$;

REVOKE EXECUTE ON FUNCTION public.candidato_para_empresa(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.candidato_para_empresa(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.candidato_para_empresa_completo(uuid);

CREATE FUNCTION public.candidato_para_empresa_completo(p_postulante_id uuid)
RETURNS TABLE (
  nombre              text,
  apellido            text,
  email               text,
  telefono            text,
  cv_ruta             text,
  foto_ruta           text,
  rubros_interes      text[],
  nivel_educativo     text,
  situacion_laboral   text,
  disponibilidad      text,
  experiencia_laboral text
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT
    u.nombre,
    u.apellido,
    au.email::text  AS email,
    u.telefono,
    (SELECT ar.ruta FROM public.archivos_usuario ar
     WHERE ar.usuario_id = u.id AND ar.tipo = 'cv' AND ar.activo = true
     LIMIT 1)       AS cv_ruta,
    (SELECT ar.ruta FROM public.archivos_usuario ar
     WHERE ar.usuario_id = u.id AND ar.tipo = 'avatar' AND ar.activo = true
     LIMIT 1)       AS foto_ruta,
    COALESCE(
      (SELECT ARRAY_AGG(c.nombre ORDER BY c.nombre)
       FROM public.postulante_categorias pc
       JOIN public.categorias c ON c.id = pc.categoria_id
       WHERE pc.postulante_id = p.id),
      ARRAY[]::text[]
    )               AS rubros_interes,
    p.nivel_educativo,
    p.situacion_laboral,
    p.disponibilidad,
    p.experiencia_laboral
  FROM public.postulantes p
  JOIN public.usuarios u ON u.id = p.usuario_id
  JOIN auth.users au     ON au.id = u.id
  WHERE p.id = p_postulante_id
    AND (
      EXISTS (
        SELECT 1
        FROM public.postulaciones po
        JOIN public.derivaciones d ON d.postulacion_id = po.id
        JOIN public.ofertas o      ON o.id  = po.oferta_id
        JOIN public.empresas e     ON e.id  = o.empresa_id
        WHERE po.postulante_id = p_postulante_id
          AND e.usuario_id     = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1
        FROM public.candidatos_guardados cg
        JOIN public.empresas e ON e.id = cg.empresa_id
        WHERE cg.postulante_id = p_postulante_id
          AND e.usuario_id     = auth.uid()
      )
    )
$$;

REVOKE EXECUTE ON FUNCTION public.candidato_para_empresa_completo(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.candidato_para_empresa_completo(uuid) TO authenticated;
