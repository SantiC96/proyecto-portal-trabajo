-- ============================================================
-- Portal Municipal de Empleo — Migración 051
-- Borradores de ofertas, retiro de la oferta, requisito mínimo en la base
-- y borrado lógico de ofertas
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_050_gestion_admins.sql ya aplicada.
-- Re-ejecutable sin errores. No borra ni modifica datos existentes: las
-- columnas nuevas quedan en NULL y ninguna fila cambia de estado.
-- Después de aplicarla: npm run db:tipos
-- ============================================================
--
-- Ver docs/decisiones/024-borradores-retiro-y-eliminacion-de-ofertas.md.
--
--   BLOQUE 0  Diagnóstico (solo lectura): ofertas publicadas o enviadas sin
--             ningún requisito.
--   BLOQUE 1  Estado 'oferta_retirada' en estado_postulacion y
--             estado_empresa: cierre de un proceso porque la empresa retiró
--             la oferta. NO es un rechazo.
--   BLOQUE 2  ofertas.eliminada_en (borrado lógico) y su CHECK: solo se
--             elimina una oferta que nunca se publicó.
--   BLOQUE 3  Requisito mínimo: oferta_tiene_requisito() y el CHECK
--             ofertas_requisito_minimo_check (NOT VALID si hay filas viejas
--             que no cumplen, ver el bloque).
--   BLOQUE 4  ofertas_requisito_minimo_fn (032): no se aplica a borradores.
--   BLOQUE 5  Reglas de borradores y ofertas eliminadas (trigger BEFORE
--             UPDATE): un borrador solo pasa a 'pendiente_aprobacion' y solo
--             si tiene todos los obligatorios; una oferta eliminada no se
--             modifica.
--   BLOQUE 6  Políticas RLS: borradores y eliminadas fuera del público, la
--             oficina y el postulante. La empresa ya no borra filas.
--   BLOQUE 7  guardar_borrador_oferta() y enviar_borrador_oferta().
--   BLOQUE 8  editar_oferta_empresa (040), misma firma: rechaza borradores y
--             ofertas eliminadas.
--   BLOQUE 9  Avisos: tipos nuevos ('oferta_retirada', 'postulacion_cerrada'),
--             email del postulante, y el aviso 'oferta_pendiente' al enviar
--             un borrador (no al guardarlo).
--   BLOQUE 10 Retiro de la oferta: retirar_oferta(), conteo de procesos
--             abiertos para el diálogo, protección del estado nuevo en
--             postulaciones y derivaciones, avisos al postulante.
--   BLOQUE 11 Borrado lógico: eliminar_oferta(), restaurar_oferta() y
--             purgar_ofertas_eliminadas() (solo service_role, la llama el
--             cron /api/mantenimiento/purgar).
--   BLOQUE 12 indicadores_empresa e indicadores_por_oferta_empresa (049),
--             misma firma: sin borradores ni eliminadas.
--
-- Funciones existentes que se reemplazan (todas con CREATE OR REPLACE y la
-- misma firma): ofertas_requisito_minimo_fn (032),
-- prevent_empresa_editar_pendiente_fn (024), editar_oferta_empresa (040), email_tipo_con_envio (048), ofertas_notificar_revision_fn (043),
-- derivaciones_empresa_update_fn (029), derivaciones_notificar_postulante_fn
-- (041), indicadores_empresa e indicadores_por_oferta_empresa (049).
--
-- Funciones que leen ofertas y NO cambian, porque solo miran ofertas
-- 'activa' (un borrador nunca lo es y una eliminada tampoco, por el CHECK del
-- BLOQUE 2): buscar_ofertas_publicas (036), oferta_acepta_postulaciones (036),
-- renovar_oferta (036), generar_avisos_vencimiento_empresa (041),
-- indicadores_portal (047). Las que cuentan rechazos (estado_cursos_calculo
-- 046, postulaciones_no_seleccionadas 038, indicadores 047/049) filtran por
-- 'rechazado' / 'rechazada_municipalidad', así que 'oferta_retirada' no
-- cuenta como rechazo sin tocarlas.
--
-- Los valores nuevos de los enums (BLOQUE 1) se agregan en la misma
-- transacción en que se usan. Postgres lo permite siempre que nada los
-- evalúe antes del COMMIT: solo aparecen dentro de funciones plpgsql (que se
-- analizan al ejecutarse) y en comparaciones como texto (::text), nunca en
-- un CHECK, un índice, un WHEN ni una función LANGUAGE sql.
--
-- Errores (igual que 040):
--   42501  rol incorrecto ('No autorizado').
--   P0001  el estado no permite la acción; el mensaje es para el usuario.
--   23505  duplicado (clave de envío repetida).
-- ============================================================


-- ============================================================
-- BLOQUE 0 — Diagnóstico (solo lectura)
-- Ofertas que no son borrador y no tienen ningún requisito no vacío. Si hay,
-- el CHECK del BLOQUE 3 se crea NOT VALID (ver ahí).
-- ============================================================

DO $$
DECLARE
  v_cantidad int;
BEGIN
  SELECT pg_catalog.count(*)::int INTO v_cantidad
  FROM public.ofertas o
  WHERE o.estado <> 'borrador'
    AND NOT EXISTS (
      SELECT 1
      FROM pg_catalog.unnest(o.requisitos) AS r(texto)
      WHERE pg_catalog.btrim(r.texto) <> ''
    );

  IF v_cantidad > 0 THEN
    RAISE NOTICE
      '% oferta(s) no borrador sin ningún requisito. Consulta: '
      'SELECT id, estado, titulo FROM public.ofertas o WHERE o.estado <> ''borrador'' '
      'AND NOT EXISTS (SELECT 1 FROM unnest(o.requisitos) r WHERE btrim(r) <> '''');',
      v_cantidad;
  END IF;
END;
$$;


-- ============================================================
-- BLOQUE 1 — Estado 'oferta_retirada'
--
--   estado_postulacion  postulación sin derivación ('recibida' o
--                       'en_revision') cerrada porque la empresa retiró la
--                       oferta.
--   estado_empresa      derivación abierta ('pendiente' o 'en_proceso')
--                       cerrada por el mismo motivo. La postulación sigue en
--                       'derivada', como con 'contratado' y 'rechazado'.
--
-- Es un estado propio y no 'rechazado' / 'rechazada_municipalidad' para que no
-- cuente en la regla de 3 rechazos en 90 días (estado_cursos_calculo, 046) ni
-- como "no seleccionado" en los indicadores (047, 049) ni en
-- postulaciones_no_seleccionadas (038): todas filtran por los estados de
-- rechazo. Solo lo escribe retirar_oferta() (BLOQUE 10).
-- ============================================================

ALTER TYPE public.estado_postulacion ADD VALUE IF NOT EXISTS 'oferta_retirada';
ALTER TYPE public.estado_empresa     ADD VALUE IF NOT EXISTS 'oferta_retirada';


-- ============================================================
-- BLOQUE 2 — Borrado lógico
--
-- eliminada_en: cuándo la empresa eliminó la oferta (NULL = no eliminada).
-- La oferta conserva su estado; restaurarla solo vuelve a poner NULL.
-- No está en ningún grant: solo la escriben eliminar_oferta() y
-- restaurar_oferta() (BLOQUE 11).
--
-- CHECK: solo puede estar eliminada una oferta que nunca se publicó
-- (borrador, rechazada o pendiente de revisión, que es lo que permite
-- eliminar_oferta). Así una oferta eliminada nunca es 'activa' ni 'cerrada' y
-- las funciones que solo leen ofertas activas no necesitan filtrarla. Todas
-- las filas existentes tienen eliminada_en NULL: el CHECK se valida sin
-- problemas.
-- ============================================================

ALTER TABLE public.ofertas
  ADD COLUMN IF NOT EXISTS eliminada_en timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    WHERE c.conname  = 'ofertas_eliminada_sin_publicar_check'
      AND c.conrelid = 'public.ofertas'::regclass
  ) THEN
    ALTER TABLE public.ofertas
      ADD CONSTRAINT ofertas_eliminada_sin_publicar_check
      CHECK (eliminada_en IS NULL OR estado IN ('borrador', 'pendiente_aprobacion', 'rechazada'));
  END IF;
END;
$$;

-- Lo que recorre la purga diaria.
CREATE INDEX IF NOT EXISTS ofertas_eliminada_en_idx
  ON public.ofertas (eliminada_en)
  WHERE eliminada_en IS NOT NULL;

-- Días que una oferta eliminada se puede restaurar antes de la purga. Único
-- lugar del valor en la base; la aplicación lo repite en
-- DIAS_RESTAURACION_OFERTA (src/lib/oferta-estados.ts).
CREATE OR REPLACE FUNCTION public.ofertas_dias_restauracion()
RETURNS int
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT 30;
$$;

REVOKE EXECUTE ON FUNCTION public.ofertas_dias_restauracion() FROM public, anon, authenticated;


-- ============================================================
-- BLOQUE 3 — Requisito mínimo en la base
--
-- requisitos es text[] NOT NULL DEFAULT '{}' (007). Una oferta que no es
-- borrador tiene que tener al menos un elemento con texto (no vacío ni solo
-- espacios), el mismo criterio del trigger de 032 y del formulario.
--
-- Si el BLOQUE 0 encontró filas que no cumplen, el CHECK se crea NOT VALID:
-- no revisa esas filas viejas, pero sí cualquier fila nueva y cualquier
-- UPDATE (Postgres evalúa el CHECK en cada UPDATE de la fila, aunque solo
-- cambie el estado). Mientras esas ofertas no tengan un requisito, no se van
-- a poder cerrar, retirar, aprobar ni renovar. Para corregirlas: agregarles
-- un requisito (UPDATE public.ofertas SET requisitos = ARRAY['...'] WHERE
-- id = '...') y después
--   ALTER TABLE public.ofertas VALIDATE CONSTRAINT ofertas_requisito_minimo_check;
-- La migración deja un NOTICE con la cantidad.
-- ============================================================

CREATE OR REPLACE FUNCTION public.oferta_tiene_requisito(p_requisitos text[])
RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.unnest(p_requisitos) AS r(texto)
    WHERE pg_catalog.btrim(r.texto) <> ''
  );
$$;

DO $$
DECLARE
  v_cantidad int;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    WHERE c.conname  = 'ofertas_requisito_minimo_check'
      AND c.conrelid = 'public.ofertas'::regclass
  ) THEN
    RETURN;
  END IF;

  SELECT pg_catalog.count(*)::int INTO v_cantidad
  FROM public.ofertas o
  WHERE o.estado <> 'borrador'
    AND NOT public.oferta_tiene_requisito(o.requisitos);

  IF v_cantidad = 0 THEN
    ALTER TABLE public.ofertas
      ADD CONSTRAINT ofertas_requisito_minimo_check
      CHECK (estado = 'borrador' OR public.oferta_tiene_requisito(requisitos));
  ELSE
    ALTER TABLE public.ofertas
      ADD CONSTRAINT ofertas_requisito_minimo_check
      CHECK (estado = 'borrador' OR public.oferta_tiene_requisito(requisitos))
      NOT VALID;
    RAISE NOTICE
      'ofertas_requisito_minimo_check se creó NOT VALID: % oferta(s) existentes no tienen requisitos '
      '(consulta en el BLOQUE 0). No se modificó ninguna; cualquier UPDATE de esas filas va a fallar '
      'hasta que tengan un requisito. Después de corregirlas: '
      'ALTER TABLE public.ofertas VALIDATE CONSTRAINT ofertas_requisito_minimo_check;',
      v_cantidad;
  END IF;
END;
$$;


-- ============================================================
-- BLOQUE 4 — Trigger de requisito mínimo (032) sin borradores
-- Mismo cuerpo que 032; único cambio: un borrador se guarda aunque no tenga
-- requisitos. Al enviarlo a revisión lo controlan el BLOQUE 5 y el CHECK del
-- BLOQUE 3. El trigger validar_requisito_minimo_ofertas no cambia.
-- ============================================================

CREATE OR REPLACE FUNCTION public.ofertas_requisito_minimo_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_requisitos_limpios text[];
BEGIN
  IF NEW.estado = 'borrador' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NOT (
    NEW.titulo            IS DISTINCT FROM OLD.titulo
    OR NEW.descripcion    IS DISTINCT FROM OLD.descripcion
    OR NEW.requisitos     IS DISTINCT FROM OLD.requisitos
    OR NEW.beneficios     IS DISTINCT FROM OLD.beneficios
    OR NEW.modalidad      IS DISTINCT FROM OLD.modalidad
    OR NEW.jornada        IS DISTINCT FROM OLD.jornada
    OR NEW.ubicacion      IS DISTINCT FROM OLD.ubicacion
    OR NEW.empresa_nombre IS DISTINCT FROM OLD.empresa_nombre
  ) THEN
    RETURN NEW;
  END IF;

  SELECT ARRAY(
    SELECT trim(r)
    FROM unnest(NEW.requisitos) AS r
    WHERE trim(r) <> ''
  ) INTO v_requisitos_limpios;

  IF array_length(v_requisitos_limpios, 1) IS NULL
     OR array_length(v_requisitos_limpios, 1) < 1
  THEN
    RAISE EXCEPTION 'La oferta tiene que tener al menos un requisito.';
  END IF;

  RETURN NEW;
END;
$$;


-- ============================================================
-- BLOQUE 5 — Reglas de borradores y ofertas eliminadas
--
-- oferta_campos_faltantes(): los obligatorios de una oferta, los mismos que
-- exigen el formulario y crear_oferta_empresa (040): título, descripción,
-- entre 1 y 5 categorías, modalidad, jornada, duración válida, al menos un
-- requisito y la cantidad de vacantes. Devuelve los nombres de los que
-- faltan (vacío = completa). Las categorías y las vacantes viven en otras
-- tablas: se leen por id, así que hay que escribirlas antes de cambiar el
-- estado (lo hacen guardar_borrador_oferta y enviar_borrador_oferta).
--
-- Trigger BEFORE UPDATE ofertas_reglas_borrador_y_eliminacion. Por el orden
-- alfabético corre después de ofertas_marcar_contenido_editado (022) y antes
-- de prevent_empresa_* (024/027), validar_requisito_minimo_ofertas (032) y
-- vencimiento_ofertas (036).
--   Oferta eliminada  con cualquier rol, no se modifica mientras siga
--                     eliminada (solo se restaura). Sin rol (SQL Editor) se
--                     permite, para correcciones manuales.
--   Borrador          contenido_editado_en queda NULL: las ediciones de un
--                     borrador no son "ediciones" para la oficina.
--   Borrador → otro   solo a 'pendiente_aprobacion' (sin rol, a cualquiera)
--                     y siempre que no falte ningún obligatorio, también
--                     desde el SQL Editor. created_at pasa a ser el momento
--                     del envío: la oferta "se crea" para la oficina y el
--                     portal cuando se envía.
--   Otro → borrador   no: una oferta enviada no vuelve a borrador (salvo sin
--                     rol).
-- La empresa puede escribir estado por el grant de 021 y la política de
-- UPDATE (que acepta 'pendiente_aprobacion'): este trigger es lo que impide
-- mandar a revisión un borrador incompleto con un UPDATE directo.
-- ============================================================

CREATE OR REPLACE FUNCTION public.oferta_campos_faltantes(
  p_oferta_id     uuid,
  p_titulo        text,
  p_descripcion   text,
  p_modalidad     public.modalidad_oferta,
  p_jornada       public.jornada_oferta,
  p_requisitos    text[],
  p_duracion_dias int
)
RETURNS text[]
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
DECLARE
  v_faltantes  text[] := ARRAY[]::text[];
  v_categorias int;
  v_vacantes   int;
BEGIN
  IF pg_catalog.btrim(COALESCE(p_titulo, '')) = '' THEN
    v_faltantes := v_faltantes || 'título'::text;
  END IF;

  IF pg_catalog.btrim(COALESCE(p_descripcion, '')) = '' THEN
    v_faltantes := v_faltantes || 'descripción'::text;
  END IF;

  SELECT pg_catalog.count(*)::int INTO v_categorias
  FROM public.oferta_categorias oc
  WHERE oc.oferta_id = p_oferta_id;

  IF v_categorias NOT BETWEEN 1 AND 5 THEN
    v_faltantes := v_faltantes || 'categorías (entre 1 y 5)'::text;
  END IF;

  IF p_modalidad IS NULL THEN
    v_faltantes := v_faltantes || 'modalidad'::text;
  END IF;

  IF p_jornada IS NULL THEN
    v_faltantes := v_faltantes || 'jornada'::text;
  END IF;

  IF p_duracion_dias IS NULL OR p_duracion_dias NOT IN (15, 30, 45, 60) THEN
    v_faltantes := v_faltantes || 'duración'::text;
  END IF;

  IF NOT public.oferta_tiene_requisito(COALESCE(p_requisitos, ARRAY[]::text[])) THEN
    v_faltantes := v_faltantes || 'requisitos'::text;
  END IF;

  SELECT ov.cantidad INTO v_vacantes
  FROM public.oferta_vacantes ov
  WHERE ov.oferta_id = p_oferta_id;

  IF v_vacantes IS NULL OR v_vacantes < 1 THEN
    v_faltantes := v_faltantes || 'cantidad de vacantes'::text;
  END IF;

  RETURN v_faltantes;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.oferta_campos_faltantes(
  uuid, text, text, public.modalidad_oferta, public.jornada_oferta, text[], int
) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ofertas_reglas_borrador_y_eliminacion_fn()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_rol       text := public.rol_actual()::text;
  v_faltantes text[];
BEGIN
  IF OLD.eliminada_en IS NOT NULL
     AND NEW.eliminada_en IS NOT NULL
     AND v_rol IS NOT NULL THEN
    RAISE EXCEPTION 'La oferta está eliminada. Restaurala para poder modificarla.';
  END IF;

  IF OLD.estado = 'borrador' THEN
    NEW.contenido_editado_en := NULL;

    IF NEW.estado IS DISTINCT FROM 'borrador' THEN
      IF v_rol IS NOT NULL AND NEW.estado IS DISTINCT FROM 'pendiente_aprobacion' THEN
        RAISE EXCEPTION 'Un borrador solo se puede enviar a revisión.';
      END IF;

      v_faltantes := public.oferta_campos_faltantes(
        NEW.id, NEW.titulo, NEW.descripcion, NEW.modalidad, NEW.jornada,
        NEW.requisitos, NEW.duracion_dias
      );

      IF pg_catalog.cardinality(v_faltantes) > 0 THEN
        RAISE EXCEPTION 'Completá los datos obligatorios antes de enviar la oferta a revisión. Falta: %.',
          pg_catalog.array_to_string(v_faltantes, ', ')
          USING ERRCODE = 'P0001';
      END IF;

      NEW.created_at := now();
    END IF;
  ELSIF NEW.estado = 'borrador' AND v_rol IS NOT NULL THEN
    RAISE EXCEPTION 'Una oferta enviada a revisión no puede volver a borrador.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ofertas_reglas_borrador_y_eliminacion_fn()
  FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS ofertas_reglas_borrador_y_eliminacion ON public.ofertas;
CREATE TRIGGER ofertas_reglas_borrador_y_eliminacion
  BEFORE UPDATE ON public.ofertas
  FOR EACH ROW EXECUTE FUNCTION public.ofertas_reglas_borrador_y_eliminacion_fn();


-- ============================================================
-- BLOQUE 6 — Políticas RLS de ofertas
--
--   Público      solo activas y no eliminadas (antes: activas).
--   Oficina      lectura, UPDATE y DELETE: sin borradores ni eliminadas
--                (antes: todas). Los listados, el detalle, los contadores de
--                /admin/ofertas y el inicio de la oficina leen ofertas con la
--                sesión, así que dejan de verlos sin cambiar las consultas.
--   Postulante   sus ofertas, no eliminadas (un borrador no recibe
--                postulaciones).
--   Empresa      sigue viendo todas las suyas (también borradores y
--                eliminadas, para la pestaña "Eliminadas"). El UPDATE directo
--                ya no alcanza a las eliminadas y ya no puede dejar la oferta
--                'cerrada': cerrar es retirar_oferta() (BLOQUE 10), que
--                además cierra los procesos abiertos. El cierre automático al
--                cubrir las vacantes (029) es SECURITY DEFINER y no pasa por
--                esta política.
--   DELETE de la empresa: se quita. "Eliminar" es eliminar_oferta()
--                (borrado lógico) y el borrado definitivo lo hace la purga.
--
-- Sin cambios: "ofertas: lectura empresa propia" y los INSERT (021).
-- oferta_categorias y oferta_vacantes no cambian: sus filas solo tienen el
-- id de la oferta y la categoría o la cantidad, sin el contenido.
-- ============================================================

DROP POLICY IF EXISTS "ofertas: lectura pública (activas)" ON public.ofertas;
CREATE POLICY "ofertas: lectura pública (activas)"
  ON public.ofertas FOR SELECT
  USING (estado = 'activa' AND eliminada_en IS NULL);

DROP POLICY IF EXISTS "ofertas: lectura municipalidad (todas)" ON public.ofertas;
CREATE POLICY "ofertas: lectura municipalidad (todas)"
  ON public.ofertas FOR SELECT
  USING (
    public.rol_actual() = 'municipalidad'
    AND estado <> 'borrador'
    AND eliminada_en IS NULL
  );

DROP POLICY IF EXISTS "ofertas: lectura postulante (postulación propia)" ON public.ofertas;
CREATE POLICY "ofertas: lectura postulante (postulación propia)"
  ON public.ofertas FOR SELECT
  TO authenticated
  USING (
    public.rol_actual() = 'postulante'
    AND eliminada_en IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.postulaciones p
      JOIN public.postulantes ps ON ps.id = p.postulante_id
      WHERE p.oferta_id = public.ofertas.id
        AND ps.usuario_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ofertas: actualizar (municipalidad)" ON public.ofertas;
CREATE POLICY "ofertas: actualizar (municipalidad)"
  ON public.ofertas FOR UPDATE
  USING (
    public.rol_actual() = 'municipalidad'
    AND estado <> 'borrador'
    AND eliminada_en IS NULL
  )
  WITH CHECK (
    public.rol_actual() = 'municipalidad'
    AND estado <> 'borrador'
    AND eliminada_en IS NULL
  );

DROP POLICY IF EXISTS "ofertas: eliminar (municipalidad)" ON public.ofertas;
CREATE POLICY "ofertas: eliminar (municipalidad)"
  ON public.ofertas FOR DELETE
  USING (
    public.rol_actual() = 'municipalidad'
    AND estado <> 'borrador'
    AND eliminada_en IS NULL
  );

DROP POLICY IF EXISTS "ofertas: actualizar (empresa propia)" ON public.ofertas;
CREATE POLICY "ofertas: actualizar (empresa propia)"
  ON public.ofertas FOR UPDATE
  USING (
    public.rol_actual() = 'empresa'
    AND empresa_id = (SELECT id FROM public.empresas WHERE usuario_id = auth.uid())
    AND estado <> 'cerrada'
    AND eliminada_en IS NULL
  )
  WITH CHECK (
    public.rol_actual() = 'empresa'
    AND empresa_id = (SELECT id FROM public.empresas WHERE usuario_id = auth.uid())
    AND estado = 'pendiente_aprobacion'
  );

DROP POLICY IF EXISTS "ofertas: eliminar (empresa propia, pendiente o rechazada, sin postulaciones)" ON public.ofertas;

-- prevent_empresa_editar_pendiente_fn (024), misma firma: eliminar y
-- restaurar una oferta pendiente es un UPDATE que la deja 'pendiente_aprobacion'
-- y el trigger lo rechazaba como si fuera una edición. Ahora deja pasar el
-- UPDATE que cambia eliminada_en (solo lo hacen eliminar_oferta y
-- restaurar_oferta, que no tocan el contenido). Lo demás no cambia.
CREATE OR REPLACE FUNCTION public.prevent_empresa_editar_pendiente_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF public.rol_actual()::text = 'empresa'
    AND old.estado = 'pendiente_aprobacion'
    AND new.estado = 'pendiente_aprobacion'
    AND new.eliminada_en IS NOT DISTINCT FROM old.eliminada_en
  THEN
    RAISE EXCEPTION 'No podés editar una oferta que está pendiente de revisión.';
  END IF;
  RETURN new;
END;
$$;


-- ============================================================
-- BLOQUE 7 — Borradores
--
-- guardar_borrador_oferta(p_oferta_id, ..., p_clave_envio, p_enviar)
--   p_oferta_id NULL  crea un borrador nuevo (con la clave de envío del
--                     formulario, igual que crear_oferta_empresa: un doble
--                     envío da 23505).
--   p_oferta_id       actualiza un borrador propio, no eliminado.
--   Solo exige el título. Las categorías se validan si vienen (hasta 5 y
--   existentes); las vacantes pueden faltar (sin fila en oferta_vacantes).
--   p_enviar = true   después de guardar lo pasa a 'pendiente_aprobacion' en
--                     la misma transacción: si falta un obligatorio, el
--                     trigger del BLOQUE 5 lo rechaza y no se guarda nada.
--
-- enviar_borrador_oferta(p_oferta_id): manda a revisión un borrador ya
-- guardado (botón "Enviar a revisión" de Mis ofertas). La validación es la
-- del trigger del BLOQUE 5.
--
-- Las mismas condiciones de rol y empresa aprobada que crear_oferta_empresa.
-- empresa_id y empresa_nombre salen de la base.
-- ============================================================

CREATE OR REPLACE FUNCTION public.guardar_borrador_oferta(
  p_oferta_id         uuid,
  p_titulo            text,
  p_descripcion       text,
  p_ubicacion         text,
  p_modalidad         public.modalidad_oferta,
  p_jornada           public.jornada_oferta,
  p_requisitos        text[],
  p_beneficios        text[],
  p_duracion_dias     int,
  p_categoria_ids     uuid[],
  p_cantidad_vacantes int,
  p_clave_envio       uuid,
  p_enviar            boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_empresa_id   uuid;
  v_razon_social text;
  v_oferta_id    uuid;
  v_estado       public.estado_oferta;
  v_eliminada    timestamptz;
  v_categorias   uuid[];
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'empresa' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT e.id, e.razon_social
  INTO   v_empresa_id, v_razon_social
  FROM   public.empresas e
  WHERE  e.usuario_id = auth.uid()
    AND  e.estado_aprobacion = 'aprobada';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tu empresa no está aprobada para publicar ofertas.' USING ERRCODE = '42501';
  END IF;

  IF pg_catalog.btrim(COALESCE(p_titulo, '')) = '' THEN
    RAISE EXCEPTION 'Para guardar el borrador escribí al menos el título.';
  END IF;

  IF p_cantidad_vacantes IS NOT NULL AND p_cantidad_vacantes < 1 THEN
    RAISE EXCEPTION 'La cantidad de vacantes debe ser un número entero mayor o igual a 1.';
  END IF;

  v_categorias := ARRAY(
    SELECT DISTINCT c.id
    FROM pg_catalog.unnest(COALESCE(p_categoria_ids, ARRAY[]::uuid[])) AS c(id)
    WHERE c.id IS NOT NULL
  );

  IF pg_catalog.cardinality(v_categorias) > 5 THEN
    RAISE EXCEPTION 'Seleccioná entre 1 y 5 categorías.';
  END IF;

  IF (
    SELECT pg_catalog.count(*)
    FROM public.categorias ca
    WHERE ca.id = ANY (v_categorias)
  ) <> pg_catalog.cardinality(v_categorias) THEN
    RAISE EXCEPTION 'Una o más categorías no son válidas.';
  END IF;

  IF p_oferta_id IS NULL THEN
    IF p_clave_envio IS NULL THEN
      RAISE EXCEPTION 'Falta la clave de envío de la oferta.';
    END IF;

    INSERT INTO public.ofertas (
      titulo, descripcion, ubicacion, modalidad, jornada, requisitos, beneficios,
      empresa_id, empresa_nombre, estado, duracion_dias, clave_envio
    )
    VALUES (
      p_titulo, COALESCE(p_descripcion, ''), COALESCE(p_ubicacion, ''),
      COALESCE(p_modalidad, 'Presencial'), COALESCE(p_jornada, 'Tiempo completo'),
      COALESCE(p_requisitos, ARRAY[]::text[]), COALESCE(p_beneficios, ARRAY[]::text[]),
      v_empresa_id, v_razon_social, 'borrador', COALESCE(p_duracion_dias, 30), p_clave_envio
    )
    RETURNING id INTO v_oferta_id;
  ELSE
    SELECT o.id, o.estado, o.eliminada_en
    INTO   v_oferta_id, v_estado, v_eliminada
    FROM   public.ofertas o
    WHERE  o.id = p_oferta_id
      AND  o.empresa_id = v_empresa_id
    FOR UPDATE;

    IF NOT FOUND OR v_eliminada IS NOT NULL THEN
      RAISE EXCEPTION 'No se encontró la oferta o no tenés permiso para editarla.';
    END IF;

    IF v_estado IS DISTINCT FROM 'borrador' THEN
      RAISE EXCEPTION 'Esta oferta ya no es un borrador. Recargá la página.';
    END IF;

    UPDATE public.ofertas o
    SET    titulo        = p_titulo,
           descripcion   = COALESCE(p_descripcion, ''),
           ubicacion     = COALESCE(p_ubicacion, o.ubicacion),
           modalidad     = COALESCE(p_modalidad, o.modalidad),
           jornada       = COALESCE(p_jornada, o.jornada),
           requisitos    = COALESCE(p_requisitos, ARRAY[]::text[]),
           beneficios    = COALESCE(p_beneficios, ARRAY[]::text[]),
           duracion_dias = COALESCE(p_duracion_dias, o.duracion_dias),
           updated_at    = now()
    WHERE  o.id = v_oferta_id;

    DELETE FROM public.oferta_categorias oc
    WHERE oc.oferta_id = v_oferta_id;
  END IF;

  INSERT INTO public.oferta_categorias (oferta_id, categoria_id)
  SELECT v_oferta_id, c.id
  FROM pg_catalog.unnest(v_categorias) AS c(id);

  IF p_cantidad_vacantes IS NULL THEN
    DELETE FROM public.oferta_vacantes ov
    WHERE ov.oferta_id = v_oferta_id;
  ELSE
    INSERT INTO public.oferta_vacantes (oferta_id, cantidad)
    VALUES (v_oferta_id, p_cantidad_vacantes)
    ON CONFLICT (oferta_id) DO UPDATE
      SET cantidad   = EXCLUDED.cantidad,
          updated_at = now();
  END IF;

  IF p_enviar THEN
    UPDATE public.ofertas o
    SET    estado     = 'pendiente_aprobacion',
           updated_at = now()
    WHERE  o.id = v_oferta_id;
  END IF;

  RETURN v_oferta_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guardar_borrador_oferta(
  uuid, text, text, text, public.modalidad_oferta, public.jornada_oferta,
  text[], text[], int, uuid[], int, uuid, boolean
) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.guardar_borrador_oferta(
  uuid, text, text, text, public.modalidad_oferta, public.jornada_oferta,
  text[], text[], int, uuid[], int, uuid, boolean
) TO authenticated;

CREATE OR REPLACE FUNCTION public.enviar_borrador_oferta(p_oferta_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_estado    public.estado_oferta;
  v_eliminada timestamptz;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'empresa' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.empresas e
    WHERE e.usuario_id = auth.uid()
      AND e.estado_aprobacion = 'aprobada'
  ) THEN
    RAISE EXCEPTION 'Tu empresa no está aprobada para publicar ofertas.' USING ERRCODE = '42501';
  END IF;

  SELECT o.estado, o.eliminada_en
  INTO   v_estado, v_eliminada
  FROM   public.ofertas o
  JOIN   public.empresas e ON e.id = o.empresa_id
  WHERE  o.id = p_oferta_id
    AND  e.usuario_id = auth.uid()
  FOR UPDATE OF o;

  IF NOT FOUND OR v_eliminada IS NOT NULL THEN
    RAISE EXCEPTION 'No se encontró la oferta o no tenés permiso para enviarla.';
  END IF;

  IF v_estado IS DISTINCT FROM 'borrador' THEN
    RAISE EXCEPTION 'Esta oferta ya fue enviada a revisión.';
  END IF;

  UPDATE public.ofertas o
  SET    estado     = 'pendiente_aprobacion',
         updated_at = now()
  WHERE  o.id = p_oferta_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enviar_borrador_oferta(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.enviar_borrador_oferta(uuid) TO authenticated;


-- ============================================================
-- BLOQUE 8 — editar_oferta_empresa (040), misma firma
-- Copia de 040 con dos controles nuevos, antes de tocar nada:
--   - una oferta eliminada no se encuentra (la función es SECURITY DEFINER
--     y no pasa por la política de UPDATE);
--   - un borrador se edita con guardar_borrador_oferta: con esta función el
--     trigger de 027 no lo manda a revisión y el error sería engañoso.
-- ============================================================

CREATE OR REPLACE FUNCTION public.editar_oferta_empresa(
  p_oferta_id         uuid,
  p_titulo            text,
  p_descripcion       text,
  p_ubicacion         text,
  p_modalidad         public.modalidad_oferta,
  p_jornada           public.jornada_oferta,
  p_requisitos        text[],
  p_beneficios        text[],
  p_duracion_dias     int,
  p_categoria_ids     uuid[],
  p_cantidad_vacantes int
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_estado       public.estado_oferta;
  v_eliminada    timestamptz;
  v_estado_nuevo public.estado_oferta;
  v_categorias   uuid[];
  v_contratados  int;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'empresa' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.empresas e
    WHERE e.usuario_id = auth.uid()
      AND e.estado_aprobacion = 'aprobada'
  ) THEN
    RAISE EXCEPTION 'Tu empresa no está aprobada para publicar ofertas.' USING ERRCODE = '42501';
  END IF;

  SELECT o.estado, o.eliminada_en
  INTO   v_estado, v_eliminada
  FROM   public.ofertas o
  JOIN   public.empresas e ON e.id = o.empresa_id
  WHERE  o.id = p_oferta_id
    AND  e.usuario_id = auth.uid()
  FOR UPDATE OF o;

  IF NOT FOUND OR v_eliminada IS NOT NULL THEN
    RAISE EXCEPTION 'No se encontró la oferta o no tenés permiso para editarla.';
  END IF;

  IF v_estado = 'cerrada' THEN
    RAISE EXCEPTION 'No podés editar una oferta cerrada.';
  END IF;

  IF v_estado = 'borrador' THEN
    RAISE EXCEPTION 'Esta oferta es un borrador: guardala como borrador o enviala a revisión.';
  END IF;

  IF p_cantidad_vacantes IS NULL OR p_cantidad_vacantes < 1 THEN
    RAISE EXCEPTION 'La cantidad de vacantes debe ser un número entero mayor o igual a 1.';
  END IF;

  v_contratados := public.contratados_en_oferta(p_oferta_id);
  IF p_cantidad_vacantes < v_contratados THEN
    RAISE EXCEPTION 'Ya tenés % %. La cantidad de vacantes debe ser al menos %.',
      v_contratados,
      CASE WHEN v_contratados = 1 THEN 'candidato seleccionado' ELSE 'candidatos seleccionados' END,
      v_contratados;
  END IF;

  v_categorias := public.categorias_validas_de_oferta(p_categoria_ids);

  -- Cambiar la duración no mueve vence_en: se usa al publicar o renovar (036).
  UPDATE public.ofertas o
  SET    titulo        = p_titulo,
         descripcion   = p_descripcion,
         ubicacion     = p_ubicacion,
         modalidad     = p_modalidad,
         jornada       = p_jornada,
         requisitos    = COALESCE(p_requisitos, ARRAY[]::text[]),
         beneficios    = COALESCE(p_beneficios, ARRAY[]::text[]),
         duracion_dias = p_duracion_dias,
         updated_at    = now()
  WHERE  o.id = p_oferta_id
  RETURNING o.estado INTO v_estado_nuevo;

  IF v_estado_nuevo IS DISTINCT FROM 'pendiente_aprobacion' THEN
    RAISE EXCEPTION 'No hay cambios en el título, la descripción, los requisitos, los beneficios, la modalidad ni la jornada. Modificá alguno para enviar la oferta de nuevo a revisión.';
  END IF;

  DELETE FROM public.oferta_categorias oc
  WHERE oc.oferta_id = p_oferta_id;

  INSERT INTO public.oferta_categorias (oferta_id, categoria_id)
  SELECT p_oferta_id, c.id
  FROM pg_catalog.unnest(v_categorias) AS c(id);

  INSERT INTO public.oferta_vacantes (oferta_id, cantidad)
  VALUES (p_oferta_id, p_cantidad_vacantes)
  ON CONFLICT (oferta_id) DO UPDATE
    SET cantidad   = EXCLUDED.cantidad,
        updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.editar_oferta_empresa(
  uuid, text, text, text, public.modalidad_oferta, public.jornada_oferta,
  text[], text[], int, uuid[], int
) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.editar_oferta_empresa(
  uuid, text, text, text, public.modalidad_oferta, public.jornada_oferta,
  text[], text[], int, uuid[], int
) TO authenticated;


-- ============================================================
-- BLOQUE 9 — Avisos
--
-- 9a. CHECK de tipos: el vigente de 044 más
--       Oficina     'oferta_retirada'      la empresa retiró una oferta.
--       Postulante  'postulacion_cerrada'  su postulación quedó cerrada
--                                          porque la empresa retiró la oferta.
--     Todas las filas existentes usan tipos de 044.
-- 9b. email_tipo_con_envio (048): suma 'postulacion_cerrada'. El aviso a la
--     oficina queda solo en el portal.
-- 9c. ofertas_notificar_revision_fn (043): al pasar de 'borrador' a
--     'pendiente_aprobacion' avisa "Nueva oferta para revisar" con la misma
--     clave que el alta directa (oferta_nueva:<id>, 041). Guardar un
--     borrador no avisa: el trigger de alta (041) solo dispara con
--     'pendiente_aprobacion' y el de revisión solo cuando cambia el estado.
--     El resto es copia de 043.
-- ============================================================

ALTER TABLE public.notificaciones DROP CONSTRAINT IF EXISTS notificaciones_tipo_check;
ALTER TABLE public.notificaciones
  ADD CONSTRAINT notificaciones_tipo_check
  CHECK (tipo IN (
    -- Oficina
    'contratacion',
    'empresa_pendiente',
    'oferta_pendiente',
    'curso_completado',
    'postulacion_nueva',
    'necesita_curso',
    'oferta_retirada',
    -- Postulante
    'postulacion_derivada',
    'entrevista',
    'seleccionado',
    'no_seleccionado_empresa',
    'no_seleccionado_oficina',
    'curso_asignado',
    'pre_entrevista_coordinada',
    'pre_entrevista_reprogramada',
    'postulacion_cerrada',
    -- Empresa
    'solicitud_aprobada',
    'solicitud_rechazada',
    'oferta_aprobada',
    'oferta_rechazada',
    'candidato_derivado',
    'oferta_por_vencer',
    'oferta_vencida'
  ));

CREATE OR REPLACE FUNCTION public.email_tipo_con_envio(p_tipo text)
RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT p_tipo IN (
    -- Postulante
    'postulacion_derivada',
    'entrevista',
    'seleccionado',
    'no_seleccionado_empresa',
    'no_seleccionado_oficina',
    'curso_asignado',
    'pre_entrevista_coordinada',
    'pre_entrevista_reprogramada',
    'postulacion_cerrada',
    -- Empresa
    'solicitud_aprobada',
    'solicitud_rechazada',
    'oferta_aprobada',
    'oferta_rechazada',
    'candidato_derivado',
    'oferta_por_vencer',
    'oferta_vencida',
    -- Oficina
    'empresa_pendiente',
    'oferta_pendiente',
    'contratacion'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.email_tipo_con_envio(text)
  FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ofertas_notificar_revision_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_empresa_usuario uuid;
  v_motivo          text;
  v_marca           text;
BEGIN
  BEGIN
    IF NEW.estado = 'pendiente_aprobacion' AND OLD.estado = 'borrador' THEN
      PERFORM public.notificar_oficina(
        'oferta_pendiente',
        'Nueva oferta para revisar',
        COALESCE(NULLIF(pg_catalog.btrim(NEW.empresa_nombre), ''), 'Una empresa')
          || ' envió la oferta «' || NEW.titulo || '» para revisión.',
        '/admin/ofertas/' || NEW.id::text,
        'oferta_nueva:' || NEW.id::text
      );
      RETURN NULL;
    END IF;

    IF NEW.estado = 'pendiente_aprobacion' THEN
      PERFORM public.notificar_oficina(
        'oferta_pendiente',
        'Oferta editada para revisar',
        COALESCE(NULLIF(pg_catalog.btrim(NEW.empresa_nombre), ''), 'Una empresa')
          || ' editó la oferta «' || NEW.titulo || '» y quedó pendiente de revisión.',
        '/admin/ofertas/' || NEW.id::text,
        'oferta_editada:' || NEW.id::text
          || ':' || public.notificaciones_marca(COALESCE(NEW.updated_at, now()))
      );
      RETURN NULL;
    END IF;

    IF OLD.estado IS DISTINCT FROM 'pendiente_aprobacion'
       OR NEW.estado NOT IN ('activa', 'rechazada')
       OR NEW.empresa_id IS NULL THEN
      RETURN NULL;
    END IF;

    SELECT e.usuario_id
    INTO v_empresa_usuario
    FROM public.empresas e
    WHERE e.id = NEW.empresa_id;

    v_marca := public.notificaciones_marca(COALESCE(NEW.revisado_en, now()));

    IF NEW.estado = 'activa' THEN
      PERFORM public.notificar_usuario(
        v_empresa_usuario,
        'oferta_aprobada',
        'Oferta aprobada',
        'La Oficina de Empleo aprobó tu oferta «' || NEW.titulo || '». Ya está publicada en el portal'
          || COALESCE(' hasta el ' || public.notificaciones_fecha(NEW.vence_en), '') || '.',
        '/empresa/ofertas/' || NEW.id::text,
        'oferta_aprobada:' || NEW.id::text || ':' || v_marca
      );
    ELSE
      v_motivo := NULLIF(pg_catalog.btrim(NEW.motivo_rechazo), '');
      PERFORM public.notificar_usuario(
        v_empresa_usuario,
        'oferta_rechazada',
        'Oferta rechazada',
        'La Oficina de Empleo rechazó tu oferta «' || NEW.titulo || '».'
          || COALESCE(' Motivo: ' || v_motivo, '')
          || ' Podés corregirla y enviarla de nuevo.',
        '/empresa/ofertas/' || NEW.id::text || '/editar',
        'oferta_rechazada:' || NEW.id::text || ':' || v_marca
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ofertas_notificar_revision_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;


-- ============================================================
-- BLOQUE 10 — Retirar la oferta
--
-- 10a. procesos_abiertos_de_oferta(): qué se cierra al retirar. Una
--      postulación está abierta si no la descartó la oficina ni ya se cerró
--      ('recibida', 'en_revision' o 'derivada') y su derivación no existe o
--      sigue abierta ('pendiente' o 'en_proceso'). Las que terminaron en
--      'contratado', 'rechazado' o 'rechazada_municipalidad' no se tocan.
--      Uso interno: la usan 10b y 10e.
-- 10b. procesos_abiertos_ofertas_empresa(): para el diálogo de confirmación,
--      cuántas postulaciones (todavía en la oficina) y cuántos candidatos
--      derivados siguen en proceso en cada oferta propia. Solo cantidades.
-- 10c. Protección del estado nuevo: solo retirar_oferta() pasa una
--      postulación o una derivación a 'oferta_retirada' (marca de
--      transacción ftl.retiro_oferta, que solo fija esa función) y ese
--      estado no cambia después. Sin rol (SQL Editor) se permite, para
--      correcciones manuales.
--        derivaciones   derivaciones_empresa_update_fn (029), misma firma.
--        postulaciones  trigger nuevo postulaciones_proteger_oferta_retirada.
-- 10d. Aviso al postulante 'postulacion_cerrada' (clave
--      postulacion_cerrada:<postulacion_id>, una por postulación):
--        sin derivación  trigger nuevo postulaciones_notificar_oferta_retirada.
--        con derivación  derivaciones_notificar_postulante_fn (041), misma
--                        firma, con una rama nueva.
-- 10e. retirar_oferta(p_oferta_id): oferta propia, no eliminada, pendiente
--      de revisión (con o sin postulaciones) o activa (vigente o vencida).
--      En una transacción: la oferta pasa a 'cerrada', las derivaciones y
--      postulaciones abiertas a 'oferta_retirada' y se avisa a la oficina
--      ('oferta_retirada', clave oferta_retirada:<oferta_id>). Los
--      contratados no cambian. Devuelve cuántos procesos cerró.
--      Cerrar la oferta no dispara avisos de revisión (ofertas_notificar_
--      revision_fn solo avisa al pasar a 'pendiente_aprobacion', 'activa' o
--      'rechazada').
-- ============================================================

CREATE OR REPLACE FUNCTION public.procesos_abiertos_de_oferta(p_oferta_id uuid)
RETURNS TABLE (postulacion_id uuid, derivacion_id uuid)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT po.id, d.id
  FROM public.postulaciones po
  LEFT JOIN public.derivaciones d ON d.postulacion_id = po.id
  WHERE po.oferta_id = p_oferta_id
    AND po.estado IN ('recibida', 'en_revision', 'derivada')
    AND (d.id IS NULL OR d.estado_empresa IN ('pendiente', 'en_proceso'));
$$;

REVOKE EXECUTE ON FUNCTION public.procesos_abiertos_de_oferta(uuid)
  FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.procesos_abiertos_ofertas_empresa(p_oferta_ids uuid[])
RETURNS TABLE (
  oferta_id            uuid,
  postulaciones_oficina integer,
  candidatos_derivados integer
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'empresa' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    (pg_catalog.count(a.postulacion_id) FILTER (WHERE a.derivacion_id IS NULL))::integer,
    (pg_catalog.count(a.derivacion_id))::integer
  FROM public.ofertas o
  JOIN public.empresas e ON e.id = o.empresa_id
  LEFT JOIN LATERAL public.procesos_abiertos_de_oferta(o.id) a ON true
  WHERE o.id = ANY (COALESCE(p_oferta_ids, ARRAY[]::uuid[]))
    AND e.usuario_id = auth.uid()
    AND o.eliminada_en IS NULL
  GROUP BY o.id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.procesos_abiertos_ofertas_empresa(uuid[]) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.procesos_abiertos_ofertas_empresa(uuid[]) TO authenticated;

-- 10c. derivaciones: copia de 029 con la rama de 'oferta_retirada' al principio.
CREATE OR REPLACE FUNCTION public.derivaciones_empresa_update_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_rol     text    := public.rol_actual()::text;
  v_retiro  boolean := pg_catalog.current_setting('ftl.retiro_oferta', true) IS NOT DISTINCT FROM 'on';
BEGIN
  -- ── Cierre por oferta retirada (migration_051) ──────────────────────────────
  IF OLD.estado_empresa::text = 'oferta_retirada' OR NEW.estado_empresa::text = 'oferta_retirada' THEN
    IF NEW.estado_empresa IS DISTINCT FROM OLD.estado_empresa THEN
      IF v_rol IS NOT NULL AND NOT v_retiro THEN
        IF OLD.estado_empresa::text = 'oferta_retirada' THEN
          RAISE EXCEPTION 'Este proceso quedó cerrado porque la empresa retiró la oferta.';
        END IF;
        RAISE EXCEPTION 'Un proceso se cierra por oferta retirada solo cuando la empresa retira la oferta.';
      END IF;
      IF NEW.estado_empresa::text = 'oferta_retirada' THEN
        IF OLD.estado_empresa IN ('contratado', 'rechazado') THEN
          RAISE EXCEPTION 'Este proceso ya tiene un estado final y no puede modificarse.';
        END IF;
        NEW.fecha_respuesta := now();
      END IF;
    ELSIF v_rol = 'empresa' THEN
      RAISE EXCEPTION 'Este proceso quedó cerrado porque retiraste la oferta.';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- ── Municipalidad: puede corregir cualquier estado ──────────────────────────
  IF v_rol = 'municipalidad' THEN
    IF NEW.estado_empresa IN ('contratado', 'rechazado')
       AND OLD.estado_empresa NOT IN ('contratado', 'rechazado') THEN
      NEW.fecha_respuesta := now();
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- ── Empresa: protección de columnas reservadas ──────────────────────────────
  IF NEW.postulacion_id IS DISTINCT FROM OLD.postulacion_id THEN
    RAISE EXCEPTION 'No podés modificar la postulación de origen.';
  END IF;
  IF NEW.municipalidad_usuario_id IS DISTINCT FROM OLD.municipalidad_usuario_id THEN
    RAISE EXCEPTION 'No podés modificar el agente que realizó la derivación.';
  END IF;
  IF NEW.nota_municipalidad IS DISTINCT FROM OLD.nota_municipalidad THEN
    RAISE EXCEPTION 'No podés modificar la nota de la municipalidad.';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'No podés modificar la fecha de derivación.';
  END IF;
  IF NEW.fecha_respuesta IS DISTINCT FROM OLD.fecha_respuesta THEN
    RAISE EXCEPTION 'La fecha de respuesta la registra el sistema automáticamente.';
  END IF;

  -- ── Empresa: estado final es irreversible ────────────────────────────────────
  IF OLD.estado_empresa IN ('contratado', 'rechazado') THEN
    RAISE EXCEPTION 'Este proceso ya tiene un estado final y no puede modificarse.';
  END IF;

  -- ── Empresa: transiciones válidas ────────────────────────────────────────────
  -- pendiente  → en_proceso | rechazado
  -- en_proceso → en_proceso (reprogramar) | contratado | rechazado
  IF NOT (
    (OLD.estado_empresa = 'pendiente'  AND NEW.estado_empresa IN ('en_proceso', 'rechazado'))
    OR
    (OLD.estado_empresa = 'en_proceso' AND NEW.estado_empresa IN ('en_proceso', 'contratado', 'rechazado'))
  ) THEN
    RAISE EXCEPTION 'Transición de estado no permitida: % → %',
      OLD.estado_empresa::text, NEW.estado_empresa::text;
  END IF;

  -- ── Empresa: en_proceso exige fecha_entrevista ───────────────────────────────
  IF NEW.estado_empresa = 'en_proceso' AND NEW.fecha_entrevista IS NULL THEN
    RAISE EXCEPTION 'Debés indicar la fecha y hora de la entrevista para coordinarla.';
  END IF;

  -- ── Empresa: en_proceso exige lugar_entrevista no vacío ──────────────────────
  IF NEW.estado_empresa = 'en_proceso'
     AND (NEW.lugar_entrevista IS NULL OR TRIM(NEW.lugar_entrevista) = '') THEN
    RAISE EXCEPTION 'Debés indicar el lugar o las indicaciones para la entrevista.';
  END IF;

  -- ── Empresa: fecha nueva debe ser futura ─────────────────────────────────────
  IF NEW.fecha_entrevista IS DISTINCT FROM OLD.fecha_entrevista
     AND NEW.fecha_entrevista IS NOT NULL THEN
    IF NEW.fecha_entrevista <= now() THEN
      RAISE EXCEPTION 'La fecha y hora de la entrevista debe ser posterior al momento actual.';
    END IF;
    IF NEW.estado_empresa != 'en_proceso' THEN
      RAISE EXCEPTION 'Solo podés establecer la fecha de entrevista al coordinar o reprogramar.';
    END IF;
  END IF;

  -- ── Empresa: cambio de lugar solo en en_proceso ──────────────────────────────
  IF NEW.lugar_entrevista IS DISTINCT FROM OLD.lugar_entrevista
     AND NEW.estado_empresa != 'en_proceso' THEN
    RAISE EXCEPTION 'Solo podés modificar el lugar de entrevista cuando el estado es "Entrevista coordinada".';
  END IF;

  -- ── Empresa: contratado requiere que la entrevista ya haya pasado ─────────────
  IF NEW.estado_empresa = 'contratado' THEN
    IF NEW.fecha_entrevista IS NULL OR NEW.fecha_entrevista > now() THEN
      RAISE EXCEPTION 'Solo podés seleccionar a un candidato después de que haya pasado la fecha de la entrevista.';
    END IF;
  END IF;

  -- ── Empresa: rechazado exige nota_empresa no vacía ───────────────────────────
  IF NEW.estado_empresa = 'rechazado'
     AND (NEW.nota_empresa IS NULL OR TRIM(NEW.nota_empresa) = '') THEN
    RAISE EXCEPTION 'Debés indicar el motivo para no seleccionar al candidato.';
  END IF;

  -- ── Auto-set fecha_respuesta al cerrar el proceso ────────────────────────────
  IF NEW.estado_empresa IN ('contratado', 'rechazado') THEN
    NEW.fecha_respuesta := now();
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 10c. postulaciones
CREATE OR REPLACE FUNCTION public.postulaciones_proteger_oferta_retirada_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF public.rol_actual() IS NULL
     OR pg_catalog.current_setting('ftl.retiro_oferta', true) IS NOT DISTINCT FROM 'on' THEN
    RETURN NEW;
  END IF;

  IF OLD.estado::text = 'oferta_retirada' THEN
    RAISE EXCEPTION 'Esta postulación quedó cerrada porque la empresa retiró la oferta.';
  END IF;

  IF NEW.estado::text = 'oferta_retirada' THEN
    RAISE EXCEPTION 'Una postulación se cierra por oferta retirada solo cuando la empresa retira la oferta.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.postulaciones_proteger_oferta_retirada_fn()
  FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS postulaciones_proteger_oferta_retirada ON public.postulaciones;
CREATE TRIGGER postulaciones_proteger_oferta_retirada
  BEFORE UPDATE ON public.postulaciones
  FOR EACH ROW
  WHEN (NEW.estado IS DISTINCT FROM OLD.estado)
  EXECUTE FUNCTION public.postulaciones_proteger_oferta_retirada_fn();

-- 10d. Aviso al postulante sin derivación.
CREATE OR REPLACE FUNCTION public.postulaciones_notificar_oferta_retirada_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_oferta             text;
  v_postulante_usuario uuid;
BEGIN
  BEGIN
    SELECT o.titulo, pt.usuario_id
    INTO   v_oferta, v_postulante_usuario
    FROM   public.ofertas o
    JOIN   public.postulantes pt ON pt.id = NEW.postulante_id
    WHERE  o.id = NEW.oferta_id;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    PERFORM public.notificar_usuario(
      v_postulante_usuario,
      'postulacion_cerrada',
      'Postulación cerrada',
      'La empresa retiró la oferta «' || v_oferta || '». Tu postulación quedó cerrada; '
        || 'podés seguir postulándote a otras ofertas.',
      '/mis-postulaciones',
      'postulacion_cerrada:' || NEW.id::text
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'postulaciones_notificar_oferta_retirada_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.postulaciones_notificar_oferta_retirada_fn()
  FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS postulaciones_notificar_oferta_retirada ON public.postulaciones;
CREATE TRIGGER postulaciones_notificar_oferta_retirada
  AFTER UPDATE ON public.postulaciones
  FOR EACH ROW
  WHEN (NEW.estado::text = 'oferta_retirada'
        AND OLD.estado::text IS DISTINCT FROM 'oferta_retirada')
  EXECUTE FUNCTION public.postulaciones_notificar_oferta_retirada_fn();

-- 10d. Aviso al postulante con derivación: copia de 041 con la rama nueva.
-- El trigger derivaciones_notificar_postulante (041) ya dispara cuando cambia
-- estado_empresa.
CREATE OR REPLACE FUNCTION public.derivaciones_notificar_postulante_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_oferta             text;
  v_empresa            text;
  v_postulante_usuario uuid;
  v_lugar              text;
  v_reprogramada       boolean;
BEGIN
  BEGIN
    SELECT
      o.titulo,
      COALESCE(NULLIF(pg_catalog.btrim(o.empresa_nombre), ''), 'La empresa'),
      pt.usuario_id
    INTO v_oferta, v_empresa, v_postulante_usuario
    FROM public.postulaciones po
    JOIN public.ofertas o      ON o.id  = po.oferta_id
    JOIN public.postulantes pt ON pt.id = po.postulante_id
    WHERE po.id = NEW.postulacion_id;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    IF NEW.estado_empresa = 'en_proceso'
       AND NEW.fecha_entrevista IS NOT NULL
       AND (NEW.fecha_entrevista IS DISTINCT FROM OLD.fecha_entrevista
            OR NEW.lugar_entrevista IS DISTINCT FROM OLD.lugar_entrevista) THEN
      v_lugar := NULLIF(pg_catalog.btrim(NEW.lugar_entrevista), '');
      v_reprogramada := OLD.estado_empresa = 'en_proceso' AND OLD.fecha_entrevista IS NOT NULL;

      PERFORM public.notificar_usuario(
        v_postulante_usuario,
        'entrevista',
        CASE WHEN v_reprogramada THEN 'Entrevista reprogramada' ELSE 'Entrevista coordinada' END,
        CASE
          WHEN v_reprogramada THEN
            v_empresa || ' reprogramó tu entrevista para «' || v_oferta || '». Nueva fecha: '
          ELSE
            v_empresa || ' coordinó una entrevista con vos para «' || v_oferta || '». Fecha: '
        END
          || public.notificaciones_fecha(NEW.fecha_entrevista, true) || '.'
          || COALESCE(' Lugar: ' || v_lugar || '.', ''),
        '/mis-postulaciones',
        'entrevista:' || NEW.id::text
          || ':' || public.notificaciones_marca(NEW.fecha_entrevista)
          || ':' || pg_catalog.md5(COALESCE(v_lugar, ''))
      );
    END IF;

    IF NEW.estado_empresa IS DISTINCT FROM OLD.estado_empresa THEN
      IF NEW.estado_empresa = 'contratado' THEN
        PERFORM public.notificar_usuario(
          v_postulante_usuario,
          'seleccionado',
          '¡Fuiste seleccionado!',
          v_empresa || ' te seleccionó para el puesto «' || v_oferta || '».',
          '/mis-postulaciones',
          'seleccionado:' || NEW.id::text
        );
      ELSIF NEW.estado_empresa = 'rechazado' THEN
        PERFORM public.notificar_usuario(
          v_postulante_usuario,
          'no_seleccionado_empresa',
          'No fuiste seleccionado',
          'Esta vez ' || v_empresa || ' no te seleccionó para «' || v_oferta
            || '». Podés seguir postulándote a otras ofertas del portal.',
          '/mis-postulaciones',
          'no_seleccionado:' || NEW.id::text
        );
      ELSIF NEW.estado_empresa::text = 'oferta_retirada' THEN
        PERFORM public.notificar_usuario(
          v_postulante_usuario,
          'postulacion_cerrada',
          'Postulación cerrada',
          'La empresa retiró la oferta «' || v_oferta || '». Tu postulación quedó cerrada; '
            || 'podés seguir postulándote a otras ofertas.',
          '/mis-postulaciones',
          'postulacion_cerrada:' || NEW.postulacion_id::text
        );
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'derivaciones_notificar_postulante_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;

-- 10e.
CREATE OR REPLACE FUNCTION public.retirar_oferta(p_oferta_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_estado        public.estado_oferta;
  v_eliminada     timestamptz;
  v_titulo        text;
  v_empresa       text;
  v_derivaciones  int := 0;
  v_postulaciones int := 0;
  v_total         int;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'empresa' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT o.estado, o.eliminada_en, o.titulo, o.empresa_nombre
  INTO   v_estado, v_eliminada, v_titulo, v_empresa
  FROM   public.ofertas o
  JOIN   public.empresas e ON e.id = o.empresa_id
  WHERE  o.id = p_oferta_id
    AND  e.usuario_id = auth.uid()
  FOR UPDATE OF o;

  IF NOT FOUND OR v_eliminada IS NOT NULL THEN
    RAISE EXCEPTION 'No se encontró la oferta o no tenés permiso para retirarla.';
  END IF;

  IF v_estado = 'cerrada' THEN
    RAISE EXCEPTION 'La oferta ya está cerrada.';
  END IF;
  IF v_estado = 'borrador' THEN
    RAISE EXCEPTION 'Un borrador no está publicado: si no lo vas a usar, eliminalo.';
  END IF;
  IF v_estado = 'rechazada' THEN
    RAISE EXCEPTION 'Una oferta rechazada no está publicada: podés corregirla o eliminarla.';
  END IF;
  IF v_estado NOT IN ('pendiente_aprobacion', 'activa') THEN
    RAISE EXCEPTION 'No se puede retirar esta oferta.';
  END IF;

  -- Solo dura esta transacción: habilita el estado 'oferta_retirada' en los
  -- triggers de 10c.
  PERFORM pg_catalog.set_config('ftl.retiro_oferta', 'on', true);

  UPDATE public.ofertas o
  SET    estado     = 'cerrada',
         updated_at = now()
  WHERE  o.id = p_oferta_id;

  UPDATE public.derivaciones d
  SET    estado_empresa = 'oferta_retirada'
  WHERE  d.id IN (
    SELECT a.derivacion_id
    FROM public.procesos_abiertos_de_oferta(p_oferta_id) a
    WHERE a.derivacion_id IS NOT NULL
  );
  GET DIAGNOSTICS v_derivaciones = ROW_COUNT;

  UPDATE public.postulaciones po
  SET    estado     = 'oferta_retirada',
         updated_at = now()
  WHERE  po.id IN (
    SELECT a.postulacion_id
    FROM public.procesos_abiertos_de_oferta(p_oferta_id) a
    WHERE a.derivacion_id IS NULL
  );
  GET DIAGNOSTICS v_postulaciones = ROW_COUNT;

  PERFORM pg_catalog.set_config('ftl.retiro_oferta', 'off', true);

  v_total := v_derivaciones + v_postulaciones;

  BEGIN
    PERFORM public.notificar_oficina(
      'oferta_retirada',
      'Oferta retirada',
      COALESCE(NULLIF(pg_catalog.btrim(v_empresa), ''), 'Una empresa')
        || ' retiró la oferta «' || v_titulo || '».'
        || CASE
             WHEN v_total = 0 THEN ' No tenía procesos en curso.'
             WHEN v_total = 1 THEN ' Se cerró 1 proceso en curso.'
             ELSE ' Se cerraron ' || v_total::text || ' procesos en curso.'
           END,
      '/admin/ofertas/' || p_oferta_id::text,
      'oferta_retirada:' || p_oferta_id::text
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'retirar_oferta (aviso a la oficina): % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN v_total;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.retirar_oferta(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.retirar_oferta(uuid) TO authenticated;


-- ============================================================
-- BLOQUE 11 — Borrado lógico
--
-- eliminar_oferta(p_oferta_id): oferta propia, no eliminada, en borrador,
--   rechazada o pendiente de revisión sin postulaciones (las mismas
--   condiciones que la política de DELETE de 025, más los borradores).
--   Marca eliminada_en; la fila y sus categorías y vacantes quedan.
-- restaurar_oferta(p_oferta_id): dentro de ofertas_dias_restauracion() días,
--   vuelve a poner eliminada_en en NULL; la oferta sigue en el estado que
--   tenía. Si estaba pendiente de revisión, se avisa de nuevo a la oficina
--   (al eliminarla dejó de verla en su listado).
-- purgar_ofertas_eliminadas(): borra de verdad las eliminadas hace más de
--   ofertas_dias_restauracion() días. Las filas dependientes se van por las
--   FK existentes: oferta_categorias, oferta_vacantes y postulaciones
--   (con sus derivaciones y pre-entrevistas) ON DELETE CASCADE;
--   candidatos_guardados.oferta_origen_id ON DELETE SET NULL. Una oferta
--   eliminada no puede tener postulaciones (eliminar_oferta lo exige y no es
--   'activa'), pero por las dudas la purga no borra las que tengan: quedan
--   para revisar a mano. Solo service_role. Devuelve cuántas borró.
-- ============================================================

CREATE OR REPLACE FUNCTION public.eliminar_oferta(p_oferta_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_estado    public.estado_oferta;
  v_eliminada timestamptz;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'empresa' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT o.estado, o.eliminada_en
  INTO   v_estado, v_eliminada
  FROM   public.ofertas o
  JOIN   public.empresas e ON e.id = o.empresa_id
  WHERE  o.id = p_oferta_id
    AND  e.usuario_id = auth.uid()
  FOR UPDATE OF o;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la oferta o no tenés permiso para eliminarla.';
  END IF;

  IF v_eliminada IS NOT NULL THEN
    RAISE EXCEPTION 'La oferta ya está eliminada.';
  END IF;

  IF v_estado NOT IN ('borrador', 'rechazada', 'pendiente_aprobacion') THEN
    RAISE EXCEPTION 'Solo podés eliminar un borrador, una oferta rechazada o una pendiente de revisión sin postulaciones.';
  END IF;

  IF NOT public.oferta_sin_postulaciones(p_oferta_id) THEN
    RAISE EXCEPTION 'Esta oferta ya tiene postulaciones y no se puede eliminar. Podés retirarla.';
  END IF;

  UPDATE public.ofertas o
  SET    eliminada_en = now(),
         updated_at   = now()
  WHERE  o.id = p_oferta_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.eliminar_oferta(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.eliminar_oferta(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.restaurar_oferta(p_oferta_id uuid)
RETURNS public.estado_oferta
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_estado    public.estado_oferta;
  v_eliminada timestamptz;
  v_titulo    text;
  v_empresa   text;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'empresa' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT o.estado, o.eliminada_en, o.titulo, o.empresa_nombre
  INTO   v_estado, v_eliminada, v_titulo, v_empresa
  FROM   public.ofertas o
  JOIN   public.empresas e ON e.id = o.empresa_id
  WHERE  o.id = p_oferta_id
    AND  e.usuario_id = auth.uid()
  FOR UPDATE OF o;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la oferta o no tenés permiso para restaurarla.';
  END IF;

  IF v_eliminada IS NULL THEN
    RAISE EXCEPTION 'La oferta no está eliminada.';
  END IF;

  IF v_eliminada <= now() - pg_catalog.make_interval(days => public.ofertas_dias_restauracion()) THEN
    RAISE EXCEPTION 'Pasaron más de % días desde que la eliminaste y ya no se puede restaurar.',
      public.ofertas_dias_restauracion();
  END IF;

  UPDATE public.ofertas o
  SET    eliminada_en = NULL,
         updated_at   = now()
  WHERE  o.id = p_oferta_id;

  IF v_estado = 'pendiente_aprobacion' THEN
    BEGIN
      PERFORM public.notificar_oficina(
        'oferta_pendiente',
        'Oferta restaurada para revisar',
        COALESCE(NULLIF(pg_catalog.btrim(v_empresa), ''), 'Una empresa')
          || ' restauró la oferta «' || v_titulo || '» y quedó pendiente de revisión.',
        '/admin/ofertas/' || p_oferta_id::text,
        'oferta_restaurada:' || p_oferta_id::text || ':' || public.notificaciones_marca(now())
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'restaurar_oferta (aviso a la oficina): % (%)', SQLERRM, SQLSTATE;
    END;
  END IF;

  RETURN v_estado;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.restaurar_oferta(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.restaurar_oferta(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.purgar_ofertas_eliminadas()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_borradas int;
BEGIN
  DELETE FROM public.ofertas o
  WHERE o.eliminada_en IS NOT NULL
    AND o.eliminada_en <= now() - pg_catalog.make_interval(days => public.ofertas_dias_restauracion())
    AND NOT EXISTS (
      SELECT 1 FROM public.postulaciones po WHERE po.oferta_id = o.id
    );
  GET DIAGNOSTICS v_borradas = ROW_COUNT;
  RETURN v_borradas;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purgar_ofertas_eliminadas() FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.purgar_ofertas_eliminadas() TO service_role;


-- ============================================================
-- BLOQUE 12 — Indicadores de la empresa (049), misma firma
-- Copia de 049; único cambio: las ofertas de la empresa sin borradores ni
-- eliminadas (no son ofertas publicadas ni enviadas). Las ofertas retiradas
-- cuentan como 'cerrada'. 'oferta_retirada' no cuenta como no seleccionado:
-- no_seleccionados sigue contando solo 'rechazado'.
-- ============================================================

CREATE OR REPLACE FUNCTION public.indicadores_empresa(p_desde timestamptz DEFAULT NULL)
RETURNS TABLE (
  ofertas_totales            bigint,
  ofertas_vigentes           bigint,
  ofertas_pendientes         bigint,
  ofertas_vencidas           bigint,
  ofertas_cerradas           bigint,
  ofertas_rechazadas         bigint,
  vacantes_totales           bigint,
  vacantes_cubiertas         bigint,
  candidatos_derivados       bigint,
  entrevistas_coordinadas    bigint,
  seleccionados              bigint,
  no_seleccionados           bigint,
  dias_promedio_contratacion numeric
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_empresa_id uuid;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'empresa' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT e.id INTO v_empresa_id
  FROM public.empresas e
  WHERE e.usuario_id = auth.uid()
    AND e.estado_aprobacion = 'aprobada';

  IF v_empresa_id IS NULL THEN
    RETURN QUERY
    SELECT 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint,
           0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint,
           NULL::numeric;
    RETURN;
  END IF;

  RETURN QUERY
  WITH mis_ofertas AS (
    SELECT o.id, o.estado, o.vence_en, o.publicado_en
    FROM public.ofertas o
    WHERE o.empresa_id = v_empresa_id
      AND o.estado <> 'borrador'
      AND o.eliminada_en IS NULL
  ),
  mis_derivaciones AS (
    SELECT
      po.oferta_id,
      d.estado_empresa,
      d.created_at,
      d.fecha_entrevista,
      COALESCE(d.fecha_respuesta, d.updated_at) AS fecha_resultado
    FROM mis_ofertas mo
    JOIN public.postulaciones po ON po.oferta_id = mo.id
    JOIN public.derivaciones d   ON d.postulacion_id = po.id
  ),
  cobertura AS (
    SELECT
      COALESCE(ov.cantidad, 0) AS vacantes,
      (SELECT pg_catalog.count(*)
         FROM mis_derivaciones md
        WHERE md.oferta_id = mo.id
          AND md.estado_empresa = 'contratado') AS seleccionados_total
    FROM mis_ofertas mo
    LEFT JOIN public.oferta_vacantes ov ON ov.oferta_id = mo.id
    WHERE mo.publicado_en IS NOT NULL
       OR mo.estado IN ('activa', 'cerrada')
  )
  SELECT
    (SELECT pg_catalog.count(*) FROM mis_ofertas mo),

    (SELECT pg_catalog.count(*) FROM mis_ofertas mo
      WHERE mo.estado = 'activa'
        AND mo.vence_en > pg_catalog.now()),

    (SELECT pg_catalog.count(*) FROM mis_ofertas mo
      WHERE mo.estado = 'pendiente_aprobacion'),

    (SELECT pg_catalog.count(*) FROM mis_ofertas mo
      WHERE mo.estado = 'activa'
        AND mo.vence_en <= pg_catalog.now()),

    (SELECT pg_catalog.count(*) FROM mis_ofertas mo
      WHERE mo.estado = 'cerrada'),

    (SELECT pg_catalog.count(*) FROM mis_ofertas mo
      WHERE mo.estado = 'rechazada'),

    (SELECT COALESCE(pg_catalog.sum(c.vacantes), 0)::bigint FROM cobertura c),

    (SELECT COALESCE(pg_catalog.sum(LEAST(c.seleccionados_total, c.vacantes)), 0)::bigint
       FROM cobertura c),

    (SELECT pg_catalog.count(*) FROM mis_derivaciones md
      WHERE p_desde IS NULL OR md.created_at >= p_desde),

    (SELECT pg_catalog.count(*) FROM mis_derivaciones md
      WHERE md.fecha_entrevista IS NOT NULL
        AND (p_desde IS NULL OR md.fecha_entrevista >= p_desde)),

    (SELECT pg_catalog.count(*) FROM mis_derivaciones md
      WHERE md.estado_empresa = 'contratado'
        AND (p_desde IS NULL OR md.fecha_resultado >= p_desde)),

    (SELECT pg_catalog.count(*) FROM mis_derivaciones md
      WHERE md.estado_empresa = 'rechazado'
        AND (p_desde IS NULL OR md.fecha_resultado >= p_desde)),

    (SELECT pg_catalog.round(
              (pg_catalog.avg(EXTRACT(EPOCH FROM (md.fecha_resultado - md.created_at))) / 86400)::numeric,
              1)
       FROM mis_derivaciones md
      WHERE md.estado_empresa = 'contratado'
        AND (p_desde IS NULL OR md.fecha_resultado >= p_desde));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.indicadores_empresa(timestamptz) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.indicadores_empresa(timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.indicadores_por_oferta_empresa(p_desde timestamptz DEFAULT NULL)
RETURNS TABLE (
  oferta_id     uuid,
  titulo        text,
  estado        public.estado_oferta,
  vence_en      timestamptz,
  vacantes      integer,
  cubiertas     bigint,
  derivados     bigint,
  entrevistas   bigint,
  seleccionados bigint
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_empresa_id uuid;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'empresa' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT e.id INTO v_empresa_id
  FROM public.empresas e
  WHERE e.usuario_id = auth.uid()
    AND e.estado_aprobacion = 'aprobada';

  IF v_empresa_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH por_oferta AS (
    SELECT
      po.oferta_id,
      pg_catalog.count(*) FILTER (WHERE d.estado_empresa = 'contratado') AS seleccionados_total,
      pg_catalog.count(*) FILTER (
        WHERE p_desde IS NULL OR d.created_at >= p_desde) AS derivados,
      pg_catalog.count(*) FILTER (
        WHERE d.fecha_entrevista IS NOT NULL
          AND (p_desde IS NULL OR d.fecha_entrevista >= p_desde)) AS entrevistas,
      pg_catalog.count(*) FILTER (
        WHERE d.estado_empresa = 'contratado'
          AND (p_desde IS NULL
               OR COALESCE(d.fecha_respuesta, d.updated_at) >= p_desde)) AS seleccionados
    FROM public.ofertas o
    JOIN public.postulaciones po ON po.oferta_id = o.id
    JOIN public.derivaciones d   ON d.postulacion_id = po.id
    WHERE o.empresa_id = v_empresa_id
    GROUP BY po.oferta_id
  )
  SELECT
    o.id,
    o.titulo,
    o.estado,
    o.vence_en,
    ov.cantidad,
    LEAST(COALESCE(p.seleccionados_total, 0), COALESCE(ov.cantidad, 0))::bigint,
    COALESCE(p.derivados, 0)::bigint,
    COALESCE(p.entrevistas, 0)::bigint,
    COALESCE(p.seleccionados, 0)::bigint
  FROM public.ofertas o
  LEFT JOIN public.oferta_vacantes ov ON ov.oferta_id = o.id
  LEFT JOIN por_oferta p              ON p.oferta_id  = o.id
  WHERE o.empresa_id = v_empresa_id
    AND o.estado <> 'borrador'
    AND o.eliminada_en IS NULL
  ORDER BY o.created_at DESC, o.id DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.indicadores_por_oferta_empresa(timestamptz) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.indicadores_por_oferta_empresa(timestamptz) TO authenticated;


-- ============================================================
-- Verificación (opcional, en el SQL Editor)
-- ============================================================
-- Valores nuevos de los enums:
-- select enum_range(null::public.estado_postulacion), enum_range(null::public.estado_empresa);
--
-- Estado del CHECK de requisitos (convalidated = false si quedó NOT VALID):
-- select conname, convalidated from pg_constraint
-- where conrelid = 'public.ofertas'::regclass
--   and conname in ('ofertas_requisito_minimo_check', 'ofertas_eliminada_sin_publicar_check');
--
-- Ofertas eliminadas y cuándo se purgan:
-- select id, titulo, estado, eliminada_en,
--        eliminada_en + make_interval(days => public.ofertas_dias_restauracion()) as se_purga
-- from public.ofertas where eliminada_en is not null order by eliminada_en;


-- ============================================================
-- ROLLBACK (no se ejecuta; copiar y correr a mano si hace falta)
-- Los valores 'oferta_retirada' de los enums no se pueden quitar sin
-- recrear los tipos: si hay filas con ese estado, pasarlas antes a mano.
-- Las funciones reemplazadas vuelven a su versión anterior re-ejecutando el
-- bloque correspondiente de 024, 029, 032, 040, 041, 043, 048 y 049.
-- Antes de quitar la columna eliminada_en hay que volver a crear las
-- políticas de ofertas de 004, 021, 022 y 025 (las de este archivo la usan)
-- y el CHECK de notificaciones de 044.
--
-- DROP FUNCTION IF EXISTS public.purgar_ofertas_eliminadas();
-- DROP FUNCTION IF EXISTS public.restaurar_oferta(uuid);
-- DROP FUNCTION IF EXISTS public.eliminar_oferta(uuid);
-- DROP FUNCTION IF EXISTS public.retirar_oferta(uuid);
-- DROP TRIGGER IF EXISTS postulaciones_notificar_oferta_retirada ON public.postulaciones;
-- DROP FUNCTION IF EXISTS public.postulaciones_notificar_oferta_retirada_fn();
-- DROP TRIGGER IF EXISTS postulaciones_proteger_oferta_retirada ON public.postulaciones;
-- DROP FUNCTION IF EXISTS public.postulaciones_proteger_oferta_retirada_fn();
-- DROP FUNCTION IF EXISTS public.procesos_abiertos_ofertas_empresa(uuid[]);
-- DROP FUNCTION IF EXISTS public.procesos_abiertos_de_oferta(uuid);
-- DROP FUNCTION IF EXISTS public.enviar_borrador_oferta(uuid);
-- DROP FUNCTION IF EXISTS public.guardar_borrador_oferta(uuid, text, text, text, public.modalidad_oferta, public.jornada_oferta, text[], text[], int, uuid[], int, uuid, boolean);
-- DROP TRIGGER IF EXISTS ofertas_reglas_borrador_y_eliminacion ON public.ofertas;
-- DROP FUNCTION IF EXISTS public.ofertas_reglas_borrador_y_eliminacion_fn();
-- DROP FUNCTION IF EXISTS public.oferta_campos_faltantes(uuid, text, text, public.modalidad_oferta, public.jornada_oferta, text[], int);
-- ALTER TABLE public.ofertas DROP CONSTRAINT IF EXISTS ofertas_requisito_minimo_check;
-- DROP FUNCTION IF EXISTS public.oferta_tiene_requisito(text[]);
-- ALTER TABLE public.ofertas DROP CONSTRAINT IF EXISTS ofertas_eliminada_sin_publicar_check;
-- DROP INDEX IF EXISTS public.ofertas_eliminada_en_idx;
-- DROP FUNCTION IF EXISTS public.ofertas_dias_restauracion();
-- ALTER TABLE public.ofertas DROP COLUMN IF EXISTS eliminada_en;
-- ============================================================
