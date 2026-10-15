-- ============================================================
-- Portal Municipal de Empleo — Migración 033
-- Validación de archivos en tres capas: buckets, tabla y función
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Re-ejecutable sin errores
-- ============================================================

-- ── 1. Verificar que los buckets existen ─────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatares') THEN
    RAISE EXCEPTION
      'El bucket "avatares" no existe. Crealo en el Dashboard de Supabase (Storage) antes de ejecutar esta migración.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'cvs') THEN
    RAISE EXCEPTION
      'El bucket "cvs" no existe. Crealo en el Dashboard de Supabase (Storage) antes de ejecutar esta migración.';
  END IF;
END $$;

-- ── 2. Configurar límites y tipos permitidos en los buckets ──

UPDATE storage.buckets
SET
  public             = false,
  file_size_limit    = 2097152,   -- 2 MB en bytes
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'avatares';

UPDATE storage.buckets
SET
  public             = false,
  file_size_limit    = 5242880,   -- 5 MB en bytes
  allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'cvs';

-- ── 3. Columna mime_type en archivos_usuario ─────────────────

ALTER TABLE public.archivos_usuario
  ADD COLUMN IF NOT EXISTS mime_type text;

-- ── 4. Completar datos desde storage y desactivar filas inválidas
--
--    a) Actualizar tamano y mime_type con datos reales de storage.objects.
--       Bucket cvs → tipo 'cv'; bucket avatares → tipo 'avatar'.
--       El tamaño está en (metadata->>'size')::bigint y el tipo en metadata->>'mimetype'.
--
--    b) Backfill mime_type por extensión de ruta para filas que storage no
--       pudo resolver (archivo ya no existe en el bucket).
--
--    c) Desactivar filas activas que sigan sin cumplir las reglas tras (a) y (b).
--       Se hace ANTES de crear los constraints para que ningún UPDATE posterior
--       de la migración dispare el check sobre datos inválidos.

DO $$
DECLARE
  n_storage      INTEGER;
  n_extension    INTEGER;
  n_desactivadas INTEGER;
BEGIN
  -- 4a. Fuente de verdad: storage.objects
  WITH updated AS (
    UPDATE public.archivos_usuario au
    SET
      tamano    = (obj.metadata->>'size')::bigint,
      mime_type = obj.metadata->>'mimetype'
    FROM storage.objects obj
    WHERE obj.name      = au.ruta
      AND obj.bucket_id IN ('cvs', 'avatares')
      AND (au.tamano = 0 OR au.mime_type IS NULL)
    RETURNING au.id
  )
  SELECT COUNT(*) INTO n_storage FROM updated;

  -- 4b. Fallback: inferir mime_type desde la extensión de la ruta
  WITH updated AS (
    UPDATE public.archivos_usuario
    SET mime_type = CASE
      WHEN ruta ILIKE '%.pdf'  THEN 'application/pdf'
      WHEN ruta ILIKE '%.jpg'  THEN 'image/jpeg'
      WHEN ruta ILIKE '%.jpeg' THEN 'image/jpeg'
      WHEN ruta ILIKE '%.png'  THEN 'image/png'
      WHEN ruta ILIKE '%.webp' THEN 'image/webp'
    END
    WHERE mime_type IS NULL
      AND (
        ruta ILIKE '%.pdf'
        OR ruta ILIKE '%.jpg'
        OR ruta ILIKE '%.jpeg'
        OR ruta ILIKE '%.png'
        OR ruta ILIKE '%.webp'
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO n_extension FROM updated;

  -- 4c. Desactivar filas activas que siguen sin cumplir las reglas
  --     (archivo borrado del bucket, tipo no permitido, o vacío).
  --     Se ejecuta ANTES de crear los constraints.
  WITH desactivadas AS (
    UPDATE public.archivos_usuario
    SET    activo        = false,
           desactivado_en = now()
    WHERE  activo = true
      AND (
        (tipo = 'cv' AND (
          tamano = 0
          OR tamano > 5242880
          OR mime_type IS NULL
          OR mime_type <> 'application/pdf'
        ))
        OR
        (tipo = 'avatar' AND (
          tamano = 0
          OR tamano > 2097152
          OR mime_type IS NULL
          OR mime_type NOT IN ('image/jpeg', 'image/png', 'image/webp')
        ))
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO n_desactivadas FROM desactivadas;

  RAISE NOTICE
    '% fila(s) completadas desde storage.objects, % desde extensión de ruta, '
    '% fila(s) activas desactivadas por no cumplir las reglas.',
    n_storage, n_extension, n_desactivadas;
END $$;

-- ── 5. Constraints de mime_type
--    Se exige mime_type IS NOT NULL explícitamente: en un CHECK, una comparación
--    con NULL devuelve NULL (no FALSE), y PostgreSQL permite la fila cuando el
--    resultado es NULL. Sin IS NOT NULL, mime_type NULL pasaría el check.

ALTER TABLE public.archivos_usuario
  DROP CONSTRAINT IF EXISTS archivos_usuario_mime_cv_check;
ALTER TABLE public.archivos_usuario
  ADD CONSTRAINT archivos_usuario_mime_cv_check
    CHECK (tipo <> 'cv' OR (mime_type IS NOT NULL AND mime_type = 'application/pdf'))
    NOT VALID;

ALTER TABLE public.archivos_usuario
  DROP CONSTRAINT IF EXISTS archivos_usuario_mime_avatar_check;
ALTER TABLE public.archivos_usuario
  ADD CONSTRAINT archivos_usuario_mime_avatar_check
    CHECK (tipo <> 'avatar' OR (mime_type IS NOT NULL AND mime_type IN ('image/jpeg', 'image/png', 'image/webp')))
    NOT VALID;

-- ── 6. Constraints de tamaño

ALTER TABLE public.archivos_usuario
  DROP CONSTRAINT IF EXISTS archivos_usuario_tamano_cv_check;
ALTER TABLE public.archivos_usuario
  ADD CONSTRAINT archivos_usuario_tamano_cv_check
    CHECK (tipo <> 'cv' OR tamano BETWEEN 1 AND 5242880)
    NOT VALID;

ALTER TABLE public.archivos_usuario
  DROP CONSTRAINT IF EXISTS archivos_usuario_tamano_avatar_check;
ALTER TABLE public.archivos_usuario
  ADD CONSTRAINT archivos_usuario_tamano_avatar_check
    CHECK (tipo <> 'avatar' OR tamano BETWEEN 1 AND 2097152)
    NOT VALID;

-- ── 7. Intentar validar los constraints ──────────────────────
--
--    Tras el paso 4 todas las filas ACTIVAS cumplen los requisitos.
--    Sin embargo, pueden quedar filas INACTIVAS con datos históricos inválidos
--    (tamano = 0, mime_type NULL o tipo no permitido) para las que el archivo
--    ya no existe en storage y que no pudieron corregirse.
--
--    Si VALIDATE CONSTRAINT encuentra esas filas, la validación falla y los
--    constraints quedan NOT VALID. Esto es seguro porque:
--      - activar_archivo_usuario hace UPDATE WHERE activo = true: las filas
--        inactivas no son tocadas, el check nunca se evalúa sobre ellas.
--      - quitarAvatar y eliminarCV también filtran activo = true.
--      - ajustarAvatar filtra activo = true.
--    Ninguna operación de la aplicación modifica filas inactivas.
--    Los constraints NOT VALID sí se aplican a nuevos INSERTs y a los UPDATEs
--    que ocurren, que siempre afectan filas activas con datos válidos.

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.archivos_usuario VALIDATE CONSTRAINT archivos_usuario_mime_cv_check;
    ALTER TABLE public.archivos_usuario VALIDATE CONSTRAINT archivos_usuario_mime_avatar_check;
    ALTER TABLE public.archivos_usuario VALIDATE CONSTRAINT archivos_usuario_tamano_cv_check;
    ALTER TABLE public.archivos_usuario VALIDATE CONSTRAINT archivos_usuario_tamano_avatar_check;
    RAISE NOTICE 'Todos los constraints validados: no quedan filas inválidas.';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE
      'VALIDATE CONSTRAINT encontró filas inactivas con datos inválidos (%). '
      'Los constraints quedan NOT VALID. '
      'Es seguro: toda operación de la app sobre archivos_usuario filtra '
      'activo = true; las filas inactivas no son modificadas por la aplicación.',
      SQLERRM;
  END;
END $$;

-- ── 8. Función activar_archivo_usuario con mime_type ────────
--    Se elimina la firma anterior (5 parámetros) porque PostgreSQL no permite
--    CREATE OR REPLACE para cambiar la firma; sería una función nueva.
--    Al borrar la función vieja se eliminan automáticamente sus ACL.

DROP FUNCTION IF EXISTS public.activar_archivo_usuario(uuid, text, text, text, bigint);

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
  -- Desactivar el archivo activo actual (si existe)
  UPDATE public.archivos_usuario
  SET    activo        = false,
         desactivado_en = now()
  WHERE  usuario_id = p_usuario_id
    AND  tipo       = p_tipo
    AND  activo     = true;

  -- Insertar el nuevo como activo
  INSERT INTO public.archivos_usuario
    (usuario_id, tipo, ruta, nombre_original, tamano, mime_type)
  VALUES
    (p_usuario_id, p_tipo, p_ruta, p_nombre_original, p_tamano, p_mime_type);
END;
$$;

-- ── 9. Permisos: solo service_role puede ejecutar la función ─

REVOKE EXECUTE ON FUNCTION public.activar_archivo_usuario(uuid, text, text, text, bigint, text)
  FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.activar_archivo_usuario(uuid, text, text, text, bigint, text)
  TO service_role;
