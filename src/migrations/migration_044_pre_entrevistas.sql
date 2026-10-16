-- ============================================================
-- Portal Municipal de Empleo — Migración 044
-- Pre-entrevista obligatoria de la Oficina de Empleo antes de derivar
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_043_avisos_oficina_y_oferta_rechazada.sql ya aplicada.
-- Re-ejecutable sin errores. No borra ni modifica datos existentes.
-- ============================================================
--
--   BLOQUE 0  Diagnóstico (solo lectura): postulaciones pendientes que
--             quedan sujetas a la regla nueva.
--   BLOQUE 1  Tabla pre_entrevistas: una por postulación (UNIQUE
--             postulacion_id), estado 'coordinada' | 'realizada' |
--             'no_asistio', nota interna de la oficina.
--   BLOQUE 2  Trigger de transiciones: coordinada → realizada | no_asistio,
--             no_asistio → coordinada, una realizada no vuelve atrás.
--   BLOQUE 3  RLS: la oficina lee todas; nadie escribe desde el cliente.
--   BLOQUE 4  postulacion_tiene_pre_entrevista_realizada(): la regla de
--             "se puede derivar" en un solo lugar (uso interno).
--   BLOQUE 5  coordinar_pre_entrevista, reprogramar_pre_entrevista,
--             registrar_resultado_pre_entrevista (oficina).
--   BLOQUE 6  mis_pre_entrevistas(): lo que ve el postulante, sin la nota.
--   BLOQUE 7  derivar_postulacion (040), misma firma: exige la pre-entrevista
--             realizada.
--   BLOQUE 8  Triggers que exigen la pre-entrevista realizada también a las
--             escrituras directas (postulación → 'derivada', INSERT en
--             derivaciones).
--   BLOQUE 9  Avisos al postulante: pre-entrevista coordinada / reprogramada.
--
-- Hay una pre-entrevista por postulación (no por postulante). Está pendiente
-- de confirmar con la oficina; lo que habría que cambiar si pasa a ser por
-- postulante está en docs/decisiones/017-pre-entrevista.md.
--
-- Errores (igual que 040):
--   42501  rol incorrecto ('No autorizado').
--   P0001  el estado no permite la acción; el mensaje es para el usuario.
--   23505  la postulación ya tiene pre-entrevista (índice único).
-- ============================================================


-- ============================================================
-- BLOQUE 0 — Diagnóstico (solo lectura)
-- Las postulaciones en 'recibida' o 'en_revision' ya no se pueden derivar
-- hasta tener una pre-entrevista realizada. Las ya derivadas no cambian.
-- ============================================================

DO $$
DECLARE
  v_cantidad int;
BEGIN
  SELECT pg_catalog.count(*)::int INTO v_cantidad
  FROM public.postulaciones po
  WHERE po.estado IN ('recibida', 'en_revision');

  IF v_cantidad > 0 THEN
    RAISE NOTICE
      '% postulación(es) pendientes necesitan una pre-entrevista realizada antes de derivarse.',
      v_cantidad;
  END IF;
END;
$$;


-- ============================================================
-- BLOQUE 1 — Tabla pre_entrevistas
--
--   postulacion_id  una pre-entrevista por postulación (UNIQUE). Se borra con
--                   la postulación (decisión 006).
--   fecha_hora      fecha y hora acordadas. Que sea futura al coordinar o
--                   reprogramar lo controlan las funciones del BLOQUE 5 (un
--                   CHECK no puede usar now()).
--   lugar           obligatorio.
--   estado          'coordinada' | 'realizada' | 'no_asistio'.
--   nota_oficina    nota interna opcional; el postulante nunca la ve.
--   coordinada_por  quien coordinó o reprogramó por última vez.
-- La tabla es nueva: no hay filas viejas que puedan violar los CHECK.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pre_entrevistas (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  postulacion_id uuid        NOT NULL REFERENCES public.postulaciones(id) ON DELETE CASCADE,
  fecha_hora     timestamptz NOT NULL,
  lugar          text        NOT NULL,
  estado         text        NOT NULL DEFAULT 'coordinada',
  nota_oficina   text,
  coordinada_por uuid        REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pre_entrevistas_postulacion_unica UNIQUE (postulacion_id),
  CONSTRAINT pre_entrevistas_estado_check
    CHECK (estado IN ('coordinada', 'realizada', 'no_asistio')),
  CONSTRAINT pre_entrevistas_lugar_check
    CHECK (pg_catalog.btrim(lugar) <> '')
);

-- Contador de pre-entrevistas del día y filtro por estado del listado.
CREATE INDEX IF NOT EXISTS pre_entrevistas_estado_fecha_idx
  ON public.pre_entrevistas (estado, fecha_hora);


-- ============================================================
-- BLOQUE 2 — Transiciones (BEFORE UPDATE)
-- Aplica a todos, también sin rol (SQL Editor): una pre-entrevista realizada
-- es la condición para derivar y no puede volver atrás.
--   coordinada → coordinada   reprogramar (otra fecha u otro lugar)
--   coordinada → realizada | no_asistio
--   no_asistio → coordinada   reprogramar con fecha nueva
-- Una realizada o una no_asistio no cambian de fecha ni de lugar sin volver
-- a 'coordinada'. La postulación de una pre-entrevista no cambia.
-- ============================================================

CREATE OR REPLACE FUNCTION public.pre_entrevistas_transicion_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF NEW.postulacion_id IS DISTINCT FROM OLD.postulacion_id THEN
    RAISE EXCEPTION 'No se puede cambiar la postulación de una pre-entrevista.';
  END IF;

  IF NEW.estado = OLD.estado THEN
    IF NEW.estado <> 'coordinada'
       AND (NEW.fecha_hora IS DISTINCT FROM OLD.fecha_hora
            OR NEW.lugar IS DISTINCT FROM OLD.lugar) THEN
      RAISE EXCEPTION 'Solo se puede cambiar la fecha o el lugar de una pre-entrevista coordinada.';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.estado = 'realizada' THEN
    RAISE EXCEPTION 'La pre-entrevista ya se realizó y no se puede modificar.';
  END IF;

  IF NOT (
       (OLD.estado = 'coordinada' AND NEW.estado IN ('realizada', 'no_asistio'))
    OR (OLD.estado = 'no_asistio' AND NEW.estado = 'coordinada')
  ) THEN
    RAISE EXCEPTION 'La pre-entrevista no puede pasar de «%» a «%».', OLD.estado, NEW.estado;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pre_entrevistas_transicion ON public.pre_entrevistas;
CREATE TRIGGER pre_entrevistas_transicion
  BEFORE UPDATE ON public.pre_entrevistas
  FOR EACH ROW EXECUTE FUNCTION public.pre_entrevistas_transicion_fn();


-- ============================================================
-- BLOQUE 3 — RLS y permisos
-- La oficina lee todas. El postulante no lee la tabla (tiene la nota
-- interna): usa mis_pre_entrevistas() (BLOQUE 6). La empresa no las ve.
-- Nadie inserta, modifica ni borra desde el cliente: solo las funciones del
-- BLOQUE 5.
-- ============================================================

ALTER TABLE public.pre_entrevistas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pre_entrevistas: ver (municipalidad)" ON public.pre_entrevistas;
CREATE POLICY "pre_entrevistas: ver (municipalidad)"
  ON public.pre_entrevistas
  FOR SELECT
  TO authenticated
  USING (public.rol_actual() = 'municipalidad');

REVOKE ALL ON public.pre_entrevistas FROM public, anon, authenticated;
GRANT SELECT ON public.pre_entrevistas TO authenticated;


-- ============================================================
-- BLOQUE 4 — ¿La postulación tiene la pre-entrevista realizada?
-- La única definición de la regla para derivar: la usan derivar_postulacion
-- (BLOQUE 7) y los triggers del BLOQUE 8. Si la pre-entrevista pasa a ser
-- por postulante, este es el lugar donde cambia la condición.
-- Sin EXECUTE para los roles del cliente: solo la llaman funciones que
-- corren como dueño.
-- ============================================================

CREATE OR REPLACE FUNCTION public.postulacion_tiene_pre_entrevista_realizada(p_postulacion_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pre_entrevistas pe
    WHERE pe.postulacion_id = p_postulacion_id
      AND pe.estado = 'realizada'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.postulacion_tiene_pre_entrevista_realizada(uuid)
  FROM public, anon, authenticated;


-- ============================================================
-- BLOQUE 5 — Funciones de la oficina
--
-- Las tres bloquean la postulación con FOR UPDATE antes de tocar la
-- pre-entrevista. derivar_postulacion (040) bloquea la misma fila, así que
-- coordinar, reprogramar, registrar el resultado y derivar se ejecutan de a
-- una por postulación: una segunda pestaña espera y ve el estado nuevo.
-- Solo para postulaciones en 'recibida' o 'en_revision'.
--
-- p_nota reemplaza la nota interna (vacía → NULL). La pantalla precarga la
-- nota actual, así que mandarla sin cambios la conserva.
-- Largos máximos iguales a LARGO_MAXIMO (src/lib/validaciones.ts): lugar 500,
-- nota 2000.
-- ============================================================

-- Validaciones comunes de fecha, lugar y nota para coordinar y reprogramar.
-- Sin EXECUTE para los roles del cliente.
CREATE OR REPLACE FUNCTION public.validar_datos_pre_entrevista(
  p_fecha_hora timestamptz,
  p_lugar      text,
  p_nota       text
)
RETURNS void
LANGUAGE plpgsql STABLE SET search_path = ''
AS $$
BEGIN
  IF p_fecha_hora IS NULL THEN
    RAISE EXCEPTION 'Indicá la fecha y la hora de la pre-entrevista.';
  END IF;
  IF p_fecha_hora <= now() THEN
    RAISE EXCEPTION 'La fecha de la pre-entrevista tiene que ser posterior al momento actual.';
  END IF;
  IF NULLIF(pg_catalog.btrim(p_lugar), '') IS NULL THEN
    RAISE EXCEPTION 'Indicá el lugar de la pre-entrevista.';
  END IF;
  IF pg_catalog.length(pg_catalog.btrim(p_lugar)) > 500 THEN
    RAISE EXCEPTION 'El lugar puede tener hasta 500 caracteres.';
  END IF;
  IF pg_catalog.length(pg_catalog.btrim(COALESCE(p_nota, ''))) > 2000 THEN
    RAISE EXCEPTION 'La nota puede tener hasta 2000 caracteres.';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validar_datos_pre_entrevista(timestamptz, text, text)
  FROM public, anon, authenticated;

-- Bloquea la postulación de una pre-entrevista y la pre-entrevista, en ese
-- orden (el mismo que coordinar_pre_entrevista y derivar_postulacion), y
-- controla que la postulación siga pendiente. Devuelve el estado actual de la
-- pre-entrevista y su fecha y lugar. Sin EXECUTE para los roles del cliente.
CREATE OR REPLACE FUNCTION public.bloquear_pre_entrevista(
  p_pre_entrevista_id uuid,
  OUT o_estado     text,
  OUT o_fecha_hora timestamptz,
  OUT o_lugar      text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_postulacion_id     uuid;
  v_estado_postulacion public.estado_postulacion;
BEGIN
  -- postulacion_id no cambia (BLOQUE 2): se puede leer antes de bloquear.
  SELECT pe.postulacion_id
  INTO   v_postulacion_id
  FROM   public.pre_entrevistas pe
  WHERE  pe.id = p_pre_entrevista_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la pre-entrevista.';
  END IF;

  SELECT po.estado
  INTO   v_estado_postulacion
  FROM   public.postulaciones po
  WHERE  po.id = v_postulacion_id
  FOR UPDATE;

  IF v_estado_postulacion IS NULL OR v_estado_postulacion NOT IN ('recibida', 'en_revision') THEN
    RAISE EXCEPTION 'Solo se puede gestionar la pre-entrevista de una postulación pendiente (recibida o en revisión).';
  END IF;

  SELECT pe.estado, pe.fecha_hora, pe.lugar
  INTO   o_estado, o_fecha_hora, o_lugar
  FROM   public.pre_entrevistas pe
  WHERE  pe.id = p_pre_entrevista_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la pre-entrevista.';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bloquear_pre_entrevista(uuid)
  FROM public, anon, authenticated;

-- Coordinar: crea la pre-entrevista. Si la postulación está en 'recibida',
-- pasa a 'en_revision' en la misma transacción.
CREATE OR REPLACE FUNCTION public.coordinar_pre_entrevista(
  p_postulacion_id uuid,
  p_fecha_hora     timestamptz,
  p_lugar          text,
  p_nota           text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_usuario_id        uuid := auth.uid();
  v_estado            public.estado_postulacion;
  v_pre_entrevista_id uuid;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  PERFORM public.validar_datos_pre_entrevista(p_fecha_hora, p_lugar, p_nota);

  SELECT po.estado
  INTO   v_estado
  FROM   public.postulaciones po
  WHERE  po.id = p_postulacion_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la postulación.';
  END IF;

  IF v_estado NOT IN ('recibida', 'en_revision') THEN
    RAISE EXCEPTION 'Solo se puede coordinar la pre-entrevista de una postulación pendiente (recibida o en revisión).';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.pre_entrevistas pe
    WHERE pe.postulacion_id = p_postulacion_id
  ) THEN
    RAISE EXCEPTION 'Esta postulación ya tiene una pre-entrevista. Si necesitás cambiar la fecha o el lugar, reprogramala.';
  END IF;

  INSERT INTO public.pre_entrevistas (postulacion_id, fecha_hora, lugar, estado, nota_oficina, coordinada_por)
  VALUES (
    p_postulacion_id,
    p_fecha_hora,
    pg_catalog.btrim(p_lugar),
    'coordinada',
    NULLIF(pg_catalog.btrim(p_nota), ''),
    v_usuario_id
  )
  RETURNING id INTO v_pre_entrevista_id;

  IF v_estado = 'recibida' THEN
    UPDATE public.postulaciones po
    SET    estado       = 'en_revision',
           revisado_por = v_usuario_id,
           updated_at   = now()
    WHERE  po.id = p_postulacion_id;
  END IF;

  RETURN v_pre_entrevista_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.coordinar_pre_entrevista(uuid, timestamptz, text, text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.coordinar_pre_entrevista(uuid, timestamptz, text, text) TO authenticated;

-- Reprogramar: una coordinada con otra fecha u otro lugar, o una no_asistio
-- que vuelve a 'coordinada' con fecha nueva.
CREATE OR REPLACE FUNCTION public.reprogramar_pre_entrevista(
  p_pre_entrevista_id uuid,
  p_fecha_hora        timestamptz,
  p_lugar             text,
  p_nota              text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_actual record;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  PERFORM public.validar_datos_pre_entrevista(p_fecha_hora, p_lugar, p_nota);

  SELECT b.o_estado, b.o_fecha_hora, b.o_lugar
  INTO   v_actual
  FROM   public.bloquear_pre_entrevista(p_pre_entrevista_id) b;

  IF v_actual.o_estado = 'realizada' THEN
    RAISE EXCEPTION 'La pre-entrevista ya se realizó y no se puede reprogramar.';
  END IF;

  IF v_actual.o_estado = 'coordinada'
     AND v_actual.o_fecha_hora = p_fecha_hora
     AND v_actual.o_lugar = pg_catalog.btrim(p_lugar) THEN
    RAISE EXCEPTION 'Para reprogramar, cambiá la fecha, la hora o el lugar.';
  END IF;

  UPDATE public.pre_entrevistas pe
  SET    estado         = 'coordinada',
         fecha_hora     = p_fecha_hora,
         lugar          = pg_catalog.btrim(p_lugar),
         nota_oficina   = NULLIF(pg_catalog.btrim(p_nota), ''),
         coordinada_por = auth.uid(),
         updated_at     = now()
  WHERE  pe.id = p_pre_entrevista_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reprogramar_pre_entrevista(uuid, timestamptz, text, text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.reprogramar_pre_entrevista(uuid, timestamptz, text, text) TO authenticated;

-- Resultado: 'realizada' o 'no_asistio', solo de una coordinada y cuando la
-- fecha ya pasó.
CREATE OR REPLACE FUNCTION public.registrar_resultado_pre_entrevista(
  p_pre_entrevista_id uuid,
  p_resultado         text,
  p_nota              text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_actual record;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  IF p_resultado IS NULL OR p_resultado NOT IN ('realizada', 'no_asistio') THEN
    RAISE EXCEPTION 'El resultado de la pre-entrevista no es válido.';
  END IF;

  IF pg_catalog.length(pg_catalog.btrim(COALESCE(p_nota, ''))) > 2000 THEN
    RAISE EXCEPTION 'La nota puede tener hasta 2000 caracteres.';
  END IF;

  SELECT b.o_estado, b.o_fecha_hora, b.o_lugar
  INTO   v_actual
  FROM   public.bloquear_pre_entrevista(p_pre_entrevista_id) b;

  IF v_actual.o_estado = 'realizada' THEN
    RAISE EXCEPTION 'La pre-entrevista ya está marcada como realizada.';
  END IF;
  IF v_actual.o_estado = 'no_asistio' THEN
    RAISE EXCEPTION 'La pre-entrevista ya está marcada como «No asistió». Reprogramala para registrar un resultado nuevo.';
  END IF;

  IF v_actual.o_fecha_hora > now() THEN
    RAISE EXCEPTION 'Todavía no llegó la fecha de la pre-entrevista.';
  END IF;

  UPDATE public.pre_entrevistas pe
  SET    estado       = p_resultado,
         nota_oficina = NULLIF(pg_catalog.btrim(p_nota), ''),
         updated_at   = now()
  WHERE  pe.id = p_pre_entrevista_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_resultado_pre_entrevista(uuid, text, text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.registrar_resultado_pre_entrevista(uuid, text, text) TO authenticated;


-- ============================================================
-- BLOQUE 6 — Pre-entrevistas del postulante
-- Igual que estado_derivacion_postulante (028): filtra por las postulaciones
-- propias (auth.uid()) y nunca devuelve nota_oficina ni coordinada_por. Para
-- otro rol devuelve vacío.
-- ============================================================

CREATE OR REPLACE FUNCTION public.mis_pre_entrevistas(p_postulacion_ids uuid[])
RETURNS TABLE (
  postulacion_id uuid,
  estado         text,
  fecha_hora     timestamptz,
  lugar          text
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT
    pe.postulacion_id,
    pe.estado,
    pe.fecha_hora,
    pe.lugar
  FROM public.pre_entrevistas pe
  JOIN public.postulaciones po ON po.id = pe.postulacion_id
  JOIN public.postulantes pt   ON pt.id = po.postulante_id
  WHERE pe.postulacion_id = ANY (p_postulacion_ids)
    AND pt.usuario_id     = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mis_pre_entrevistas(uuid[]) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.mis_pre_entrevistas(uuid[]) TO authenticated;


-- ============================================================
-- BLOQUE 7 — derivar_postulacion (reemplazo de 040, misma firma y retorno)
-- Único cambio: después de controlar el estado de la postulación, exige la
-- pre-entrevista realizada. La postulación ya está bloqueada (FOR UPDATE),
-- así que la pre-entrevista no puede cambiar en el medio. Descartar una
-- postulación (descartarPostulacion) no pasa por acá y no la exige.
-- Una postulación con derivación a medias (ver 040) también necesita la
-- pre-entrevista para completarse.
-- ============================================================

CREATE OR REPLACE FUNCTION public.derivar_postulacion(
  p_postulacion_id uuid,
  p_nota           text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_usuario_id    uuid := auth.uid();
  v_estado        public.estado_postulacion;
  v_oferta_id     uuid;
  v_estado_oferta public.estado_oferta;
  v_derivacion_id uuid;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT po.estado, po.oferta_id
  INTO   v_estado, v_oferta_id
  FROM   public.postulaciones po
  WHERE  po.id = p_postulacion_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la postulación.';
  END IF;

  IF v_estado = 'derivada' THEN
    RAISE EXCEPTION 'Esta postulación ya fue derivada.';
  END IF;
  IF v_estado = 'rechazada_municipalidad' THEN
    RAISE EXCEPTION 'Esta postulación está marcada como «No seleccionado» y no se puede derivar.';
  END IF;

  IF NOT public.postulacion_tiene_pre_entrevista_realizada(p_postulacion_id) THEN
    RAISE EXCEPTION 'Antes de derivar tenés que hacer la pre-entrevista con el postulante.';
  END IF;

  SELECT o.estado
  INTO   v_estado_oferta
  FROM   public.ofertas o
  WHERE  o.id = v_oferta_id
  FOR SHARE;

  IF v_estado_oferta IS DISTINCT FROM 'activa' THEN
    RAISE EXCEPTION 'La oferta ya no está activa y no puede recibir derivaciones.';
  END IF;

  SELECT d.id
  INTO   v_derivacion_id
  FROM   public.derivaciones d
  WHERE  d.postulacion_id = p_postulacion_id;

  IF v_derivacion_id IS NULL THEN
    INSERT INTO public.derivaciones (postulacion_id, municipalidad_usuario_id, nota_municipalidad)
    VALUES (p_postulacion_id, v_usuario_id, NULLIF(pg_catalog.btrim(p_nota), ''))
    RETURNING id INTO v_derivacion_id;
  END IF;

  UPDATE public.postulaciones po
  SET    estado       = 'derivada',
         revisado_por = v_usuario_id,
         updated_at   = now()
  WHERE  po.id = p_postulacion_id;

  RETURN v_derivacion_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.derivar_postulacion(uuid, text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.derivar_postulacion(uuid, text) TO authenticated;


-- ============================================================
-- BLOQUE 8 — La regla también para las escrituras directas
-- La oficina conserva desde 004/018 el INSERT en derivaciones y el UPDATE de
-- postulaciones.estado. Sin estos triggers podría derivar sin pre-entrevista
-- salteando derivar_postulacion. Son triggers (no CHECK) porque las
-- postulaciones ya derivadas no tienen pre-entrevista y no se tocan: solo se
-- controla el paso a 'derivada' y la derivación nueva.
-- Sin rol (SQL Editor, service_role) no se controla, para correcciones
-- manuales (mismo criterio que derivaciones_limite_vacantes, 040).
-- ============================================================

CREATE OR REPLACE FUNCTION public.exigir_pre_entrevista_al_derivar_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_postulacion_id uuid;
BEGIN
  IF public.rol_actual() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'derivaciones' THEN
    v_postulacion_id := NEW.postulacion_id;
  ELSE
    v_postulacion_id := NEW.id;
  END IF;

  IF NOT public.postulacion_tiene_pre_entrevista_realizada(v_postulacion_id) THEN
    RAISE EXCEPTION 'Antes de derivar tenés que hacer la pre-entrevista con el postulante.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS postulaciones_exigir_pre_entrevista ON public.postulaciones;
CREATE TRIGGER postulaciones_exigir_pre_entrevista
  BEFORE UPDATE ON public.postulaciones
  FOR EACH ROW
  WHEN (NEW.estado = 'derivada' AND OLD.estado IS DISTINCT FROM 'derivada')
  EXECUTE FUNCTION public.exigir_pre_entrevista_al_derivar_fn();

DROP TRIGGER IF EXISTS derivaciones_exigir_pre_entrevista ON public.derivaciones;
CREATE TRIGGER derivaciones_exigir_pre_entrevista
  BEFORE INSERT ON public.derivaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.exigir_pre_entrevista_al_derivar_fn();


-- ============================================================
-- BLOQUE 9 — Avisos al postulante (mismo patrón que 041)
--   Alta (AFTER INSERT)
--     'pre_entrevista_coordinada'
--     clave pre_entrevista_coordinada:<pre_entrevista_id>
--   Reprogramación (AFTER UPDATE: queda 'coordinada' y antes no lo estaba, o
--   cambió la fecha o el lugar)
--     'pre_entrevista_reprogramada'
--     clave pre_entrevista_reprogramada:<pre_entrevista_id>:<updated_at>
--     Cada reprogramación fija updated_at = now(), así que cada una tiene su
--     aviso, aunque vuelva a una fecha y lugar anteriores.
-- Sin aviso por 'realizada' ni por 'no_asistio'. La nota interna no se
-- incluye. Sin backfill (la tabla es nueva).
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
    -- Postulante
    'postulacion_derivada',
    'entrevista',
    'seleccionado',
    'no_seleccionado_empresa',
    'no_seleccionado_oficina',
    'curso_asignado',
    'pre_entrevista_coordinada',
    'pre_entrevista_reprogramada',
    -- Empresa
    'solicitud_aprobada',
    'solicitud_rechazada',
    'oferta_aprobada',
    'oferta_rechazada',
    'candidato_derivado',
    'oferta_por_vencer',
    'oferta_vencida'
  ));

CREATE OR REPLACE FUNCTION public.pre_entrevistas_notificar_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_oferta             text;
  v_empresa            text;
  v_postulante_usuario uuid;
  v_detalle            text;
BEGIN
  BEGIN
    SELECT
      o.titulo,
      NULLIF(pg_catalog.btrim(o.empresa_nombre), ''),
      pt.usuario_id
    INTO v_oferta, v_empresa, v_postulante_usuario
    FROM public.postulaciones po
    JOIN public.ofertas o      ON o.id  = po.oferta_id
    JOIN public.postulantes pt ON pt.id = po.postulante_id
    WHERE po.id = NEW.postulacion_id;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    v_detalle := ' Fecha: ' || public.notificaciones_fecha(NEW.fecha_hora, true) || '.'
      || ' Lugar: ' || pg_catalog.btrim(NEW.lugar) || '.';

    IF TG_OP = 'INSERT' THEN
      PERFORM public.notificar_usuario(
        v_postulante_usuario,
        'pre_entrevista_coordinada',
        'Pre-entrevista coordinada',
        'La Oficina de Empleo coordinó una pre-entrevista con vos por tu postulación a «'
          || v_oferta || '»' || COALESCE(' (' || v_empresa || ')', '') || '.' || v_detalle,
        '/mis-postulaciones',
        'pre_entrevista_coordinada:' || NEW.id::text
      );
    ELSE
      PERFORM public.notificar_usuario(
        v_postulante_usuario,
        'pre_entrevista_reprogramada',
        'Pre-entrevista reprogramada',
        'La Oficina de Empleo reprogramó tu pre-entrevista por tu postulación a «'
          || v_oferta || '»' || COALESCE(' (' || v_empresa || ')', '') || '.' || v_detalle,
        '/mis-postulaciones',
        'pre_entrevista_reprogramada:' || NEW.id::text
          || ':' || public.notificaciones_marca(COALESCE(NEW.updated_at, now()))
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'pre_entrevistas_notificar_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS pre_entrevistas_notificar_alta ON public.pre_entrevistas;
CREATE TRIGGER pre_entrevistas_notificar_alta
  AFTER INSERT ON public.pre_entrevistas
  FOR EACH ROW
  WHEN (NEW.estado = 'coordinada')
  EXECUTE FUNCTION public.pre_entrevistas_notificar_fn();

DROP TRIGGER IF EXISTS pre_entrevistas_notificar_reprogramacion ON public.pre_entrevistas;
CREATE TRIGGER pre_entrevistas_notificar_reprogramacion
  AFTER UPDATE ON public.pre_entrevistas
  FOR EACH ROW
  WHEN (NEW.estado = 'coordinada'
        AND (OLD.estado IS DISTINCT FROM 'coordinada'
             OR NEW.fecha_hora IS DISTINCT FROM OLD.fecha_hora
             OR NEW.lugar IS DISTINCT FROM OLD.lugar))
  EXECUTE FUNCTION public.pre_entrevistas_notificar_fn();
