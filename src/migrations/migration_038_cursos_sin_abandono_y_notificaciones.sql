-- ============================================================
-- Portal Municipal de Empleo — Migración 038
-- Transiciones de curso sin abandono por la oficina y notificaciones
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_037_derivaciones_sin_resultado.sql ya aplicada.
-- Re-ejecutable sin errores. No borra ni modifica datos existentes.
-- ============================================================
--
-- Parte 1 — Transiciones de asignaciones_curso (reemplaza la función de
-- migration_035; el trigger asignaciones_curso_transicion no cambia):
--   Postulante (vía actualizar_estado_mi_curso):
--     asignado → en_curso
--     en_curso → completado
--     Ya no puede pasar de asignado a completado sin empezar el curso.
--   Municipalidad: ya no cambia el estado de una asignación. No puede
--     marcarla como abandonada ni reactivarla; solo edita la nota interna.
--   Sin rol (SQL Editor o service role): las del postulante, más
--     asignado | en_curso → abandonado y abandonado → asignado, que quedan
--     solo para correcciones manuales de datos. Tampoco puede pasar de
--     asignado a completado.
--   Una asignación completada no vuelve atrás, para ningún rol.
--
--   El valor 'abandonado' se mantiene en el CHECK de estado: la migración
--   035 pudo dejar asignaciones viejas en ese estado y se siguen mostrando
--   como historial, solo lectura.
--
--   asignaciones_curso_alta_fn también se reemplaza solo para cambiar el
--   mensaje de la segunda asignación activa, que sugería marcar la actual
--   como abandonada.
--
-- Parte 2 — Notificaciones:
--   - Tabla genérica public.notificaciones (destinatario, tipo, texto, link,
--     leída o no). Por ahora el único tipo es 'contratacion'.
--   - RLS: cada usuario lee y marca como leídas solo las suyas (UPDATE solo
--     sobre leida_en). Nadie inserta ni borra desde el cliente: las filas
--     las crean triggers o funciones SECURITY DEFINER.
--   - clave: identificador opcional del hecho que originó el aviso. Con el
--     índice único (usuario_id, clave) un mismo hecho no genera dos avisos
--     para el mismo usuario aunque el trigger corra más de una vez.
--   - Trigger AFTER UPDATE en derivaciones: cuando estado_empresa pasa a
--     'contratado', avisa a cada usuario con rol municipalidad.
--   - Sin backfill: las contrataciones anteriores no generan avisos.
--
-- Parte 3 — Postulaciones no seleccionadas (pestaña "No seleccionado" de
-- /admin/postulaciones):
--   - postulaciones_no_seleccionadas(): une las que rechazó la oficina
--     (postulaciones.estado = 'rechazada_municipalidad') con las que
--     rechazó la empresa (derivaciones.estado_empresa = 'rechazado'), con
--     quién la rechazó y la fecha, para que PostgREST pueda filtrar,
--     contar, ordenar y paginar sobre el conjunto unido.
-- ============================================================


-- ============================================================
-- BLOQUE 1 — Trigger BEFORE UPDATE de asignaciones_curso (reemplazo)
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
  -- mismo postulante.
  IF NEW.estado = 'asignado' AND EXISTS (
    SELECT 1
    FROM public.asignaciones_curso ac
    WHERE ac.postulante_id = NEW.postulante_id
      AND ac.id <> NEW.id
      AND ac.estado IN ('asignado', 'en_curso')
  ) THEN
    RAISE EXCEPTION 'El postulante ya tiene otro curso asignado o en curso.';
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

-- El trigger asignaciones_curso_transicion (migration_035) ya apunta a esta
-- función; se recrea igual para que el script funcione aunque falte.
DROP TRIGGER IF EXISTS asignaciones_curso_transicion ON public.asignaciones_curso;
CREATE TRIGGER asignaciones_curso_transicion
  BEFORE UPDATE ON public.asignaciones_curso
  FOR EACH ROW EXECUTE FUNCTION public.asignaciones_curso_transicion_fn();


-- ============================================================
-- BLOQUE 2 — Trigger BEFORE INSERT de asignaciones_curso (reemplazo)
-- Misma lógica que migration_035; solo cambia el mensaje.
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
    RAISE EXCEPTION 'Este postulante ya tiene un curso asignado o en curso. Podrá recibir otro cuando complete el actual.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS asignaciones_curso_alta ON public.asignaciones_curso;
CREATE TRIGGER asignaciones_curso_alta
  BEFORE INSERT ON public.asignaciones_curso
  FOR EACH ROW EXECUTE FUNCTION public.asignaciones_curso_alta_fn();


-- ============================================================
-- BLOQUE 3 — Tabla notificaciones
--
--   usuario_id  destinatario.
--   tipo        clase de aviso; el CHECK lista los tipos válidos. Para
--               agregar uno nuevo, una migración posterior reemplaza el
--               CHECK notificaciones_tipo_check.
--   titulo      texto corto (encabezado del aviso).
--   mensaje     texto completo.
--   link        ruta interna opcional ("/admin/..."); nunca una URL externa.
--   clave       identificador opcional del hecho que originó el aviso
--               (por ejemplo 'contratacion:<derivacion_id>'), para no
--               duplicarlo.
--   leida_en    NULL mientras no se leyó.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notificaciones (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid        NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tipo       text        NOT NULL,
  titulo     text        NOT NULL,
  mensaje    text        NOT NULL,
  link       text,
  clave      text,
  leida_en   timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    WHERE c.conname  = 'notificaciones_tipo_check'
      AND c.conrelid = 'public.notificaciones'::regclass
  ) THEN
    ALTER TABLE public.notificaciones
      ADD CONSTRAINT notificaciones_tipo_check
      CHECK (tipo IN ('contratacion'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    WHERE c.conname  = 'notificaciones_link_check'
      AND c.conrelid = 'public.notificaciones'::regclass
  ) THEN
    ALTER TABLE public.notificaciones
      ADD CONSTRAINT notificaciones_link_check
      CHECK (link IS NULL OR (link LIKE '/%' AND link NOT LIKE '//%'));
  END IF;
END;
$$;

-- Contador de no leídas y listado de la campanita.
CREATE INDEX IF NOT EXISTS notificaciones_usuario_leida_idx
  ON public.notificaciones (usuario_id, leida_en, created_at DESC);

-- Un mismo hecho genera como máximo un aviso por destinatario.
CREATE UNIQUE INDEX IF NOT EXISTS notificaciones_usuario_clave_idx
  ON public.notificaciones (usuario_id, clave)
  WHERE clave IS NOT NULL;


-- ============================================================
-- BLOQUE 4 — RLS y permisos de notificaciones
-- SELECT y UPDATE (solo leida_en) sobre las propias. Sin INSERT ni DELETE
-- para ningún rol del cliente.
-- ============================================================

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notificaciones: ver (propias)" ON public.notificaciones;
CREATE POLICY "notificaciones: ver (propias)"
  ON public.notificaciones
  FOR SELECT
  TO authenticated
  USING (usuario_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "notificaciones: marcar leída (propias)" ON public.notificaciones;
CREATE POLICY "notificaciones: marcar leída (propias)"
  ON public.notificaciones
  FOR UPDATE
  TO authenticated
  USING (usuario_id = (SELECT auth.uid()))
  WITH CHECK (usuario_id = (SELECT auth.uid()));

REVOKE ALL ON public.notificaciones FROM public, anon, authenticated;
GRANT SELECT ON public.notificaciones TO authenticated;
GRANT UPDATE (leida_en) ON public.notificaciones TO authenticated;


-- ============================================================
-- BLOQUE 5 — Aviso de contratación
-- Cuando una derivación pasa a 'contratado' (la marca la empresa o la
-- corrige la oficina), cada usuario con rol municipalidad recibe:
--   "<Empresa> contrató a <Nombre Apellido> para <Oferta>"
-- con link a la ficha de la postulación. La clave
-- 'contratacion:<derivacion_id>' evita duplicados si la derivación vuelve a
-- pasar a 'contratado' o el trigger corre más de una vez.
-- ============================================================

CREATE OR REPLACE FUNCTION public.derivaciones_notificar_contratacion_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_empresa        text;
  v_postulante     text;
  v_oferta         text;
  v_postulacion_id uuid;
BEGIN
  SELECT
    COALESCE(NULLIF(pg_catalog.btrim(o.empresa_nombre), ''), 'Una empresa'),
    pg_catalog.btrim(u.nombre || ' ' || u.apellido),
    o.titulo,
    po.id
  INTO v_empresa, v_postulante, v_oferta, v_postulacion_id
  FROM public.postulaciones po
  JOIN public.ofertas o        ON o.id  = po.oferta_id
  JOIN public.postulantes pt   ON pt.id = po.postulante_id
  JOIN public.usuarios u       ON u.id  = pt.usuario_id
  WHERE po.id = NEW.postulacion_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, link, clave)
  SELECT
    us.id,
    'contratacion',
    'Nueva contratación',
    v_empresa || ' contrató a ' || v_postulante || ' para ' || v_oferta,
    '/admin/postulaciones/' || v_postulacion_id::text,
    'contratacion:' || NEW.id::text
  FROM public.usuarios us
  WHERE us.rol = 'municipalidad'
  ON CONFLICT (usuario_id, clave) WHERE clave IS NOT NULL DO NOTHING;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS derivaciones_notificar_contratacion ON public.derivaciones;
CREATE TRIGGER derivaciones_notificar_contratacion
  AFTER UPDATE OF estado_empresa ON public.derivaciones
  FOR EACH ROW
  WHEN (NEW.estado_empresa = 'contratado'
        AND OLD.estado_empresa IS DISTINCT FROM 'contratado')
  EXECUTE FUNCTION public.derivaciones_notificar_contratacion_fn();


-- ============================================================
-- BLOQUE 6 — Postulaciones no seleccionadas (solo municipalidad)
--
-- Una fila por postulación (derivaciones.postulacion_id es UNIQUE):
--   rechazado_por = 'empresa' si su derivación quedó en 'rechazado';
--                   'oficina' si la oficina la marcó como no seleccionada.
--   fecha_rechazo  empresa → derivaciones.fecha_respuesta (la fija el
--                  trigger de derivaciones al pasar a un estado final), con
--                  updated_at para filas viejas sin ella (igual que
--                  migration_035).
--                  oficina → postulaciones.updated_at, que la aplicación
--                  actualiza solo al cambiar el estado.
-- Devuelve un conjunto de filas: la aplicación filtra por oferta_id y
-- postulante_id, ordena por fecha_rechazo y pagina con PostgREST.
-- ============================================================

CREATE OR REPLACE FUNCTION public.postulaciones_no_seleccionadas()
RETURNS TABLE (
  postulacion_id uuid,
  postulante_id  uuid,
  oferta_id      uuid,
  usuario_id     uuid,
  nombre         text,
  apellido       text,
  dni            text,
  oferta_titulo  text,
  empresa_nombre text,
  rechazado_por  text,
  fecha_rechazo  timestamptz
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
    po.id,
    po.postulante_id,
    po.oferta_id,
    pt.usuario_id,
    u.nombre::text,
    u.apellido::text,
    pt.dni::text,
    o.titulo::text,
    o.empresa_nombre::text,
    CASE WHEN d.estado_empresa = 'rechazado' THEN 'empresa' ELSE 'oficina' END,
    CASE
      WHEN d.estado_empresa = 'rechazado' THEN COALESCE(d.fecha_respuesta, d.updated_at)
      ELSE po.updated_at
    END
  FROM public.postulaciones po
  JOIN public.ofertas o           ON o.id  = po.oferta_id
  LEFT JOIN public.postulantes pt ON pt.id = po.postulante_id
  LEFT JOIN public.usuarios u     ON u.id  = pt.usuario_id
  LEFT JOIN public.derivaciones d ON d.postulacion_id = po.id
  WHERE po.estado = 'rechazada_municipalidad'
     OR d.estado_empresa = 'rechazado';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.postulaciones_no_seleccionadas() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.postulaciones_no_seleccionadas() TO authenticated;
