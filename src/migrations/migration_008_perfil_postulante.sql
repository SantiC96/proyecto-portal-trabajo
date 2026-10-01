-- ─────────────────────────────────────────────────────────────────────────────
-- migration_008_perfil_postulante.sql
-- Agrega domicilio y avatar_path; renombra cv_url → cv_path;
-- crea políticas de storage para los buckets "cvs" y "avatares".
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Renombrar cv_url → cv_path en postulantes
--    La columna guarda la ruta dentro del bucket, no una URL firmada.
ALTER TABLE postulantes RENAME COLUMN cv_url TO cv_path;

-- 2. Domicilio del postulante (calle y número en Funes)
ALTER TABLE postulantes ADD COLUMN domicilio text;

-- 3. Ruta del avatar dentro del bucket "avatares"
--    Válido para todos los roles (postulante, empresa, municipalidad).
ALTER TABLE usuarios ADD COLUMN avatar_path text;

-- ─────────────────────────────────────────────────────────────────────────────
-- Las políticas de tabla (usuarios, postulantes, postulante_categorias)
-- ya existen en migration_004. No se duplican.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- Políticas de storage — bucket: cvs (privado, PDF del curriculum)
-- Cada postulante opera solo dentro de su carpeta <usuario_id>/
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "postulante puede subir su cv"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "postulante puede leer su cv"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
    -- Para que la oficina de empleo pueda leer todos los CVs en el futuro:
    -- OR rol_actual() = 'municipalidad'
  );

CREATE POLICY "postulante puede reemplazar su cv"
  ON storage.objects FOR UPDATE TO authenticated
  USING  (bucket_id = 'cvs' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'cvs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "postulante puede eliminar su cv"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Políticas de storage — bucket: avatares (privado, foto de perfil)
-- Cada usuario opera solo dentro de su carpeta <usuario_id>/
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "usuario puede subir su avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatares'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "usuario puede leer su avatar"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatares'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "usuario puede reemplazar su avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING  (bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "usuario puede eliminar su avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatares'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
