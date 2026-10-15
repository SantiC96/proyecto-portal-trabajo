-- ============================================================
-- Portal Municipal de Empleo — Migración 035
-- Estados de curso y regla de rechazos
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_034_busqueda_ofertas_publicas.sql ya aplicada.
-- Re-ejecutable sin errores.
-- ============================================================
--
-- Parte 1 — Estados de las asignaciones de curso:
--   - asignaciones_curso.estado: asignado | en_curso | completado | abandonado
--     (text con CHECK; las filas existentes quedan en 'asignado').
--   - Columnas iniciado_en, completado_en, abandonado_en y updated_at.
--   - Un postulante tiene como máximo una asignación activa (asignado o
--     en_curso): índice único parcial. Si ya había más de una, las más viejas
--     pasan a 'abandonado' (ver BLOQUE 3). No se borra ninguna fila.
--   - Trigger BEFORE UPDATE que valida las transiciones por rol y completa
--     las fechas. Trigger BEFORE INSERT que rechaza una segunda asignación
--     activa con un mensaje claro.
--   - actualizar_estado_mi_curso(): el postulante empieza o completa SU
--     curso. El postulante no tiene UPDATE directo sobre la tabla.
--   - mis_cursos_con_estado(): reemplaza a mis_cursos_asignados() en la
--     aplicación (cambia el tipo de retorno, así que es una función nueva;
--     mis_cursos_asignados() queda igual para no romper el código anterior).
--
-- Parte 2 — Regla de rechazos:
--   Un postulante necesita curso cuando tiene 3 o más rechazos dentro de los
--   últimos 90 días, contando solo los posteriores a su último curso
--   completado, y no tiene una asignación activa.
--   - parametros_cursos(): único lugar donde viven el 3 y el 90.
--   - estado_cursos_postulantes(): cálculo por postulante (rechazos en la
--     ventana, rechazos totales, si necesita curso, asignación activa).
--   - rechazos_desde_ultimo_curso, contar_postulantes_esperando_curso,
--     postulantes_esperando_curso_ids y rechazos_por_postulantes se
--     reescriben con la regla nueva y mantienen su firma y su retorno.
--
-- Fecha de un rechazo: derivaciones.fecha_respuesta, que el trigger
-- derivaciones_empresa_update_fn (028/029) fija en now() cuando la
-- derivación pasa a un estado final. Para filas viejas que pudieran no
-- tenerla se usa updated_at (la última modificación de la derivación, que
-- fue el cambio a 'rechazado'). No se hace backfill: actualizar
-- derivaciones dispararía su trigger de validación, y el COALESCE da el
-- mismo resultado sin tocar datos.
--
-- "Rechazo" es la misma definición que usaba rechazos_desde_ultimo_curso
-- (migration_030): derivaciones con estado_empresa = 'rechazado'.
-- ============================================================


-- ============================================================
-- BLOQUE 1 — Columnas nuevas en asignaciones_curso
-- ADD COLUMN ... NOT NULL DEFAULT 'asignado' completa las filas existentes.
-- ============================================================

ALTER TABLE public.asignaciones_curso
  ADD COLUMN IF NOT EXISTS estado        text        NOT NULL DEFAULT 'asignado',
  ADD COLUMN IF NOT EXISTS iniciado_en   timestamptz,
  ADD COLUMN IF NOT EXISTS completado_en timestamptz,
  ADD COLUMN IF NOT EXISTS abandonado_en timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at    timestamptz NOT NULL DEFAULT now();


-- ============================================================
-- BLOQUE 2 — CHECK de valores de estado
-- Todas las filas existentes valen 'asignado', así que el CHECK se puede
-- validar sin problemas.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    WHERE c.conname  = 'asignaciones_curso_estado_check'
      AND c.conrelid = 'public.asignaciones_curso'::regclass
  ) THEN
    ALTER TABLE public.asignaciones_curso
      ADD CONSTRAINT asignaciones_curso_estado_check
      CHECK (estado IN ('asignado', 'en_curso', 'completado', 'abandonado'));
  END IF;
END;
$$;


-- ============================================================
-- BLOQUE 3 — Datos existentes: una sola asignación activa por postulante
--
-- Antes de esta migración no había estados y la oficina podía asignar
-- varios cursos al mismo postulante. Para poder crear el índice único del
-- BLOQUE 4, si un postulante tiene más de una asignación (todas quedaron en
-- 'asignado' en el BLOQUE 1), se conserva activa solo la más reciente y las
-- anteriores pasan a 'abandonado' con abandonado_en = now().
-- No se borra ninguna fila: el historial de asignaciones queda completo y la
-- oficina puede reactivar cualquiera de ellas (después de marcar como
-- abandonada la activa).
--
-- Corre antes de crear el trigger de transiciones (BLOQUE 6). Al volver a
-- ejecutar el script ya no hay duplicados activos (el índice lo impide), así
-- que este UPDATE no afecta filas y el trigger no interviene.
-- ============================================================

WITH ordenadas AS (
  SELECT
    ac.id,
    pg_catalog.row_number() OVER (
      PARTITION BY ac.postulante_id
      ORDER BY ac.created_at DESC, ac.id DESC
    ) AS orden
  FROM public.asignaciones_curso ac
  WHERE ac.estado IN ('asignado', 'en_curso')
)
UPDATE public.asignaciones_curso ac
SET    estado        = 'abandonado',
       abandonado_en = now(),
       updated_at    = now()
FROM   ordenadas o
WHERE  o.id = ac.id
  AND  o.orden > 1;


-- ============================================================
-- BLOQUE 4 — Índices
-- ============================================================

-- Como máximo una asignación activa por postulante.
CREATE UNIQUE INDEX IF NOT EXISTS asignaciones_curso_una_activa_idx
  ON public.asignaciones_curso (postulante_id)
  WHERE estado IN ('asignado', 'en_curso');

-- Listado de asignaciones de un curso filtrado por estado.
CREATE INDEX IF NOT EXISTS asignaciones_curso_curso_estado_idx
  ON public.asignaciones_curso (curso_id, estado, created_at DESC);

-- Contador "cursos completados en los últimos 7 días" del panel.
CREATE INDEX IF NOT EXISTS asignaciones_curso_completado_en_idx
  ON public.asignaciones_curso (completado_en DESC)
  WHERE estado = 'completado';


-- ============================================================
-- BLOQUE 5 — Permisos por columna
-- La municipalidad solo cambia el estado (y la nota interna); las fechas
-- las completa el trigger. El postulante no tiene política de UPDATE: usa
-- actualizar_estado_mi_curso().
-- ============================================================

REVOKE UPDATE ON public.asignaciones_curso FROM authenticated;
GRANT  UPDATE (estado, nota) ON public.asignaciones_curso TO authenticated;


-- ============================================================
-- BLOQUE 6 — Trigger BEFORE UPDATE: transiciones de estado
--
--   Postulante (vía actualizar_estado_mi_curso):
--     asignado → en_curso
--     asignado | en_curso → completado
--   Municipalidad:
--     asignado | en_curso → abandonado
--     abandonado → asignado (reactivar)
--   Una asignación completada no vuelve atrás, para ningún rol.
--
--   Sin rol (SQL Editor o service role): se permiten las transiciones de
--   ambos roles, nunca salir de 'completado'.
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
      OR (OLD.estado IN ('asignado', 'en_curso') AND NEW.estado = 'completado')
    WHEN v_rol = 'municipalidad' THEN
      (OLD.estado IN ('asignado', 'en_curso') AND NEW.estado = 'abandonado')
      OR (OLD.estado = 'abandonado' AND NEW.estado = 'asignado')
    WHEN v_rol IS NULL THEN
      (OLD.estado = 'asignado' AND NEW.estado = 'en_curso')
      OR (OLD.estado IN ('asignado', 'en_curso') AND NEW.estado IN ('completado', 'abandonado'))
      OR (OLD.estado = 'abandonado' AND NEW.estado = 'asignado')
    ELSE false
  END;

  IF NOT v_permitida THEN
    IF v_rol = 'postulante' AND OLD.estado = 'abandonado' THEN
      RAISE EXCEPTION 'Este curso figura como abandonado. Comunicate con la Oficina de Empleo para retomarlo.';
    END IF;
    RAISE EXCEPTION 'Cambio de estado no permitido: % → %', OLD.estado, NEW.estado;
  END IF;

  -- Reactivar: no puede haber otra asignación activa del mismo postulante.
  IF NEW.estado = 'asignado' AND EXISTS (
    SELECT 1
    FROM public.asignaciones_curso ac
    WHERE ac.postulante_id = NEW.postulante_id
      AND ac.id <> NEW.id
      AND ac.estado IN ('asignado', 'en_curso')
  ) THEN
    RAISE EXCEPTION 'El postulante ya tiene otro curso asignado o en curso. Marcalo como abandonado antes de reactivar este.';
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
-- BLOQUE 7 — Trigger BEFORE INSERT: una sola asignación activa
-- El índice único ya lo garantiza; el trigger da un mensaje claro (P0001)
-- en lugar del error genérico de clave duplicada. Toda asignación nueva
-- empieza en 'asignado' sin fechas de avance.
-- ============================================================

CREATE OR REPLACE FUNCTION public.asignaciones_curso_alta_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  NEW.estado        := 'asignado';
  NEW.iniciado_en   := NULL;
  NEW.completado_en := NULL;
  NEW.abandonado_en := NULL;
  NEW.updated_at    := now();

  IF EXISTS (
    SELECT 1
    FROM public.asignaciones_curso ac
    WHERE ac.postulante_id = NEW.postulante_id
      AND ac.estado IN ('asignado', 'en_curso')
  ) THEN
    RAISE EXCEPTION 'Este postulante ya tiene un curso asignado o en curso. Para asignarle otro, primero marcá el actual como abandonado.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS asignaciones_curso_alta ON public.asignaciones_curso;
CREATE TRIGGER asignaciones_curso_alta
  BEFORE INSERT ON public.asignaciones_curso
  FOR EACH ROW EXECUTE FUNCTION public.asignaciones_curso_alta_fn();


-- ============================================================
-- BLOQUE 8 — actualizar_estado_mi_curso
-- El postulante empieza (en_curso) o completa (completado) una asignación
-- suya. La función verifica la propiedad; el trigger del BLOQUE 6 valida la
-- transición y completa las fechas.
-- ============================================================

CREATE OR REPLACE FUNCTION public.actualizar_estado_mi_curso(
  p_asignacion_id uuid,
  p_estado        text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'postulante' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  IF p_estado IS NULL OR p_estado NOT IN ('en_curso', 'completado') THEN
    RAISE EXCEPTION 'El estado indicado no es válido.';
  END IF;

  PERFORM 1
  FROM public.asignaciones_curso ac
  JOIN public.postulantes p ON p.id = ac.postulante_id
  WHERE ac.id         = p_asignacion_id
    AND p.usuario_id  = auth.uid()
  FOR UPDATE OF ac;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No encontramos ese curso entre tus cursos asignados.';
  END IF;

  UPDATE public.asignaciones_curso ac
  SET    estado = p_estado
  WHERE  ac.id = p_asignacion_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.actualizar_estado_mi_curso(uuid, text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.actualizar_estado_mi_curso(uuid, text) TO authenticated;


-- ============================================================
-- BLOQUE 9 — parametros_cursos
-- Único lugar del SQL con el umbral de rechazos y la ventana en días.
-- La constante equivalente de TypeScript está en src/lib/cursos.ts y solo
-- se usa para los textos de la interfaz.
-- ============================================================

CREATE OR REPLACE FUNCTION public.parametros_cursos()
RETURNS TABLE (umbral_rechazos int, ventana_dias int)
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT 3, 90
$$;

REVOKE EXECUTE ON FUNCTION public.parametros_cursos() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.parametros_cursos() TO authenticated;


-- ============================================================
-- BLOQUE 10 — estado_cursos_postulantes
-- Cálculo por postulante. Con p_postulante_ids NULL devuelve todos los
-- postulantes; con un arreglo, una fila por cada id existente (aunque no
-- tenga rechazos).
--
--   rechazos_ventana   rechazos de los últimos ventana_dias días posteriores
--                      al último curso completado.
--   rechazos_totales   todos los rechazos históricos.
--   necesita_curso     rechazos_ventana >= umbral y sin asignación activa.
--   asignacion_activa_id / asignacion_activa_estado
--                      la asignación en 'asignado' o 'en_curso', si hay.
--   ultima_asignacion_estado
--                      estado de la asignación más reciente (para saber si
--                      abandonó el último curso).
--   ultimo_completado_en
--                      fecha del último curso completado.
-- ============================================================

CREATE OR REPLACE FUNCTION public.estado_cursos_postulantes(p_postulante_ids uuid[] DEFAULT NULL)
RETURNS TABLE (
  postulante_id            uuid,
  rechazos_ventana         bigint,
  rechazos_totales         bigint,
  necesita_curso           boolean,
  asignacion_activa_id     uuid,
  asignacion_activa_estado text,
  ultima_asignacion_estado text,
  ultimo_completado_en     timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

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
    SELECT ac.postulante_id AS pid, ac.id AS asignacion_id, ac.estado AS estado
    FROM public.asignaciones_curso ac
    JOIN base b ON b.pid = ac.postulante_id
    WHERE ac.estado IN ('asignado', 'en_curso')
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
  )
  SELECT
    b.pid                                       AS postulante_id,
    COALESCE(ct.en_ventana, 0)::bigint          AS rechazos_ventana,
    COALESCE(ct.totales, 0)::bigint             AS rechazos_totales,
    (COALESCE(ct.en_ventana, 0) >= par.umbral_rechazos AND a.asignacion_id IS NULL)
                                                AS necesita_curso,
    a.asignacion_id                             AS asignacion_activa_id,
    a.estado                                    AS asignacion_activa_estado,
    u.estado                                    AS ultima_asignacion_estado,
    c.ultimo                                    AS ultimo_completado_en
  FROM base b
  CROSS JOIN parametros par
  LEFT JOIN conteos ct    ON ct.pid = b.pid
  LEFT JOIN activas a     ON a.pid  = b.pid
  LEFT JOIN ultimas u     ON u.pid  = b.pid
  LEFT JOIN completados c ON c.pid  = b.pid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.estado_cursos_postulantes(uuid[]) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.estado_cursos_postulantes(uuid[]) TO authenticated;


-- ============================================================
-- BLOQUE 11 — Funciones de migration_030 reescritas con la regla nueva
-- Misma firma y mismo tipo de retorno (CREATE OR REPLACE).
-- ============================================================

-- 11a. Rechazos dentro de la ventana para un postulante.
--      El nombre se conserva por compatibilidad; ahora cuenta los rechazos
--      de los últimos 90 días posteriores al último curso COMPLETADO.
CREATE OR REPLACE FUNCTION public.rechazos_desde_ultimo_curso(p_postulante_id uuid)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_resultado bigint;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT e.rechazos_ventana INTO v_resultado
  FROM public.estado_cursos_postulantes(ARRAY[p_postulante_id]) e;

  RETURN COALESCE(v_resultado, 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rechazos_desde_ultimo_curso(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.rechazos_desde_ultimo_curso(uuid) TO authenticated;


-- 11b. Cantidad de postulantes que necesitan curso.
CREATE OR REPLACE FUNCTION public.contar_postulantes_esperando_curso()
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_resultado bigint;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT COUNT(*) INTO v_resultado
  FROM public.estado_cursos_postulantes(NULL) e
  WHERE e.necesita_curso;

  RETURN v_resultado;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.contar_postulantes_esperando_curso() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.contar_postulantes_esperando_curso() TO authenticated;


-- 11c. Ids de los postulantes que necesitan curso (filtro "Esperando curso").
CREATE OR REPLACE FUNCTION public.postulantes_esperando_curso_ids()
RETURNS TABLE (postulante_id uuid)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT e.postulante_id
  FROM public.estado_cursos_postulantes(NULL) e
  WHERE e.necesita_curso;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.postulantes_esperando_curso_ids() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.postulantes_esperando_curso_ids() TO authenticated;


-- 11d. (postulante_id, rechazos en la ventana) para un lote de postulantes.
--      Como antes, solo devuelve postulantes con al menos 1 rechazo contable.
CREATE OR REPLACE FUNCTION public.rechazos_por_postulantes(p_postulante_ids uuid[])
RETURNS TABLE (postulante_id uuid, rechazos bigint)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT e.postulante_id, e.rechazos_ventana
  FROM public.estado_cursos_postulantes(COALESCE(p_postulante_ids, ARRAY[]::uuid[])) e
  WHERE e.rechazos_ventana > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rechazos_por_postulantes(uuid[]) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.rechazos_por_postulantes(uuid[]) TO authenticated;


-- ============================================================
-- BLOQUE 12 — mis_cursos_con_estado
-- Vista del postulante sobre sus asignaciones, con estado y fechas.
-- Sin la nota interna. Nunca fecha, hora ni lugar del curso (los cursos no
-- los tienen).
--
-- por_rechazos indica si, al momento de la asignación, el postulante
-- cumplía la regla de rechazos (para el texto del aviso: "Tuviste 3
-- rechazos recientes y…"). Solo mira sus propias derivaciones.
-- ============================================================

CREATE OR REPLACE FUNCTION public.mis_cursos_con_estado()
RETURNS TABLE (
  asignacion_id uuid,
  curso_id      uuid,
  asignado_en   timestamptz,
  estado        text,
  iniciado_en   timestamptz,
  completado_en timestamptz,
  abandonado_en timestamptz,
  nombre        text,
  descripcion   text,
  link          text,
  indicaciones  text,
  por_rechazos  boolean
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT
    ac.id          AS asignacion_id,
    ac.curso_id,
    ac.created_at  AS asignado_en,
    ac.estado,
    ac.iniciado_en,
    ac.completado_en,
    ac.abandonado_en,
    c.nombre,
    c.descripcion,
    c.link,
    c.indicaciones,
    (
      SELECT COUNT(*)
      FROM public.derivaciones d
      JOIN public.postulaciones po ON po.id = d.postulacion_id
      WHERE po.postulante_id = ac.postulante_id
        AND d.estado_empresa = 'rechazado'
        AND COALESCE(d.fecha_respuesta, d.updated_at) <= ac.created_at
        AND COALESCE(d.fecha_respuesta, d.updated_at)
            >= ac.created_at - pg_catalog.make_interval(days => par.ventana_dias)
        AND NOT EXISTS (
          SELECT 1
          FROM public.asignaciones_curso prev
          WHERE prev.postulante_id = ac.postulante_id
            AND prev.estado        = 'completado'
            AND prev.completado_en <= ac.created_at
            AND prev.completado_en >= COALESCE(d.fecha_respuesta, d.updated_at)
        )
    ) >= par.umbral_rechazos AS por_rechazos
  FROM public.asignaciones_curso ac
  JOIN public.cursos c      ON c.id = ac.curso_id
  JOIN public.postulantes p ON p.id = ac.postulante_id
  CROSS JOIN public.parametros_cursos() par
  WHERE p.usuario_id = auth.uid()
  ORDER BY ac.created_at DESC
$$;

REVOKE EXECUTE ON FUNCTION public.mis_cursos_con_estado() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.mis_cursos_con_estado() TO authenticated;
