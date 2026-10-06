-- ============================================================
-- Portal Municipal de Empleo — Migración 013
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================
-- Guarda la posición (en %) y el zoom con que se muestra el
-- avatar del usuario, sin modificar el archivo almacenado.
-- Los archivos nuevos toman los valores por defecto (centrado, sin zoom).
-- ============================================================
ALTER TABLE public.archivos_usuario
  ADD COLUMN IF NOT EXISTS ajuste_x    numeric(5,2) NOT NULL DEFAULT 50
    CONSTRAINT archivos_usuario_ajuste_x_check    CHECK (ajuste_x    BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS ajuste_y    numeric(5,2) NOT NULL DEFAULT 50
    CONSTRAINT archivos_usuario_ajuste_y_check    CHECK (ajuste_y    BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS ajuste_zoom numeric(4,2) NOT NULL DEFAULT 1
    CONSTRAINT archivos_usuario_ajuste_zoom_check CHECK (ajuste_zoom BETWEEN 1 AND 3);
