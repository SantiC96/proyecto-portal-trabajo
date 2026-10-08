-- ============================================================
-- Portal Municipal de Empleo — Migración 023
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_022_contenido_editado_y_rls.sql ya aplicada.
-- ============================================================
-- La policy de INSERT en postulaciones (migration_018) verifica si
-- la oferta está activa con una subconsulta directa a public.ofertas.
-- Esa subconsulta corre en el contexto RLS del postulante. Con las
-- policies restrictivas añadidas en migration_021 (lectura empresa
-- propia, lectura municipalidad), la subconsulta no puede resolver
-- la visibilidad de la oferta correctamente y la policy rechaza el
-- INSERT aunque la oferta sí esté activa.
--
-- Fix: una función SECURITY DEFINER que verifica el estado de la
-- oferta sin depender del RLS del llamador, con search_path fijo —
-- el mismo patrón de emails_de_usuarios (migration_018).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- BLOQUE 1 — Función auxiliar: verificar si una oferta acepta postulaciones
-- ─────────────────────────────────────────────────────────────

create or replace function public.oferta_acepta_postulaciones(p_oferta_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.ofertas
    where id = p_oferta_id
      and estado = 'activa'
  )
$$;

revoke execute on function public.oferta_acepta_postulaciones(uuid) from public, anon;
grant execute on function public.oferta_acepta_postulaciones(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- BLOQUE 2 — Reemplazar policy de INSERT en postulaciones
-- Usa la función SECURITY DEFINER en lugar de la subconsulta directa,
-- eliminando la dependencia del RLS del postulante para verificar el
-- estado de la oferta.
-- ─────────────────────────────────────────────────────────────

drop policy if exists "postulaciones: postular" on public.postulaciones;
create policy "postulaciones: postular"
  on public.postulaciones
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.postulantes
      where id = postulante_id
        and usuario_id = auth.uid()
    )
    and public.oferta_acepta_postulaciones(oferta_id)
  );
