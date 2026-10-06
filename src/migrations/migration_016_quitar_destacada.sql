-- ============================================================
-- Portal Municipal de Empleo — Migración 016
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================
-- IMPORTANTE: ejecutar SOLO después de que el código sin `destacada`
-- esté publicado en main (Vercel). Si se ejecuta antes, el listado
-- de ofertas en producción falla porque el código viejo todavía
-- selecciona esa columna.
-- ============================================================

alter table public.ofertas drop column if exists destacada;
