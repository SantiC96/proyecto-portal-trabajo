-- ============================================================
-- Portal Municipal de Empleo — Migración 054
-- Hasta 5 CVs por postulante, CV elegido al postularse y borrado lógico de
-- CVs y fotos con purga diaria de Storage
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_053_retiro_postulacion.sql ya aplicada.
-- Re-ejecutable sin errores. No borra ningún archivo de Storage ni ninguna
-- fila: solo la purga diaria (/api/mantenimiento/purgar) borra archivos.
-- Desplegar el código enseguida después de aplicarla (ver "Despliegue").
-- Después de aplicarla: npm run db:tipos
-- ============================================================
--
-- Ver docs/decisiones/026-cvs-y-borrado-logico-de-archivos.md.
--
--   BLOQUE 1  archivos_usuario.eliminado_en (borrado lógico) y constantes
--             cvs_maximo() = 5 y archivos_dias_purga() = 30.
--   BLOQUE 2  Datos existentes: todo archivo inactivo (CVs y fotos
--             reemplazados o quitados antes de esta migración) pasa a
--             eliminado con fecha de hoy. El CV activo de cada postulante
--             queda disponible: nadie queda con más de un CV disponible.
--   BLOQUE 3  activo y eliminado_en siempre de acuerdo (CHECK + trigger) y
--             el máximo de 5 CVs disponibles, con bloqueo (trigger).
--             El índice "un activo por usuario y tipo" queda solo para fotos.
--   BLOQUE 4  activar_archivo_usuario (033/040), misma firma y retorno.
--   BLOQUE 5  postulaciones.cv_archivo_id: el CV elegido al postularse,
--             validado por trigger; grant de INSERT de la columna.
--   BLOQUE 6  "En curso" y el CV de una postulación (elegido o respaldo).
--   BLOQUE 7  Permisos de lectura: archivos_usuario (postulante), bucket
--             'cvs' (postulante y empresa) y funciones de la empresa
--             (empresa_puede_ver_cv, candidato_para_empresa,
--             candidato_para_empresa_completo; misma firma y retorno) y
--             las nuevas cv_de_derivacion_empresa, cv_de_candidato_empresa.
--   BLOQUE 8  cvs_de_mis_postulaciones: con qué CV se postuló el postulante.
--   BLOQUE 9  Purga: archivos_a_purgar() y confirmar_archivos_purgados()
--             (solo service_role).
--   BLOQUE 10 Se quitan las políticas de escritura de los buckets 'cvs' y
--             'avatares' (008): todo se sube y se borra desde el servidor.
--
-- Estados de un archivo:
--   CV disponible   tipo 'cv', eliminado_en NULL (activo = true). Aparece en
--                   la lista del postulante; como mucho cvs_maximo().
--   CV eliminado    eliminado_en con fecha (activo = false). El postulante
--                   no lo ve; la oficina y la empresa sí mientras esté
--                   asociado a una postulación en curso.
--   Foto activa     tipo 'avatar', eliminado_en NULL: la que se muestra
--                   (una por usuario, índice parcial).
--   Foto eliminada  reemplazada o quitada: eliminado_en con fecha.
--   activo se conserva (lo leen consultas y políticas existentes) y siempre
--   vale eliminado_en IS NULL: lo garantizan el CHECK y el trigger del
--   BLOQUE 3, que además traduce las escrituras viejas (activo = false) a
--   eliminado_en = now().
--
-- Postulación "en curso" (BLOQUE 6, postulacion_en_curso):
--   recibida, en_revision                        en curso
--   derivada con derivación pendiente / en_proceso (o sin derivación)
--                                                en curso
--   derivada con derivación contratado, rechazado, oferta_retirada o
--   retirada_postulante; rechazada_municipalidad; oferta_retirada;
--   retirada_postulante                          cerrada
--
-- CV de una postulación (BLOQUE 6, cv_de_postulacion): el elegido
-- (cv_archivo_id) o, si es NULL (postulaciones anteriores a esta migración o
-- cuyo CV ya se purgó), el CV disponible más reciente del postulante, que es
-- lo que se mostraba hasta ahora.
--
-- Funciones existentes que se reemplazan (CREATE OR REPLACE, misma firma y
-- retorno): activar_archivo_usuario (040), empresa_puede_ver_cv (028),
-- candidato_para_empresa y candidato_para_empresa_completo (046).
-- Políticas que se reemplazan (mismo nombre): "usuario lee sus archivos
-- activos" (009) y "postulante puede leer su cv" (008). Políticas que se
-- quitan: las seis de INSERT, UPDATE y DELETE de los buckets de 008
-- (BLOQUE 10).
-- Funciones que NO cambian y por qué: empresa_puede_ver_avatar (029) y las
-- consultas de fotos filtran activo = true, que sigue siendo "la foto que se
-- muestra"; la política "cvs: empresa lee candidatos derivados o guardados"
-- (028) llama a empresa_puede_ver_cv, que es la que cambia; "cvs:
-- municipalidad lee todos" (018) no cambia: la oficina ve todo CV que exista
-- en Storage, también los eliminados hasta que se purgan.
--
-- Constraints de 033 (tamaño y tipo, NOT VALID): el BLOQUE 2 marca como
-- eliminadas filas viejas que pueden no cumplirlos (filas inactivas con
-- tamano 0 o sin mime_type). Un UPDATE vuelve a evaluar los CHECK aunque
-- sean NOT VALID, así que se quitan antes, se marcan las filas y se vuelven
-- a crear igual que en 033 (NOT VALID y se intenta validarlos).
--
-- Despliegue: el código anterior sigue funcionando mientras se despliega el
-- nuevo (subir un CV agrega uno más en lugar de reemplazar, eliminar el CV o
-- la foto los marca eliminados por el trigger y postularse guarda el CV más
-- reciente). Solo un postulante que llegue a tener dos CVs disponibles antes
-- del despliegue vería un error en su perfil viejo, porque esa pantalla
-- esperaba uno solo.
--
-- Errores:
--   P0001  regla de negocio; el mensaje es para el usuario.
-- ============================================================


-- ============================================================
-- BLOQUE 1 — Columna eliminado_en y constantes
-- ============================================================

ALTER TABLE public.archivos_usuario
  ADD COLUMN IF NOT EXISTS eliminado_en timestamptz;

COMMENT ON COLUMN public.archivos_usuario.eliminado_en IS
  'Borrado lógico (054). NULL: CV disponible o foto activa. Con fecha: '
  'eliminado; la purga diaria borra el archivo y la fila después de '
  'archivos_dias_purga() días, salvo un CV de una postulación en curso.';

CREATE OR REPLACE FUNCTION public.cvs_maximo()
RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$ SELECT 5 $$;

CREATE OR REPLACE FUNCTION public.archivos_dias_purga()
RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$ SELECT 30 $$;

CREATE INDEX IF NOT EXISTS archivos_usuario_disponibles_idx
  ON public.archivos_usuario (usuario_id, tipo, creado_en DESC)
  WHERE eliminado_en IS NULL;

CREATE INDEX IF NOT EXISTS archivos_usuario_eliminados_idx
  ON public.archivos_usuario (eliminado_en)
  WHERE eliminado_en IS NOT NULL;


-- ============================================================
-- BLOQUE 2 — Datos existentes
-- Diagnóstico (solo lectura) y marca de los archivos inactivos.
-- ============================================================

DO $$
DECLARE
  v_cvs     int;
  v_fotos   int;
BEGIN
  SELECT
    pg_catalog.count(*) FILTER (WHERE a.tipo = 'cv'),
    pg_catalog.count(*) FILTER (WHERE a.tipo = 'avatar')
  INTO v_cvs, v_fotos
  FROM public.archivos_usuario a
  WHERE a.activo = false
    AND a.eliminado_en IS NULL;

  RAISE NOTICE
    'Se marcan como eliminados % CV(s) y % foto(s) inactivos de antes de esta '
    'migración. La purga los borra de Storage dentro de % días.',
    v_cvs, v_fotos, public.archivos_dias_purga();
END;
$$;

ALTER TABLE public.archivos_usuario DROP CONSTRAINT IF EXISTS archivos_usuario_mime_cv_check;
ALTER TABLE public.archivos_usuario DROP CONSTRAINT IF EXISTS archivos_usuario_mime_avatar_check;
ALTER TABLE public.archivos_usuario DROP CONSTRAINT IF EXISTS archivos_usuario_tamano_cv_check;
ALTER TABLE public.archivos_usuario DROP CONSTRAINT IF EXISTS archivos_usuario_tamano_avatar_check;

-- Fecha de hoy y no desactivado_en: los 30 días de margen corren desde que
-- se aplica la migración, no desde que se reemplazó el archivo.
UPDATE public.archivos_usuario a
SET    eliminado_en   = now(),
       desactivado_en = COALESCE(a.desactivado_en, now())
WHERE  a.activo = false
  AND  a.eliminado_en IS NULL;

ALTER TABLE public.archivos_usuario
  ADD CONSTRAINT archivos_usuario_mime_cv_check
    CHECK (tipo <> 'cv' OR (mime_type IS NOT NULL AND mime_type = 'application/pdf'))
    NOT VALID;
ALTER TABLE public.archivos_usuario
  ADD CONSTRAINT archivos_usuario_mime_avatar_check
    CHECK (tipo <> 'avatar' OR (mime_type IS NOT NULL AND mime_type IN ('image/jpeg', 'image/png', 'image/webp')))
    NOT VALID;
ALTER TABLE public.archivos_usuario
  ADD CONSTRAINT archivos_usuario_tamano_cv_check
    CHECK (tipo <> 'cv' OR tamano BETWEEN 1 AND 5242880)
    NOT VALID;
ALTER TABLE public.archivos_usuario
  ADD CONSTRAINT archivos_usuario_tamano_avatar_check
    CHECK (tipo <> 'avatar' OR tamano BETWEEN 1 AND 2097152)
    NOT VALID;

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.archivos_usuario VALIDATE CONSTRAINT archivos_usuario_mime_cv_check;
    ALTER TABLE public.archivos_usuario VALIDATE CONSTRAINT archivos_usuario_mime_avatar_check;
    ALTER TABLE public.archivos_usuario VALIDATE CONSTRAINT archivos_usuario_tamano_cv_check;
    ALTER TABLE public.archivos_usuario VALIDATE CONSTRAINT archivos_usuario_tamano_avatar_check;
    RAISE NOTICE 'Constraints de tamaño y tipo validados.';
  EXCEPTION WHEN OTHERS THEN
    -- Mismo caso que 033: filas viejas ya eliminadas con datos incompletos.
    -- Nadie las modifica (la purga solo las borra).
    RAISE NOTICE
      'Constraints de tamaño y tipo quedan NOT VALID por filas eliminadas con '
      'datos viejos (%). Es seguro: la aplicación no modifica filas eliminadas.',
      SQLERRM;
  END;
END;
$$;


-- ============================================================
-- BLOQUE 3 — Coherencia de estados y máximo de CVs
-- ============================================================

ALTER TABLE public.archivos_usuario
  DROP CONSTRAINT IF EXISTS archivos_usuario_activo_eliminado_check;
ALTER TABLE public.archivos_usuario
  ADD CONSTRAINT archivos_usuario_activo_eliminado_check
    CHECK (activo = (eliminado_en IS NULL));

-- Un activo por usuario solo para fotos: los CVs disponibles son varios.
DROP INDEX IF EXISTS public.archivos_usuario_activo_unico;
CREATE UNIQUE INDEX IF NOT EXISTS archivos_usuario_avatar_activo_unico
  ON public.archivos_usuario (usuario_id)
  WHERE activo = true AND tipo = 'avatar';

-- BEFORE INSERT OR UPDATE. Dos cosas:
--  1. activo y eliminado_en de acuerdo. Una escritura vieja que solo pone
--     activo = false (código anterior al despliegue) se toma como eliminar;
--     volver eliminado_en a NULL (a mano) restaura el archivo.
--  2. Máximo de cvs_maximo() CVs disponibles cuando un CV pasa a disponible
--     (alta o restauración). Bloquea la fila del usuario (FOR NO KEY UPDATE,
--     el mismo bloqueo que activar_archivo_usuario en 040) antes de contar:
--     una segunda subida simultánea espera a que la primera termine y, como
--     cada sentencia toma una instantánea nueva, cuenta también el CV ya
--     confirmado. Vale para cualquier escritura, no solo para la función.
CREATE OR REPLACE FUNCTION public.archivos_usuario_estado_fn()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_disponibles int;
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.eliminado_en IS NOT NULL
     AND NEW.eliminado_en IS NULL THEN
    NEW.activo         := true;
    NEW.desactivado_en := NULL;
  ELSIF NEW.eliminado_en IS NULL AND NEW.activo = false THEN
    NEW.eliminado_en := now();
  END IF;

  IF NEW.eliminado_en IS NOT NULL THEN
    NEW.activo         := false;
    NEW.desactivado_en := COALESCE(NEW.desactivado_en, NEW.eliminado_en);
    RETURN NEW;
  END IF;

  IF NEW.tipo = 'cv'
     AND (TG_OP = 'INSERT'
          OR OLD.eliminado_en IS NOT NULL
          OR OLD.tipo IS DISTINCT FROM 'cv'
          OR OLD.usuario_id IS DISTINCT FROM NEW.usuario_id) THEN
    PERFORM 1
    FROM public.usuarios u
    WHERE u.id = NEW.usuario_id
    FOR NO KEY UPDATE;

    SELECT pg_catalog.count(*)::int
    INTO   v_disponibles
    FROM   public.archivos_usuario a
    WHERE  a.usuario_id = NEW.usuario_id
      AND  a.tipo = 'cv'
      AND  a.eliminado_en IS NULL
      AND  a.id <> NEW.id;

    IF v_disponibles >= public.cvs_maximo() THEN
      RAISE EXCEPTION 'Podés tener hasta % CVs. Para subir otro, eliminá alguno de los que tenés.',
        public.cvs_maximo();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.archivos_usuario_estado_fn() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS archivos_usuario_estado ON public.archivos_usuario;
CREATE TRIGGER archivos_usuario_estado
  BEFORE INSERT OR UPDATE ON public.archivos_usuario
  FOR EACH ROW EXECUTE FUNCTION public.archivos_usuario_estado_fn();


-- ============================================================
-- BLOQUE 4 — activar_archivo_usuario (misma firma y retorno que 040)
-- Foto: la activa pasa a eliminada y se inserta la nueva.
-- CV: se agrega uno más; si ya tiene cvs_maximo() disponibles, el trigger
-- del BLOQUE 3 lo rechaza y no se elimina ninguno.
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

  IF p_tipo = 'avatar' THEN
    UPDATE public.archivos_usuario
    SET    eliminado_en = now()
    WHERE  usuario_id   = p_usuario_id
      AND  tipo         = 'avatar'
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
-- BLOQUE 5 — CV elegido al postularse
-- ============================================================

ALTER TABLE public.postulaciones
  ADD COLUMN IF NOT EXISTS cv_archivo_id uuid
    REFERENCES public.archivos_usuario(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.postulaciones.cv_archivo_id IS
  'CV elegido al postularse (054). NULL en postulaciones anteriores o cuando '
  'la purga borró el CV: se muestra el CV disponible más reciente.';

CREATE INDEX IF NOT EXISTS postulaciones_cv_archivo_idx
  ON public.postulaciones (cv_archivo_id)
  WHERE cv_archivo_id IS NOT NULL;

GRANT INSERT (oferta_id, postulante_id, cv_archivo_id) ON public.postulaciones TO authenticated;

-- BEFORE INSERT OR UPDATE OF cv_archivo_id.
--   INSERT sin CV: se usa el disponible más reciente (lo que hace el código
--   anterior al despliegue). Si no tiene ninguno y quien inserta es un
--   usuario (no service_role ni el SQL Editor), se rechaza.
--   CV informado: tiene que ser del mismo postulante, de tipo 'cv' y no
--   eliminado. La fila del CV queda bloqueada (FOR SHARE) hasta el final de
--   la transacción: si el postulante lo elimina al mismo tiempo, una de las
--   dos espera a la otra y nunca queda una postulación nueva con un CV que
--   ya estaba eliminado.
--   UPDATE a NULL (ON DELETE SET NULL de la purga) siempre se permite.
CREATE OR REPLACE FUNCTION public.postulaciones_cv_elegido_fn()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND (NEW.cv_archivo_id IS NULL
          OR NEW.cv_archivo_id IS NOT DISTINCT FROM OLD.cv_archivo_id) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.cv_archivo_id IS NULL THEN
    SELECT a.id
    INTO   NEW.cv_archivo_id
    FROM   public.archivos_usuario a
    JOIN   public.postulantes pt ON pt.usuario_id = a.usuario_id
    WHERE  pt.id = NEW.postulante_id
      AND  a.tipo = 'cv'
      AND  a.eliminado_en IS NULL
    ORDER  BY a.creado_en DESC, a.id DESC
    LIMIT  1
    FOR SHARE OF a;

    IF NEW.cv_archivo_id IS NULL AND auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Necesitás cargar tu CV para postularte.';
    END IF;
    RETURN NEW;
  END IF;

  PERFORM 1
  FROM   public.archivos_usuario a
  JOIN   public.postulantes pt ON pt.usuario_id = a.usuario_id
  WHERE  a.id = NEW.cv_archivo_id
    AND  pt.id = NEW.postulante_id
    AND  a.tipo = 'cv'
    AND  a.eliminado_en IS NULL
  FOR SHARE OF a;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El CV que elegiste ya no está en tu perfil. Elegí otro.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.postulaciones_cv_elegido_fn() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS postulaciones_cv_elegido ON public.postulaciones;
CREATE TRIGGER postulaciones_cv_elegido
  BEFORE INSERT OR UPDATE OF cv_archivo_id ON public.postulaciones
  FOR EACH ROW EXECUTE FUNCTION public.postulaciones_cv_elegido_fn();


-- ============================================================
-- BLOQUE 6 — "En curso" y el CV de una postulación
-- ============================================================

CREATE OR REPLACE FUNCTION public.postulacion_en_curso(
  p_estado         public.estado_postulacion,
  p_estado_empresa public.estado_empresa
)
RETURNS boolean
LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT p_estado::text IN ('recibida', 'en_revision')
      OR (p_estado::text = 'derivada'
          AND (p_estado_empresa IS NULL
               OR p_estado_empresa::text IN ('pendiente', 'en_proceso')))
$$;

REVOKE EXECUTE ON FUNCTION public.postulacion_en_curso(public.estado_postulacion, public.estado_empresa)
  FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.postulacion_en_curso(public.estado_postulacion, public.estado_empresa)
  TO authenticated, service_role;

-- Uso interno (desde otras funciones SECURITY DEFINER): no controla permisos.
CREATE OR REPLACE FUNCTION public.cv_de_postulacion(p_postulacion_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT COALESCE(
    po.cv_archivo_id,
    (SELECT a.id
     FROM   public.archivos_usuario a
     JOIN   public.postulantes pt ON pt.usuario_id = a.usuario_id
     WHERE  pt.id = po.postulante_id
       AND  a.tipo = 'cv'
       AND  a.eliminado_en IS NULL
     ORDER  BY a.creado_en DESC, a.id DESC
     LIMIT  1)
  )
  FROM public.postulaciones po
  WHERE po.id = p_postulacion_id
$$;

REVOKE EXECUTE ON FUNCTION public.cv_de_postulacion(uuid) FROM public, anon, authenticated;


-- ============================================================
-- BLOQUE 7 — Permisos de lectura
-- ============================================================

-- archivos_usuario: el postulante (y cualquier usuario, para su foto) lee
-- solo sus archivos no eliminados. La oficina sigue leyendo todos (018).
DROP POLICY IF EXISTS "usuario lee sus archivos activos" ON public.archivos_usuario;
CREATE POLICY "usuario lee sus archivos activos"
  ON public.archivos_usuario FOR SELECT
  USING (auth.uid() = usuario_id AND eliminado_en IS NULL);

-- Bucket 'cvs', postulante: solo sus CVs disponibles. Un CV eliminado deja de
-- abrirse desde su perfil aunque el archivo siga en Storage hasta la purga.
CREATE OR REPLACE FUNCTION public.postulante_puede_ver_cv(p_ruta text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.archivos_usuario a
    WHERE a.ruta = p_ruta
      AND a.usuario_id = auth.uid()
      AND a.tipo = 'cv'
      AND a.eliminado_en IS NULL
  )
$$;

REVOKE EXECUTE ON FUNCTION public.postulante_puede_ver_cv(text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.postulante_puede_ver_cv(text) TO authenticated;

DROP POLICY IF EXISTS "postulante puede leer su cv" ON storage.objects;
CREATE POLICY "postulante puede leer su cv"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.postulante_puede_ver_cv(name)
  );

-- Bucket 'cvs', empresa (misma firma que 028; la política "cvs: empresa lee
-- candidatos derivados o guardados" no cambia y la llama). Antes: el CV
-- activo de cualquier candidato derivado o guardado. Ahora: solo el CV de una
-- postulación derivada a una oferta suya (el elegido, o el respaldo si es
-- NULL), y si ese CV está eliminado, solo mientras la postulación siga en
-- curso. Un candidato guardado siempre tuvo una derivación (la política de
-- INSERT de candidatos_guardados lo exige), así que ve el CV de esa.
CREATE OR REPLACE FUNCTION public.empresa_puede_ver_cv(p_ruta text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.archivos_usuario a
    JOIN public.postulantes pt   ON pt.usuario_id = a.usuario_id
    JOIN public.postulaciones po ON po.postulante_id = pt.id
    JOIN public.derivaciones d   ON d.postulacion_id = po.id
    JOIN public.ofertas o        ON o.id = po.oferta_id
    JOIN public.empresas e       ON e.id = o.empresa_id
    WHERE a.ruta = p_ruta
      AND a.tipo = 'cv'
      AND e.usuario_id = auth.uid()
      AND a.id = public.cv_de_postulacion(po.id)
      AND (a.eliminado_en IS NULL
           OR public.postulacion_en_curso(po.estado, d.estado_empresa))
  )
$$;

REVOKE EXECUTE ON FUNCTION public.empresa_puede_ver_cv(text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.empresa_puede_ver_cv(text) TO authenticated;

-- CV de una derivación de la empresa (ficha del candidato en la oferta).
CREATE OR REPLACE FUNCTION public.cv_de_derivacion_empresa(p_derivacion_id uuid)
RETURNS TABLE (
  ruta            text,
  nombre_original text,
  subido_en       timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT a.ruta, a.nombre_original, a.creado_en
  FROM public.derivaciones d
  JOIN public.postulaciones po    ON po.id = d.postulacion_id
  JOIN public.ofertas o           ON o.id  = po.oferta_id
  JOIN public.empresas e          ON e.id  = o.empresa_id
  JOIN public.archivos_usuario a  ON a.id  = public.cv_de_postulacion(po.id)
  WHERE d.id = p_derivacion_id
    AND e.usuario_id = auth.uid()
    AND public.rol_actual()::text = 'empresa'
    AND (a.eliminado_en IS NULL
         OR public.postulacion_en_curso(po.estado, d.estado_empresa))
$$;

REVOKE EXECUTE ON FUNCTION public.cv_de_derivacion_empresa(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.cv_de_derivacion_empresa(uuid) TO authenticated;

-- CV de un candidato para la empresa (perfil del candidato): el de su
-- derivación más reciente a una oferta de la empresa que tenga un CV visible.
CREATE OR REPLACE FUNCTION public.cv_de_candidato_empresa(p_postulante_id uuid)
RETURNS TABLE (
  ruta            text,
  nombre_original text,
  subido_en       timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT a.ruta, a.nombre_original, a.creado_en
  FROM public.derivaciones d
  JOIN public.postulaciones po    ON po.id = d.postulacion_id
  JOIN public.ofertas o           ON o.id  = po.oferta_id
  JOIN public.empresas e          ON e.id  = o.empresa_id
  JOIN public.archivos_usuario a  ON a.id  = public.cv_de_postulacion(po.id)
  WHERE po.postulante_id = p_postulante_id
    AND e.usuario_id = auth.uid()
    AND public.rol_actual()::text = 'empresa'
    AND (a.eliminado_en IS NULL
         OR public.postulacion_en_curso(po.estado, d.estado_empresa))
  ORDER BY d.created_at DESC, d.id DESC
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.cv_de_candidato_empresa(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.cv_de_candidato_empresa(uuid) TO authenticated;

-- candidato_para_empresa (046), misma firma y retorno. Antes hacía LEFT JOIN
-- al CV activo: con varios CVs disponibles devolvería una fila por CV.
-- cv_ruta es ahora el de cv_de_candidato_empresa.
CREATE OR REPLACE FUNCTION public.candidato_para_empresa(p_postulante_id uuid)
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
    (SELECT c.ruta FROM public.cv_de_candidato_empresa(p.id) c) AS cv_ruta,
    p.nivel_educativo,
    p.situacion_laboral,
    p.disponibilidad,
    p.experiencia_laboral
  FROM public.postulantes p
  JOIN public.usuarios u ON u.id = p.usuario_id
  JOIN auth.users au     ON au.id = u.id
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

-- candidato_para_empresa_completo (046), misma firma y retorno.
CREATE OR REPLACE FUNCTION public.candidato_para_empresa_completo(p_postulante_id uuid)
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
    (SELECT c.ruta FROM public.cv_de_candidato_empresa(p.id) c) AS cv_ruta,
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


-- ============================================================
-- BLOQUE 8 — Con qué CV se postuló (Mis postulaciones)
-- Nombre y fecha del CV elegido en postulaciones propias, aunque el CV ya
-- esté eliminado (el postulante no puede leer filas eliminadas). Sin la ruta.
-- ============================================================

CREATE OR REPLACE FUNCTION public.cvs_de_mis_postulaciones(p_postulacion_ids uuid[])
RETURNS TABLE (
  postulacion_id  uuid,
  nombre_original text,
  subido_en       timestamptz,
  eliminado       boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT po.id, a.nombre_original, a.creado_en, a.eliminado_en IS NOT NULL
  FROM public.postulaciones po
  JOIN public.postulantes pt     ON pt.id = po.postulante_id
  JOIN public.archivos_usuario a ON a.id  = po.cv_archivo_id
  WHERE po.id = ANY (p_postulacion_ids)
    AND pt.usuario_id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.cvs_de_mis_postulaciones(uuid[]) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.cvs_de_mis_postulaciones(uuid[]) TO authenticated;


-- ============================================================
-- BLOQUE 9 — Purga (solo service_role, la llama /api/mantenimiento/purgar)
--
-- archivos_a_purgar(p_limite): CVs y fotos eliminados hace más de
--   archivos_dias_purga() días, salvo los CVs elegidos en alguna postulación
--   en curso (BLOQUE 6) y las rutas que otra fila no eliminada todavía usa.
--   Un CV elegido en una postulación ya cerrada sí se purga. No modifica
--   nada: la tarea borra los archivos de Storage y después confirma.
-- confirmar_archivos_purgados(p_ids): borra las filas cuyos archivos ya se
--   borraron de Storage. postulaciones.cv_archivo_id queda en NULL por la FK
--   (ON DELETE SET NULL). Si el borrado en Storage falló, la tarea no las
--   confirma y vuelven a salir al día siguiente.
-- ============================================================

CREATE OR REPLACE FUNCTION public.archivos_a_purgar(p_limite integer DEFAULT 500)
RETURNS TABLE (
  id   uuid,
  tipo text,
  ruta text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT a.id, a.tipo, a.ruta
  FROM public.archivos_usuario a
  WHERE a.eliminado_en IS NOT NULL
    AND a.eliminado_en <= now() - pg_catalog.make_interval(days => public.archivos_dias_purga())
    AND NOT EXISTS (
      SELECT 1
      FROM public.postulaciones po
      LEFT JOIN public.derivaciones d ON d.postulacion_id = po.id
      WHERE po.cv_archivo_id = a.id
        AND public.postulacion_en_curso(po.estado, d.estado_empresa)
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.archivos_usuario otra
      WHERE otra.ruta = a.ruta
        AND otra.tipo = a.tipo
        AND otra.id <> a.id
        AND otra.eliminado_en IS NULL
    )
  ORDER BY a.eliminado_en, a.id
  LIMIT GREATEST(LEAST(COALESCE(p_limite, 500), 1000), 1)
$$;

REVOKE EXECUTE ON FUNCTION public.archivos_a_purgar(integer) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.archivos_a_purgar(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.confirmar_archivos_purgados(p_ids uuid[])
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_borradas int;
BEGIN
  DELETE FROM public.archivos_usuario a
  WHERE a.id = ANY (p_ids)
    AND a.eliminado_en IS NOT NULL;
  GET DIAGNOSTICS v_borradas = ROW_COUNT;
  RETURN v_borradas;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirmar_archivos_purgados(uuid[]) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.confirmar_archivos_purgados(uuid[]) TO service_role;


-- ============================================================
-- BLOQUE 10 — Sin escrituras del usuario en los buckets 'cvs' y 'avatares'
--
-- Las políticas de INSERT, UPDATE y DELETE de 008 dejaban que cualquier
-- usuario autenticado subiera, sobrescribiera o borrara archivos de su
-- carpeta con la API de Storage directamente. Así se salteaba:
--   - la validación del servidor (tipo declarado, tamaño, largo del nombre y
--     firma real del archivo, src/lib/archivos.ts);
--   - el registro en archivos_usuario (máximo de CVs, BLOQUE 3);
--   - la protección de los CVs elegidos: un postulante podía cambiar el
--     contenido de un PDF ya elegido en una postulación en curso, o borrarlo
--     antes de que la oficina o la empresa lo vieran.
-- El portal no las usa: subirAvatar, subirCV y su compensación suben y borran
-- con supabaseAdmin (service role, no pasa por estas políticas) y la purga
-- diaria (BLOQUE 9) borra también con supabaseAdmin.
--
-- Quedan solo políticas de lectura (SELECT):
--   cvs       "postulante puede leer su cv" (BLOQUE 7), "cvs: municipalidad
--             lee todos" (018), "cvs: empresa lee candidatos derivados o
--             guardados" (028, con empresa_puede_ver_cv del BLOQUE 7).
--   avatares  "usuario puede leer su avatar" (008), "avatares: municipalidad
--             lee todos" (018), "avatares: empresa lee candidatos derivados
--             o guardados" (029).
-- ============================================================

DROP POLICY IF EXISTS "postulante puede subir su cv"       ON storage.objects;
DROP POLICY IF EXISTS "postulante puede reemplazar su cv"  ON storage.objects;
DROP POLICY IF EXISTS "postulante puede eliminar su cv"    ON storage.objects;
DROP POLICY IF EXISTS "usuario puede subir su avatar"      ON storage.objects;
DROP POLICY IF EXISTS "usuario puede reemplazar su avatar" ON storage.objects;
DROP POLICY IF EXISTS "usuario puede eliminar su avatar"   ON storage.objects;


-- ============================================================
-- ROLLBACK (comentado). Ejecutar a mano solo si hace falta volver atrás y
-- ANTES de que la purga borre archivos. Deja un solo CV activo por usuario
-- (el más reciente disponible) y vuelve a crear el índice único de 009.
-- Las funciones reemplazadas vuelven a su versión anterior copiándolas de
-- 040 (activar_archivo_usuario), 028 (empresa_puede_ver_cv) y 046
-- (candidato_para_empresa y candidato_para_empresa_completo), y las
-- políticas de 008 ("postulante puede leer su cv" y las seis de escritura
-- de los buckets) y 009 ("usuario lee sus archivos activos").
-- ============================================================
--
-- -- BLOQUE 10: políticas de escritura de 008 (copiadas de ahí).
-- CREATE POLICY "postulante puede subir su cv"
--   ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (
--     bucket_id = 'cvs'
--     AND (storage.foldername(name))[1] = auth.uid()::text
--   );
-- CREATE POLICY "postulante puede reemplazar su cv"
--   ON storage.objects FOR UPDATE TO authenticated
--   USING  (bucket_id = 'cvs' AND (storage.foldername(name))[1] = auth.uid()::text)
--   WITH CHECK (bucket_id = 'cvs' AND (storage.foldername(name))[1] = auth.uid()::text);
-- CREATE POLICY "postulante puede eliminar su cv"
--   ON storage.objects FOR DELETE TO authenticated
--   USING (
--     bucket_id = 'cvs'
--     AND (storage.foldername(name))[1] = auth.uid()::text
--   );
-- CREATE POLICY "usuario puede subir su avatar"
--   ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (
--     bucket_id = 'avatares'
--     AND (storage.foldername(name))[1] = auth.uid()::text
--   );
-- CREATE POLICY "usuario puede reemplazar su avatar"
--   ON storage.objects FOR UPDATE TO authenticated
--   USING  (bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::text)
--   WITH CHECK (bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::text);
-- CREATE POLICY "usuario puede eliminar su avatar"
--   ON storage.objects FOR DELETE TO authenticated
--   USING (
--     bucket_id = 'avatares'
--     AND (storage.foldername(name))[1] = auth.uid()::text
--   );
--
-- DROP FUNCTION IF EXISTS public.confirmar_archivos_purgados(uuid[]);
-- DROP FUNCTION IF EXISTS public.archivos_a_purgar(integer);
-- DROP FUNCTION IF EXISTS public.cvs_de_mis_postulaciones(uuid[]);
-- DROP FUNCTION IF EXISTS public.cv_de_candidato_empresa(uuid);
-- DROP FUNCTION IF EXISTS public.cv_de_derivacion_empresa(uuid);
--
-- DROP TRIGGER IF EXISTS postulaciones_cv_elegido ON public.postulaciones;
-- DROP FUNCTION IF EXISTS public.postulaciones_cv_elegido_fn();
-- REVOKE INSERT (cv_archivo_id) ON public.postulaciones FROM authenticated;
-- DROP INDEX IF EXISTS public.postulaciones_cv_archivo_idx;
-- ALTER TABLE public.postulaciones DROP COLUMN IF EXISTS cv_archivo_id;
--
-- DROP POLICY IF EXISTS "postulante puede leer su cv" ON storage.objects;
-- CREATE POLICY "postulante puede leer su cv"
--   ON storage.objects FOR SELECT TO authenticated
--   USING (bucket_id = 'cvs' AND (storage.foldername(name))[1] = auth.uid()::text);
-- DROP FUNCTION IF EXISTS public.postulante_puede_ver_cv(text);
--
-- DROP POLICY IF EXISTS "usuario lee sus archivos activos" ON public.archivos_usuario;
-- CREATE POLICY "usuario lee sus archivos activos"
--   ON public.archivos_usuario FOR SELECT
--   USING (auth.uid() = usuario_id AND activo = true);
--
-- -- (aquí: activar_archivo_usuario de 040, empresa_puede_ver_cv de 028,
-- --  candidato_para_empresa y candidato_para_empresa_completo de 046)
-- -- Después ya se pueden borrar las funciones que usaban:
-- DROP FUNCTION IF EXISTS public.cv_de_postulacion(uuid);
-- DROP FUNCTION IF EXISTS public.postulacion_en_curso(public.estado_postulacion, public.estado_empresa);
--
-- DROP TRIGGER IF EXISTS archivos_usuario_estado ON public.archivos_usuario;
-- DROP FUNCTION IF EXISTS public.archivos_usuario_estado_fn();
-- ALTER TABLE public.archivos_usuario DROP CONSTRAINT IF EXISTS archivos_usuario_activo_eliminado_check;
--
-- -- Un solo CV activo por usuario: el disponible más reciente.
-- UPDATE public.archivos_usuario a
-- SET    activo = false, desactivado_en = COALESCE(a.desactivado_en, now())
-- WHERE  a.tipo = 'cv' AND a.activo = true
--   AND  EXISTS (SELECT 1 FROM public.archivos_usuario b
--                WHERE b.usuario_id = a.usuario_id AND b.tipo = 'cv' AND b.activo = true
--                  AND (b.creado_en, b.id) > (a.creado_en, a.id));
-- DROP INDEX IF EXISTS public.archivos_usuario_avatar_activo_unico;
-- CREATE UNIQUE INDEX IF NOT EXISTS archivos_usuario_activo_unico
--   ON public.archivos_usuario (usuario_id, tipo) WHERE activo = true;
--
-- DROP INDEX IF EXISTS public.archivos_usuario_eliminados_idx;
-- DROP INDEX IF EXISTS public.archivos_usuario_disponibles_idx;
-- ALTER TABLE public.archivos_usuario DROP COLUMN IF EXISTS eliminado_en;
-- DROP FUNCTION IF EXISTS public.archivos_dias_purga();
-- DROP FUNCTION IF EXISTS public.cvs_maximo();
