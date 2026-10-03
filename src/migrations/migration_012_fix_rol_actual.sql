-- ============================================================
-- Portal Municipal de Empleo — Migración 012
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================
-- Corrige public.rol_actual() para que funcione correctamente
-- cuando es llamada desde funciones con set search_path = ''.
-- La versión original (migration_004) consultaba `usuarios` sin
-- calificación de esquema, lo que fallaba bajo search_path vacío.
-- ============================================================
create or replace function public.rol_actual()
returns public.rol_usuario
language sql
security definer
stable
set search_path = ''
as $$
  select rol from public.usuarios where id = auth.uid()
$$;
