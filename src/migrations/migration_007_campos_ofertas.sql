-- ============================================================
-- Migración 007 — Campos adicionales para ofertas laborales
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere que migration_001_schema.sql ya esté aplicada
-- ============================================================

create type modalidad_oferta as enum ('Presencial', 'Híbrido', 'Remoto');
create type jornada_oferta   as enum ('Tiempo completo', 'Part-time', 'Pasantía', 'Por proyecto');

alter table ofertas
  add column ubicacion  text             not null default '',
  add column modalidad  modalidad_oferta not null default 'Presencial',
  add column jornada    jornada_oferta   not null default 'Tiempo completo',
  add column requisitos text[]           not null default '{}',
  add column beneficios text[]           not null default '{}',
  add column destacada  boolean          not null default false;
