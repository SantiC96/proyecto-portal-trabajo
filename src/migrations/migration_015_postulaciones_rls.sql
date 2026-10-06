-- ============================================================
-- Portal Municipal de Empleo — Migración 015
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================
-- Razones de esta migración:
--
-- 1. SEGURIDAD: La política "postulaciones: ver todas (empresa o municipalidad)"
--    creada en migration_004 permite que cualquier empresa aprobada vea las
--    postulaciones de TODOS los candidatos. Solo municipalidad debe tener
--    esa visibilidad global; el acceso por empresa se agrega más adelante
--    junto con la feature de derivaciones.
--
-- 2. SEARCH_PATH: Las políticas originales usan nombres no calificados
--    ("postulantes", "rol_actual()"). Luego de migration_012, rol_actual()
--    usa SET search_path = '' y resuelve public.usuarios correctamente.
--    Por coherencia y seguridad, reescribimos todas las políticas de
--    postulaciones con nombres calificados (public.*).
--
-- 3. ÍNDICE: Se agrega índice en (postulante_id, created_at DESC) para
--    soportar eficientemente la consulta de "Mis postulaciones", que
--    filtra por postulante y ordena por fecha descendente.
-- ============================================================

-- ------------------------------------------------------------
-- Corregir política de visibilidad: quitar acceso empresa
-- ------------------------------------------------------------

-- Borra la política que permitía a cualquier empresa ver todo
drop policy if exists "postulaciones: ver todas (empresa o municipalidad)" on public.postulaciones;

-- Solo municipalidad puede ver todas las postulaciones
create policy "postulaciones: ver todas (municipalidad)"
  on public.postulaciones for select
  to authenticated
  using (public.rol_actual() = 'municipalidad');

-- ------------------------------------------------------------
-- Reescribir políticas existentes con nombres calificados
-- (drop + recreate para asegurar search_path seguro)
-- ------------------------------------------------------------

drop policy if exists "postulaciones: ver propias (postulante)" on public.postulaciones;
create policy "postulaciones: ver propias (postulante)"
  on public.postulaciones for select
  to authenticated
  using (
    exists (
      select 1 from public.postulantes
      where id = postulante_id
        and usuario_id = auth.uid()
    )
  );

drop policy if exists "postulaciones: postular" on public.postulaciones;
create policy "postulaciones: postular"
  on public.postulaciones for insert
  to authenticated
  with check (
    exists (
      select 1 from public.postulantes
      where id = postulante_id
        and usuario_id = auth.uid()
    )
  );

drop policy if exists "postulaciones: actualizar estado (municipalidad)" on public.postulaciones;
create policy "postulaciones: actualizar estado (municipalidad)"
  on public.postulaciones for update
  to authenticated
  using (public.rol_actual() = 'municipalidad');

drop policy if exists "postulaciones: retirar (postulante)" on public.postulaciones;
create policy "postulaciones: retirar (postulante)"
  on public.postulaciones for delete
  to authenticated
  using (
    exists (
      select 1 from public.postulantes
      where id = postulante_id
        and usuario_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- Índice para "Mis postulaciones"
-- ------------------------------------------------------------

create index if not exists idx_postulaciones_postulante_created
  on public.postulaciones (postulante_id, created_at desc);
