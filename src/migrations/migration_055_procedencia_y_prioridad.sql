-- ============================================================
-- Portal Municipal de Empleo — Migración 055
-- Procedencia del postulante, comprobante de domicilio de Funes verificado
-- por la oficina y nivel de prioridad
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_054_cvs_y_borrado_logico_archivos.sql ya aplicada y el
-- bucket privado 'comprobantes' creado en Storage.
-- Re-ejecutable sin errores. No borra ni modifica datos existentes: los
-- postulantes existentes quedan con localidad NULL ("sin informar", nivel 3).
-- Después de aplicarla: npm run db:tipos
-- ============================================================
--
-- Ver docs/decisiones/027-procedencia-y-prioridad.md.
--
--   BLOQUE 1  Reconocer Funes: localidad_clave() y localidad_es_funes().
--   BLOQUE 2  postulantes.localidad, es_de_funes y nivel_prioridad (las dos
--             últimas las mantiene la base) y el permiso de editar localidad.
--   BLOQUE 3  archivos_usuario: tipo 'comprobante_domicilio', tamaño y tipo
--             de archivo, columnas de verificación y un comprobante vigente
--             por usuario.
--   BLOQUE 4  Nivel de prioridad: nivel_prioridad_calculado(),
--             nivel_prioridad() y refrescar_nivel_prioridad().
--   BLOQUE 5  Triggers de postulantes: normalizar espacios, es_de_funes,
--             nivel y qué pasa con el comprobante al cambiar de localidad.
--   BLOQUE 6  Triggers del comprobante: reglas (solo Funes, transiciones de
--             la verificación) y, después, nivel y avisos.
--   BLOQUE 7  activar_archivo_usuario (054), misma firma y retorno: el
--             comprobante anterior pasa a eliminado al subir otro.
--   BLOQUE 8  revisar_comprobante_domicilio(): aprobar o rechazar (oficina).
--   BLOQUE 9  Avisos: tipos nuevos en el CHECK y en email_tipo_con_envio.
--   BLOQUE 10 Bucket 'comprobantes': privado y solo políticas de lectura.
--
-- Nivel de prioridad (columna postulantes.nivel_prioridad):
--   1  localidad Funes y comprobante vigente aprobado
--   2  localidad Funes sin comprobante, o con el comprobante pendiente o
--      rechazado
--   3  otra localidad o localidad sin informar (NULL)
--
-- Estados del comprobante (archivos_usuario, tipo 'comprobante_domicilio'):
--   vigente    eliminado_en NULL. Como mucho uno por usuario (índice único).
--              verificacion_estado 'pendiente' | 'aprobado' | 'rechazado'.
--   eliminado  reemplazado por otro o la localidad dejó de ser Funes. Lo
--              borra la purga diaria (archivos_a_purgar de 054 ya incluye
--              todo tipo de archivo eliminado; no cambia).
--
-- Cambio de localidad (BLOQUE 5):
--   sigue siendo Funes  el comprobante vigente vuelve a 'pendiente'
--   deja de ser Funes   el comprobante vigente pasa a eliminado
--
-- La empresa no ve nada de esto: no tiene ninguna política de lectura sobre
-- postulantes ni sobre archivos_usuario, y las funciones que le devuelven
-- datos de un candidato (candidato_para_empresa,
-- candidato_para_empresa_completo, derivaciones_de_oferta_empresa,
-- derivaciones_de_postulante_empresa, cv_de_*_empresa) devuelven columnas
-- fijas que no incluyen localidad, nivel ni comprobante. No se modifican. El
-- bucket 'comprobantes' no tiene política para la empresa (BLOQUE 10).
--
-- Funciones existentes que se reemplazan (CREATE OR REPLACE, misma firma y
-- retorno): activar_archivo_usuario (054) y email_tipo_con_envio (053). El
-- CHECK notificaciones_tipo_check se vuelve a crear con los tipos de 053 más
-- los nuevos. El CHECK de tipos de archivos_usuario (009) se vuelve a crear
-- con el tipo nuevo.
--
-- Errores:
--   P0001  regla de negocio; el mensaje es para el usuario.
--   42501  sin permiso (revisar un comprobante sin ser de la oficina).
-- ============================================================


-- ============================================================
-- BLOQUE 1 — Reconocer Funes
-- localidad_clave(): minúsculas, sin tildes y solo letras a-z (sin espacios,
-- guiones ni puntos). "  FÚNES ", "funes" y "F u n e s" dan 'funes'.
-- Es la misma regla que claveLocalidad() de src/lib/localidades.ts.
-- ============================================================

CREATE OR REPLACE FUNCTION public.localidad_clave(p_localidad text)
RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT pg_catalog.regexp_replace(
    pg_catalog.translate(
      pg_catalog.lower(p_localidad),
      'áàâäãåéèêëíìîïóòôöõúùûüñç',
      'aaaaaaeeeeiiiiooooouuuunc'
    ),
    '[^a-z]', '', 'g'
  )
$$;

CREATE OR REPLACE FUNCTION public.localidad_es_funes(p_localidad text)
RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT COALESCE(public.localidad_clave(p_localidad) = 'funes', false)
$$;


-- ============================================================
-- BLOQUE 2 — Columnas de postulantes
--   localidad        texto que eligió o escribió el postulante. NULL = sin
--                    informar. La aplicación la guarda normalizada
--                    (normalizarLocalidad, src/lib/localidades.ts); la base
--                    solo recorta y unifica espacios.
--   es_de_funes      la mantiene el trigger del BLOQUE 5 con
--                    localidad_es_funes(localidad). Nadie la escribe.
--   nivel_prioridad  1, 2 o 3 (ver arriba). La mantienen los triggers de los
--                    BLOQUES 5 y 6 para ordenar y filtrar sin calcular por fila.
-- ============================================================

ALTER TABLE public.postulantes
  ADD COLUMN IF NOT EXISTS localidad       text,
  ADD COLUMN IF NOT EXISTS es_de_funes     boolean  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nivel_prioridad smallint NOT NULL DEFAULT 3;

ALTER TABLE public.postulantes DROP CONSTRAINT IF EXISTS postulantes_localidad_check;
ALTER TABLE public.postulantes
  ADD CONSTRAINT postulantes_localidad_check
    CHECK (localidad IS NULL OR pg_catalog.char_length(localidad) BETWEEN 2 AND 60);

ALTER TABLE public.postulantes DROP CONSTRAINT IF EXISTS postulantes_nivel_prioridad_check;
ALTER TABLE public.postulantes
  ADD CONSTRAINT postulantes_nivel_prioridad_check
    CHECK (nivel_prioridad BETWEEN 1 AND 3);

COMMENT ON COLUMN public.postulantes.localidad IS
  'Localidad de procedencia (055). NULL: sin informar.';
COMMENT ON COLUMN public.postulantes.es_de_funes IS
  'localidad_es_funes(localidad), mantenida por trigger (055).';
COMMENT ON COLUMN public.postulantes.nivel_prioridad IS
  '1 Funes verificado, 2 Funes sin verificar, 3 otra localidad o sin informar. '
  'Mantenida por triggers (055).';

-- Lista de postulantes de la oficina filtrada por nivel (orden por fecha).
CREATE INDEX IF NOT EXISTS postulantes_nivel_prioridad_idx
  ON public.postulantes (nivel_prioridad, created_at DESC, id DESC);

-- El postulante edita su localidad con su propia sesión (RLS "postulantes:
-- editar propio perfil", 004). es_de_funes y nivel_prioridad no se otorgan.
GRANT UPDATE (localidad) ON public.postulantes TO authenticated;


-- ============================================================
-- BLOQUE 3 — Comprobante de domicilio en archivos_usuario
--
-- La verificación va en la misma fila del archivo (columnas verificacion_*):
-- cada comprobante tiene una sola revisión, el estado nace y muere con el
-- archivo (al reemplazarlo, el nuevo empieza 'pendiente') y la purga de 054
-- borra todo junto. Las columnas solo se usan en el tipo nuevo (CHECK).
-- ============================================================

-- 3a. Tipos de archivo. El CHECK en línea de 009 se llama
--     archivos_usuario_tipo_check; por si tuviera otro nombre, se quita
--     cualquier CHECK que limite tipo con una lista.
DO $$
DECLARE
  v_nombre text;
BEGIN
  FOR v_nombre IN
    SELECT c.conname
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.archivos_usuario'::regclass
      AND c.contype = 'c'
      AND pg_catalog.pg_get_constraintdef(c.oid) LIKE '%tipo = ANY%'
  LOOP
    EXECUTE pg_catalog.format('ALTER TABLE public.archivos_usuario DROP CONSTRAINT %I', v_nombre);
  END LOOP;
END;
$$;

ALTER TABLE public.archivos_usuario
  ADD CONSTRAINT archivos_usuario_tipo_check
    CHECK (tipo IN ('cv', 'avatar', 'comprobante_domicilio'));

-- 3b. Tipo y tamaño del archivo (mismo criterio que 033/054): PDF, JPG, PNG o
--     WEBP, hasta 5 MB. No hay filas de este tipo: se validan al crearse.
ALTER TABLE public.archivos_usuario DROP CONSTRAINT IF EXISTS archivos_usuario_mime_comprobante_check;
ALTER TABLE public.archivos_usuario
  ADD CONSTRAINT archivos_usuario_mime_comprobante_check
    CHECK (tipo <> 'comprobante_domicilio'
           OR (mime_type IS NOT NULL
               AND mime_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')));

ALTER TABLE public.archivos_usuario DROP CONSTRAINT IF EXISTS archivos_usuario_tamano_comprobante_check;
ALTER TABLE public.archivos_usuario
  ADD CONSTRAINT archivos_usuario_tamano_comprobante_check
    CHECK (tipo <> 'comprobante_domicilio' OR tamano BETWEEN 1 AND 5242880);

-- 3c. Verificación.
ALTER TABLE public.archivos_usuario
  ADD COLUMN IF NOT EXISTS verificacion_estado text,
  ADD COLUMN IF NOT EXISTS verificacion_motivo text,
  ADD COLUMN IF NOT EXISTS verificado_por      uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verificado_en       timestamptz;

COMMENT ON COLUMN public.archivos_usuario.verificacion_estado IS
  'Solo comprobante_domicilio (055): pendiente, aprobado o rechazado.';
COMMENT ON COLUMN public.archivos_usuario.verificacion_motivo IS
  'Motivo del rechazo (obligatorio si está rechazado). Lo ve el postulante.';
COMMENT ON COLUMN public.archivos_usuario.verificado_por IS
  'Usuario de la oficina que aprobó o rechazó el comprobante.';

ALTER TABLE public.archivos_usuario DROP CONSTRAINT IF EXISTS archivos_usuario_verificacion_estado_check;
ALTER TABLE public.archivos_usuario
  ADD CONSTRAINT archivos_usuario_verificacion_estado_check
    CHECK (verificacion_estado IS NULL
           OR verificacion_estado IN ('pendiente', 'aprobado', 'rechazado'));

-- Solo el comprobante tiene verificación, y siempre la tiene.
ALTER TABLE public.archivos_usuario DROP CONSTRAINT IF EXISTS archivos_usuario_verificacion_tipo_check;
ALTER TABLE public.archivos_usuario
  ADD CONSTRAINT archivos_usuario_verificacion_tipo_check
    CHECK ((tipo = 'comprobante_domicilio') = (verificacion_estado IS NOT NULL));

-- Motivo: obligatorio (y con texto) si está rechazado; si no, vacío.
ALTER TABLE public.archivos_usuario DROP CONSTRAINT IF EXISTS archivos_usuario_verificacion_motivo_check;
ALTER TABLE public.archivos_usuario
  ADD CONSTRAINT archivos_usuario_verificacion_motivo_check
    CHECK (CASE
             WHEN verificacion_estado = 'rechazado' THEN
               verificacion_motivo IS NOT NULL
               AND pg_catalog.char_length(pg_catalog.btrim(verificacion_motivo)) BETWEEN 1 AND 500
             ELSE verificacion_motivo IS NULL
           END);

-- Fecha y revisor: solo en un comprobante ya revisado. verificado_por puede
-- quedar NULL si se borra la cuenta de la oficina (ON DELETE SET NULL).
ALTER TABLE public.archivos_usuario DROP CONSTRAINT IF EXISTS archivos_usuario_verificacion_revision_check;
ALTER TABLE public.archivos_usuario
  ADD CONSTRAINT archivos_usuario_verificacion_revision_check
    CHECK (CASE
             WHEN verificacion_estado IN ('aprobado', 'rechazado') THEN verificado_en IS NOT NULL
             ELSE verificado_en IS NULL AND verificado_por IS NULL
           END);

-- 3d. Un comprobante vigente por usuario.
CREATE UNIQUE INDEX IF NOT EXISTS archivos_usuario_comprobante_vigente_unico
  ON public.archivos_usuario (usuario_id)
  WHERE tipo = 'comprobante_domicilio' AND eliminado_en IS NULL;

-- Contador y filtro "comprobantes por revisar" de la oficina.
CREATE INDEX IF NOT EXISTS archivos_usuario_comprobantes_pendientes_idx
  ON public.archivos_usuario (creado_en)
  WHERE tipo = 'comprobante_domicilio'
    AND eliminado_en IS NULL
    AND verificacion_estado = 'pendiente';


-- ============================================================
-- BLOQUE 4 — Nivel de prioridad
--
-- nivel_prioridad_calculado(usuario, es_de_funes): el único lugar con la
--   regla. SECURITY INVOKER: llamada por un usuario, respeta RLS (la empresa
--   no lee archivos_usuario, así que nunca ve un comprobante aprobado).
-- nivel_prioridad(postulante): el nivel de un postulante, para consultas
--   puntuales. Invoker: la empresa no lee postulantes y recibe NULL. Los
--   listados usan la columna postulantes.nivel_prioridad.
-- refrescar_nivel_prioridad(usuario): vuelve a calcular la columna. Uso
--   interno (triggers).
-- ============================================================

CREATE OR REPLACE FUNCTION public.nivel_prioridad_calculado(
  p_usuario_id  uuid,
  p_es_de_funes boolean
)
RETURNS smallint
LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT (CASE
    WHEN NOT COALESCE(p_es_de_funes, false) THEN 3
    WHEN EXISTS (
      SELECT 1
      FROM public.archivos_usuario a
      WHERE a.usuario_id = p_usuario_id
        AND a.tipo = 'comprobante_domicilio'
        AND a.eliminado_en IS NULL
        AND a.verificacion_estado = 'aprobado'
    ) THEN 1
    ELSE 2
  END)::smallint
$$;

REVOKE EXECUTE ON FUNCTION public.nivel_prioridad_calculado(uuid, boolean) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.nivel_prioridad_calculado(uuid, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.nivel_prioridad(p_postulante_id uuid)
RETURNS smallint
LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT public.nivel_prioridad_calculado(p.usuario_id, p.es_de_funes)
  FROM public.postulantes p
  WHERE p.id = p_postulante_id
$$;

REVOKE EXECUTE ON FUNCTION public.nivel_prioridad(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.nivel_prioridad(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.refrescar_nivel_prioridad(p_usuario_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.postulantes p
  SET    nivel_prioridad = public.nivel_prioridad_calculado(p.usuario_id, p.es_de_funes)
  WHERE  p.usuario_id = p_usuario_id
    AND  p.nivel_prioridad IS DISTINCT FROM
         public.nivel_prioridad_calculado(p.usuario_id, p.es_de_funes);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refrescar_nivel_prioridad(uuid) FROM public, anon, authenticated;


-- ============================================================
-- BLOQUE 5 — Triggers de postulantes
--
-- BEFORE INSERT OR UPDATE (postulantes_procedencia):
--   - localidad: recorta y deja un solo espacio entre palabras; vacía → NULL.
--   - es_de_funes: siempre localidad_es_funes(localidad), aunque alguien
--     intente escribirla.
--   - nivel_prioridad: siempre calculado (tampoco se puede escribir). Si
--     cambió la localidad, el comprobante se reinicia en el AFTER, así que el
--     nivel es 2 (Funes) o 3.
-- AFTER UPDATE OF localidad (postulantes_procedencia_cambio), cuando cambió:
--   - sigue siendo Funes: el comprobante vigente vuelve a 'pendiente';
--   - dejó de ser Funes: el comprobante vigente pasa a eliminado.
--   Los triggers del comprobante (BLOQUE 6) recalculan el nivel y avisan.
-- ============================================================

CREATE OR REPLACE FUNCTION public.postulantes_procedencia_fn()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  NEW.localidad := NULLIF(
    pg_catalog.btrim(pg_catalog.regexp_replace(NEW.localidad, '\s+', ' ', 'g')),
    ''
  );
  NEW.es_de_funes := public.localidad_es_funes(NEW.localidad);

  IF TG_OP = 'UPDATE' AND NEW.localidad IS DISTINCT FROM OLD.localidad THEN
    NEW.nivel_prioridad := CASE WHEN NEW.es_de_funes THEN 2 ELSE 3 END;
  ELSE
    NEW.nivel_prioridad := public.nivel_prioridad_calculado(NEW.usuario_id, NEW.es_de_funes);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.postulantes_procedencia_fn() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS postulantes_procedencia ON public.postulantes;
CREATE TRIGGER postulantes_procedencia
  BEFORE INSERT OR UPDATE ON public.postulantes
  FOR EACH ROW EXECUTE FUNCTION public.postulantes_procedencia_fn();

CREATE OR REPLACE FUNCTION public.postulantes_procedencia_cambio_fn()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.es_de_funes THEN
    UPDATE public.archivos_usuario a
    SET    verificacion_estado = 'pendiente'
    WHERE  a.usuario_id = NEW.usuario_id
      AND  a.tipo = 'comprobante_domicilio'
      AND  a.eliminado_en IS NULL
      AND  a.verificacion_estado <> 'pendiente';
  ELSE
    UPDATE public.archivos_usuario a
    SET    eliminado_en = now()
    WHERE  a.usuario_id = NEW.usuario_id
      AND  a.tipo = 'comprobante_domicilio'
      AND  a.eliminado_en IS NULL;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.postulantes_procedencia_cambio_fn() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS postulantes_procedencia_cambio ON public.postulantes;
CREATE TRIGGER postulantes_procedencia_cambio
  AFTER UPDATE OF localidad ON public.postulantes
  FOR EACH ROW
  WHEN (OLD.localidad IS DISTINCT FROM NEW.localidad)
  EXECUTE FUNCTION public.postulantes_procedencia_cambio_fn();


-- ============================================================
-- BLOQUE 6 — Triggers del comprobante
--
-- BEFORE INSERT OR UPDATE (archivos_usuario_verificacion). Se llama así para
-- correr después de archivos_usuario_estado (054), que ordena activo y
-- eliminado_en: los BEFORE corren por orden alfabético.
--   Otros tipos: sin columnas de verificación.
--   Alta: siempre 'pendiente', sin revisión.
--   Vigente (alta, restauración o cambio de usuario): el postulante tiene que
--     ser de Funes. Se bloquea su fila (FOR SHARE): si al mismo tiempo cambia
--     de localidad, uno espera al otro y el AFTER del cambio ve el
--     comprobante nuevo (lo reinicia o lo elimina).
--   Revisión: solo de 'pendiente' a 'aprobado' o 'rechazado' y solo si está
--     vigente. Volver a 'pendiente' (cambio de localidad) borra la revisión.
--
-- AFTER INSERT OR UPDATE (archivos_usuario_verificacion_avisos):
--   - recalcula postulantes.nivel_prioridad (fuera del bloque de avisos: si
--     falla, falla la acción);
--   - avisos, que nunca hacen fallar la acción (EXCEPTION + WARNING, 041):
--       oficina     comprobante_pendiente  al subir uno o al volver a
--                                          'pendiente'. Link a la ficha.
--       postulante  comprobante_aprobado   con email (BLOQUE 9).
--       postulante  comprobante_rechazado  con motivo y email; link al perfil.
-- El borrado de filas (purga) no se toca: solo borra comprobantes ya
-- eliminados, que no cuentan para el nivel.
-- ============================================================

CREATE OR REPLACE FUNCTION public.archivos_usuario_verificacion_fn()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.tipo <> 'comprobante_domicilio' THEN
    NEW.verificacion_estado := NULL;
    NEW.verificacion_motivo := NULL;
    NEW.verificado_por      := NULL;
    NEW.verificado_en       := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.verificacion_estado := 'pendiente';
  END IF;

  IF NEW.eliminado_en IS NULL
     AND (TG_OP = 'INSERT'
          OR OLD.eliminado_en IS NOT NULL
          OR OLD.tipo IS DISTINCT FROM NEW.tipo
          OR OLD.usuario_id IS DISTINCT FROM NEW.usuario_id) THEN
    PERFORM 1
    FROM public.postulantes p
    WHERE p.usuario_id = NEW.usuario_id
      AND p.es_de_funes
    FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Solo podés subir un comprobante de domicilio si tu localidad es Funes.';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.verificacion_estado IN ('aprobado', 'rechazado')
     AND NEW.verificacion_estado IS DISTINCT FROM OLD.verificacion_estado THEN
    IF OLD.verificacion_estado IS DISTINCT FROM 'pendiente' THEN
      RAISE EXCEPTION 'Este comprobante ya fue revisado. Actualizá la página para ver su estado.';
    END IF;
    IF NEW.eliminado_en IS NOT NULL THEN
      RAISE EXCEPTION 'El postulante reemplazó este comprobante o cambió de localidad. Actualizá la página.';
    END IF;
  END IF;

  IF NEW.verificacion_estado = 'pendiente' THEN
    NEW.verificacion_motivo := NULL;
    NEW.verificado_por      := NULL;
    NEW.verificado_en       := NULL;
  ELSIF NEW.verificacion_estado = 'aprobado' THEN
    NEW.verificacion_motivo := NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.archivos_usuario_verificacion_fn() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS archivos_usuario_verificacion ON public.archivos_usuario;
CREATE TRIGGER archivos_usuario_verificacion
  BEFORE INSERT OR UPDATE ON public.archivos_usuario
  FOR EACH ROW EXECUTE FUNCTION public.archivos_usuario_verificacion_fn();

CREATE OR REPLACE FUNCTION public.archivos_usuario_verificacion_avisos_fn()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_postulante_id uuid;
  v_nombre        text;
  v_motivo        text;
  v_vuelve        boolean;
BEGIN
  PERFORM public.refrescar_nivel_prioridad(NEW.usuario_id);
  IF TG_OP = 'UPDATE' AND OLD.usuario_id IS DISTINCT FROM NEW.usuario_id THEN
    PERFORM public.refrescar_nivel_prioridad(OLD.usuario_id);
  END IF;

  IF NEW.eliminado_en IS NOT NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    IF NEW.verificacion_estado = 'pendiente'
       AND (TG_OP = 'INSERT'
            OR OLD.verificacion_estado IS DISTINCT FROM 'pendiente'
            OR OLD.eliminado_en IS NOT NULL) THEN
      SELECT
        p.id,
        COALESCE(NULLIF(pg_catalog.btrim(u.nombre || ' ' || u.apellido), ''), 'Un postulante')
      INTO v_postulante_id, v_nombre
      FROM public.postulantes p
      JOIN public.usuarios u ON u.id = p.usuario_id
      WHERE p.usuario_id = NEW.usuario_id;

      IF FOUND THEN
        v_vuelve := TG_OP = 'UPDATE' AND OLD.eliminado_en IS NULL;
        PERFORM public.notificar_oficina(
          'comprobante_pendiente',
          'Comprobante de domicilio por revisar',
          CASE
            WHEN v_vuelve THEN
              v_nombre || ' cambió su localidad y su comprobante de domicilio volvió a revisión.'
            ELSE
              v_nombre || ' subió un comprobante de domicilio en Funes para revisar.'
          END,
          '/admin/postulantes/' || v_postulante_id::text,
          'comprobante_pendiente:' || NEW.id::text || ':'
            || public.notificaciones_marca(pg_catalog.clock_timestamp())
        );
      END IF;

    ELSIF TG_OP = 'UPDATE'
          AND OLD.verificacion_estado = 'pendiente'
          AND NEW.verificacion_estado = 'aprobado' THEN
      PERFORM public.notificar_usuario(
        NEW.usuario_id,
        'comprobante_aprobado',
        'Domicilio verificado',
        'Verificamos tu domicilio en Funes.',
        '/perfil',
        'comprobante_aprobado:' || NEW.id::text || ':'
          || public.notificaciones_marca(NEW.verificado_en)
      );

    ELSIF TG_OP = 'UPDATE'
          AND OLD.verificacion_estado = 'pendiente'
          AND NEW.verificacion_estado = 'rechazado' THEN
      v_motivo := pg_catalog.rtrim(pg_catalog.btrim(NEW.verificacion_motivo), '.');
      PERFORM public.notificar_usuario(
        NEW.usuario_id,
        'comprobante_rechazado',
        'Comprobante de domicilio rechazado',
        'Tu comprobante de domicilio no es válido: ' || v_motivo
          || '. Podés subir otro desde tu perfil.',
        '/perfil',
        'comprobante_rechazado:' || NEW.id::text || ':'
          || public.notificaciones_marca(NEW.verificado_en)
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'archivos_usuario_verificacion_avisos_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.archivos_usuario_verificacion_avisos_fn() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS archivos_usuario_verificacion_avisos ON public.archivos_usuario;
CREATE TRIGGER archivos_usuario_verificacion_avisos
  AFTER INSERT OR UPDATE ON public.archivos_usuario
  FOR EACH ROW
  WHEN (NEW.tipo = 'comprobante_domicilio')
  EXECUTE FUNCTION public.archivos_usuario_verificacion_avisos_fn();


-- ============================================================
-- BLOQUE 7 — activar_archivo_usuario (misma firma y retorno que 054)
-- Foto y comprobante: el vigente pasa a eliminado y se inserta el nuevo.
-- CV: se agrega uno más (límite en el trigger de 054).
-- El comprobante solo se acepta si el postulante es de Funes (BLOQUE 6).
-- ============================================================

CREATE OR REPLACE FUNCTION public.activar_archivo_usuario(
  p_usuario_id      uuid,
  p_tipo            text,
  p_ruta            text,
  p_nombre_original text,
  p_tamano          bigint,
  p_mime_type       text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM 1
  FROM public.usuarios u
  WHERE u.id = p_usuario_id
  FOR NO KEY UPDATE;

  IF p_tipo IN ('avatar', 'comprobante_domicilio') THEN
    UPDATE public.archivos_usuario
    SET    eliminado_en = now()
    WHERE  usuario_id   = p_usuario_id
      AND  tipo         = p_tipo
      AND  eliminado_en IS NULL;
  END IF;

  INSERT INTO public.archivos_usuario
    (usuario_id, tipo, ruta, nombre_original, tamano, mime_type)
  VALUES
    (p_usuario_id, p_tipo, p_ruta, p_nombre_original, p_tamano, p_mime_type);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.activar_archivo_usuario(uuid, text, text, text, bigint, text)
  FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.activar_archivo_usuario(uuid, text, text, text, bigint, text)
  TO service_role;


-- ============================================================
-- BLOQUE 8 — revisar_comprobante_domicilio(p_archivo_id, p_aprobar, p_motivo)
-- Solo la oficina (rol_actual() = 'municipalidad', que ya excluye cuentas
-- desactivadas, 050). Rechazar exige motivo (hasta 500 caracteres). Solo un
-- comprobante vigente y pendiente; la fila queda bloqueada (FOR UPDATE)
-- mientras se revisa, así dos revisiones simultáneas no se pisan y un cambio
-- de localidad al mismo tiempo espera a que termine.
-- ============================================================

CREATE OR REPLACE FUNCTION public.revisar_comprobante_domicilio(
  p_archivo_id uuid,
  p_aprobar    boolean,
  p_motivo     text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_motivo    text := NULLIF(pg_catalog.btrim(p_motivo), '');
  v_estado    text;
  v_eliminado timestamptz;
BEGIN
  IF public.rol_actual() IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'Solo la Oficina de Empleo puede revisar comprobantes de domicilio.'
      USING ERRCODE = '42501';
  END IF;

  IF p_aprobar IS NULL THEN
    RAISE EXCEPTION 'Indicá si el comprobante se aprueba o se rechaza.';
  END IF;

  IF NOT p_aprobar THEN
    IF v_motivo IS NULL THEN
      RAISE EXCEPTION 'Indicá el motivo del rechazo.';
    END IF;
    IF pg_catalog.char_length(v_motivo) > 500 THEN
      RAISE EXCEPTION 'El motivo puede tener hasta 500 caracteres.';
    END IF;
  END IF;

  SELECT a.verificacion_estado, a.eliminado_en
  INTO   v_estado, v_eliminado
  FROM   public.archivos_usuario a
  WHERE  a.id = p_archivo_id
    AND  a.tipo = 'comprobante_domicilio'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El comprobante no existe.';
  END IF;
  IF v_eliminado IS NOT NULL THEN
    RAISE EXCEPTION 'El postulante reemplazó este comprobante o cambió de localidad. Actualizá la página.';
  END IF;
  IF v_estado <> 'pendiente' THEN
    RAISE EXCEPTION 'Este comprobante ya fue revisado. Actualizá la página para ver su estado.';
  END IF;

  UPDATE public.archivos_usuario
  SET    verificacion_estado = CASE WHEN p_aprobar THEN 'aprobado' ELSE 'rechazado' END,
         verificacion_motivo = CASE WHEN p_aprobar THEN NULL ELSE v_motivo END,
         verificado_por      = auth.uid(),
         verificado_en       = now()
  WHERE  id = p_archivo_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.revisar_comprobante_domicilio(uuid, boolean, text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.revisar_comprobante_domicilio(uuid, boolean, text) TO authenticated;


-- ============================================================
-- BLOQUE 9 — Avisos
-- 9a. CHECK de tipos: el vigente de 053 más
--       Oficina     'comprobante_pendiente'  sin email
--       Postulante  'comprobante_aprobado'   con email
--                   'comprobante_rechazado'  con email
-- 9b. email_tipo_con_envio (053) más los dos del postulante.
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
    'postulacion_retirada',
    'comprobante_pendiente',
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
    'comprobante_aprobado',
    'comprobante_rechazado',
    -- Empresa
    'solicitud_aprobada',
    'solicitud_rechazada',
    'oferta_aprobada',
    'oferta_rechazada',
    'candidato_derivado',
    'oferta_por_vencer',
    'oferta_vencida',
    'candidato_retirado'
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
    'comprobante_aprobado',
    'comprobante_rechazado',
    -- Empresa
    'solicitud_aprobada',
    'solicitud_rechazada',
    'oferta_aprobada',
    'oferta_rechazada',
    'candidato_derivado',
    'oferta_por_vencer',
    'oferta_vencida',
    'candidato_retirado',
    -- Oficina
    'empresa_pendiente',
    'oferta_pendiente',
    'contratacion'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.email_tipo_con_envio(text)
  FROM public, anon, authenticated;


-- ============================================================
-- BLOQUE 10 — Bucket 'comprobantes'
--
-- El bucket se creó a mano como privado. Si no existe se crea privado; si
-- existe y es público, la migración se detiene: un comprobante es un dato
-- personal y no puede tener URL pública.
--
-- Solo políticas de lectura (SELECT). Las subidas y borrados van por el
-- servidor con supabaseAdmin (src/lib/comprobantes.ts y la purga diaria),
-- como CVs y fotos desde 054. Nadie más lee: la empresa no tiene política.
--   postulante  su comprobante vigente (carpeta propia y fila no eliminada)
--   oficina     todos, también los eliminados hasta la purga
-- ============================================================

DO $$
DECLARE
  v_publico boolean;
BEGIN
  SELECT b.public INTO v_publico FROM storage.buckets b WHERE b.id = 'comprobantes';
  IF NOT FOUND THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('comprobantes', 'comprobantes', false);
    RAISE NOTICE 'Se creó el bucket privado ''comprobantes''.';
  ELSIF v_publico THEN
    RAISE EXCEPTION 'El bucket ''comprobantes'' es público. Hacelo privado en Storage y volvé a ejecutar la migración.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.postulante_puede_ver_comprobante(p_ruta text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.archivos_usuario a
    WHERE a.ruta = p_ruta
      AND a.usuario_id = auth.uid()
      AND a.tipo = 'comprobante_domicilio'
      AND a.eliminado_en IS NULL
  )
$$;

REVOKE EXECUTE ON FUNCTION public.postulante_puede_ver_comprobante(text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.postulante_puede_ver_comprobante(text) TO authenticated;

DROP POLICY IF EXISTS "comprobantes: postulante lee el suyo" ON storage.objects;
CREATE POLICY "comprobantes: postulante lee el suyo"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'comprobantes'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.postulante_puede_ver_comprobante(name)
  );

DROP POLICY IF EXISTS "comprobantes: municipalidad lee todos" ON storage.objects;
CREATE POLICY "comprobantes: municipalidad lee todos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'comprobantes' AND public.rol_actual() = 'municipalidad');

-- archivos_usuario no necesita políticas nuevas: "usuario lee sus archivos
-- activos" (054) ya deja al postulante leer su comprobante vigente (con el
-- estado y el motivo) y "archivos_usuario: municipalidad lee todos" (018) a
-- la oficina. La empresa no tiene política sobre esta tabla.


-- ============================================================
-- ROLLBACK (comentado). Ejecutar a mano solo si hace falta volver atrás.
-- Antes, borrar de Storage los archivos del bucket 'comprobantes' (o dejar
-- que la purga los borre marcándolos eliminados): las filas de tipo
-- 'comprobante_domicilio' tienen que desaparecer para volver a crear el CHECK
-- de tipos de 009.
-- activar_archivo_usuario vuelve a la versión de 054 (copiarla del BLOQUE 4
-- de esa migración) y email_tipo_con_envio y el CHECK de notificaciones a
-- los de 053 (BLOQUE 5); para el CHECK, antes borrar los avisos de los tipos
-- nuevos.
-- ============================================================
--
-- DROP POLICY IF EXISTS "comprobantes: municipalidad lee todos" ON storage.objects;
-- DROP POLICY IF EXISTS "comprobantes: postulante lee el suyo"  ON storage.objects;
-- DROP FUNCTION IF EXISTS public.postulante_puede_ver_comprobante(text);
--
-- DELETE FROM public.notificaciones
-- WHERE tipo IN ('comprobante_pendiente', 'comprobante_aprobado', 'comprobante_rechazado');
-- -- (aquí: CHECK notificaciones_tipo_check y email_tipo_con_envio de 053)
--
-- DROP FUNCTION IF EXISTS public.revisar_comprobante_domicilio(uuid, boolean, text);
-- -- (aquí: activar_archivo_usuario de 054)
--
-- DROP TRIGGER IF EXISTS archivos_usuario_verificacion_avisos ON public.archivos_usuario;
-- DROP FUNCTION IF EXISTS public.archivos_usuario_verificacion_avisos_fn();
-- DROP TRIGGER IF EXISTS archivos_usuario_verificacion ON public.archivos_usuario;
-- DROP FUNCTION IF EXISTS public.archivos_usuario_verificacion_fn();
--
-- DROP TRIGGER IF EXISTS postulantes_procedencia_cambio ON public.postulantes;
-- DROP FUNCTION IF EXISTS public.postulantes_procedencia_cambio_fn();
-- DROP TRIGGER IF EXISTS postulantes_procedencia ON public.postulantes;
-- DROP FUNCTION IF EXISTS public.postulantes_procedencia_fn();
--
-- DROP FUNCTION IF EXISTS public.refrescar_nivel_prioridad(uuid);
-- DROP FUNCTION IF EXISTS public.nivel_prioridad(uuid);
-- DROP FUNCTION IF EXISTS public.nivel_prioridad_calculado(uuid, boolean);
--
-- DELETE FROM public.archivos_usuario WHERE tipo = 'comprobante_domicilio';
-- DROP INDEX IF EXISTS public.archivos_usuario_comprobantes_pendientes_idx;
-- DROP INDEX IF EXISTS public.archivos_usuario_comprobante_vigente_unico;
-- ALTER TABLE public.archivos_usuario DROP CONSTRAINT IF EXISTS archivos_usuario_verificacion_revision_check;
-- ALTER TABLE public.archivos_usuario DROP CONSTRAINT IF EXISTS archivos_usuario_verificacion_motivo_check;
-- ALTER TABLE public.archivos_usuario DROP CONSTRAINT IF EXISTS archivos_usuario_verificacion_tipo_check;
-- ALTER TABLE public.archivos_usuario DROP CONSTRAINT IF EXISTS archivos_usuario_verificacion_estado_check;
-- ALTER TABLE public.archivos_usuario
--   DROP COLUMN IF EXISTS verificado_en,
--   DROP COLUMN IF EXISTS verificado_por,
--   DROP COLUMN IF EXISTS verificacion_motivo,
--   DROP COLUMN IF EXISTS verificacion_estado;
-- ALTER TABLE public.archivos_usuario DROP CONSTRAINT IF EXISTS archivos_usuario_tamano_comprobante_check;
-- ALTER TABLE public.archivos_usuario DROP CONSTRAINT IF EXISTS archivos_usuario_mime_comprobante_check;
-- ALTER TABLE public.archivos_usuario DROP CONSTRAINT IF EXISTS archivos_usuario_tipo_check;
-- ALTER TABLE public.archivos_usuario
--   ADD CONSTRAINT archivos_usuario_tipo_check CHECK (tipo IN ('cv', 'avatar'));
--
-- REVOKE UPDATE (localidad) ON public.postulantes FROM authenticated;
-- DROP INDEX IF EXISTS public.postulantes_nivel_prioridad_idx;
-- ALTER TABLE public.postulantes DROP CONSTRAINT IF EXISTS postulantes_nivel_prioridad_check;
-- ALTER TABLE public.postulantes DROP CONSTRAINT IF EXISTS postulantes_localidad_check;
-- ALTER TABLE public.postulantes
--   DROP COLUMN IF EXISTS nivel_prioridad,
--   DROP COLUMN IF EXISTS es_de_funes,
--   DROP COLUMN IF EXISTS localidad;
--
-- DROP FUNCTION IF EXISTS public.localidad_es_funes(text);
-- DROP FUNCTION IF EXISTS public.localidad_clave(text);
