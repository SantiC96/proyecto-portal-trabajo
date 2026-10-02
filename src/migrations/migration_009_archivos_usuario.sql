-- ─────────────────────────────────────────────────────────────────────────────
-- migration_009_archivos_usuario.sql
-- Tabla de archivos con eliminación lógica. Reemplaza avatar_path y cv_path.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Tabla principal
CREATE TABLE public.archivos_usuario (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      uuid        NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tipo            text        NOT NULL CHECK (tipo IN ('cv', 'avatar')),
  ruta            text        NOT NULL,
  nombre_original text        NOT NULL,
  tamano          bigint      NOT NULL,
  activo          boolean     NOT NULL DEFAULT true,
  creado_en       timestamptz NOT NULL DEFAULT now(),
  desactivado_en  timestamptz
);

-- 2. Índice único parcial: máximo un archivo activo por (usuario, tipo)
CREATE UNIQUE INDEX archivos_usuario_activo_unico
  ON public.archivos_usuario (usuario_id, tipo)
  WHERE activo = true;

-- 3. Índice de consulta
CREATE INDEX archivos_usuario_usuario_tipo_idx
  ON public.archivos_usuario (usuario_id, tipo);

-- 4. Migrar datos actuales
--    Los archivos existentes no tienen nombre_original ni tamaño reales;
--    se migran con valores genéricos. Los nuevos archivos subidos tendrán los datos reales.
INSERT INTO public.archivos_usuario (usuario_id, tipo, ruta, nombre_original, tamano)
SELECT id, 'avatar', avatar_path, 'avatar', 0
FROM public.usuarios
WHERE avatar_path IS NOT NULL;

INSERT INTO public.archivos_usuario (usuario_id, tipo, ruta, nombre_original, tamano)
SELECT usuario_id, 'cv', cv_path, 'cv.pdf', 0
FROM public.postulantes
WHERE cv_path IS NOT NULL;

-- 5. Eliminar columnas antiguas (archivos_usuario es la única fuente de verdad)
ALTER TABLE public.usuarios    DROP COLUMN avatar_path;
ALTER TABLE public.postulantes DROP COLUMN cv_path;

-- 6. RLS
ALTER TABLE public.archivos_usuario ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo puede leer sus propios archivos activos.
-- Las escrituras ocurren exclusivamente desde server actions (service role, bypassa RLS).
CREATE POLICY "usuario lee sus archivos activos"
  ON public.archivos_usuario FOR SELECT
  USING (auth.uid() = usuario_id AND activo = true);

-- 7. Quitar políticas DELETE de storage (nadie borra archivos desde la app)
DROP POLICY IF EXISTS "postulante puede eliminar su cv"  ON storage.objects;
DROP POLICY IF EXISTS "usuario puede eliminar su avatar" ON storage.objects;

-- 8. Función RPC para activación atómica
--    Desactiva el archivo activo actual e inserta el nuevo en una sola transacción.
--    Si falla, el estado anterior queda intacto.
CREATE OR REPLACE FUNCTION public.activar_archivo_usuario(
  p_usuario_id      uuid,
  p_tipo            text,
  p_ruta            text,
  p_nombre_original text,
  p_tamano          bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Desactivar el archivo activo actual (si existe)
  UPDATE public.archivos_usuario
  SET    activo = false,
         desactivado_en = now()
  WHERE  usuario_id = p_usuario_id
    AND  tipo       = p_tipo
    AND  activo     = true;

  -- Insertar el nuevo como activo
  INSERT INTO public.archivos_usuario
    (usuario_id, tipo, ruta, nombre_original, tamano)
  VALUES
    (p_usuario_id, p_tipo, p_ruta, p_nombre_original, p_tamano);
END;
$$;
