-- ============================================================
-- Portal Municipal de Empleo — Migración 020
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================
-- Agrega los valores 'pendiente_aprobacion' y 'rechazada' al enum
-- estado_oferta.
--
-- Va separada de migration_021 porque Postgres no permite usar un
-- valor nuevo de un enum en la misma transacción en que se agrega.
-- ============================================================

alter type public.estado_oferta add value if not exists 'pendiente_aprobacion';
alter type public.estado_oferta add value if not exists 'rechazada';
