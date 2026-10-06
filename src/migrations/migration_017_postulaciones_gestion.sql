-- ============================================================
-- Portal Municipal de Empleo — Migración 017
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_001_schema.sql y migration_015_postulaciones_rls.sql
-- ============================================================

-- nota interna de la oficina municipal; el postulante nunca la ve
alter table public.postulaciones
  add column if not exists nota_oficina text;

-- empleado municipal que revisó la postulación por última vez
alter table public.postulaciones
  add column if not exists revisado_por uuid references public.usuarios(id);

-- timestamp de última modificación del estado o la nota
alter table public.postulaciones
  add column if not exists updated_at timestamptz not null default now();
