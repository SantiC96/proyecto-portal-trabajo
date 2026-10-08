-- ============================================================
-- Portal Municipal de Empleo — Migración 021
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_020_estados_oferta.sql ya aplicada.
-- ============================================================
-- Vincula ofertas con empresas, actualiza RLS y permisos por columna
-- para que las empresas aprobadas puedan publicar y gestionar sus
-- propias ofertas.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- BLOQUE 1 — Columnas nuevas en public.ofertas
-- ─────────────────────────────────────────────────────────────

-- empresa_id: nullable para no romper ofertas de ejemplo sin empresa.
alter table public.ofertas
  add column if not exists empresa_id     uuid        references public.empresas(id) on delete cascade,
  add column if not exists motivo_rechazo text,
  add column if not exists updated_at     timestamptz not null default now();

-- Índice por empresa para que RLS y queries de "mis ofertas" sean eficientes.
create index if not exists ofertas_empresa_id_idx on public.ofertas(empresa_id);

-- ─────────────────────────────────────────────────────────────
-- BLOQUE 2 — Reemplazar políticas de SELECT en public.ofertas
-- ─────────────────────────────────────────────────────────────

-- La política "lectura autenticada (todas)" exponía ofertas no publicadas
-- a cualquier usuario logueado; se reemplaza por dos políticas restrictivas.
drop policy if exists "ofertas: lectura autenticada (todas)" on public.ofertas;

-- La empresa ve todas SUS ofertas en cualquier estado.
drop policy if exists "ofertas: lectura empresa propia" on public.ofertas;
create policy "ofertas: lectura empresa propia"
  on public.ofertas for select
  using (
    public.rol_actual() = 'empresa'
    and empresa_id = (select id from public.empresas where usuario_id = auth.uid())
  );

-- La municipalidad ve todas las ofertas.
drop policy if exists "ofertas: lectura municipalidad (todas)" on public.ofertas;
create policy "ofertas: lectura municipalidad (todas)"
  on public.ofertas for select
  using (public.rol_actual() = 'municipalidad');

-- ─────────────────────────────────────────────────────────────
-- BLOQUE 3 — Reemplazar política de INSERT en public.ofertas
-- ─────────────────────────────────────────────────────────────

-- La política anterior no restringía el empresa_id ni el estado al insertar.
drop policy if exists "ofertas: insertar (empresa o municipalidad)" on public.ofertas;

-- Empresa aprobada: solo puede insertar con su propio empresa_id y estado pendiente_aprobacion.
drop policy if exists "ofertas: insertar (empresa aprobada)" on public.ofertas;
create policy "ofertas: insertar (empresa aprobada)"
  on public.ofertas for insert
  with check (
    public.rol_actual() = 'empresa'
    and estado = 'pendiente_aprobacion'
    and empresa_id = (
      select id from public.empresas
      where usuario_id = auth.uid() and estado_aprobacion = 'aprobada'
    )
  );

-- Municipalidad: puede insertar ofertas en cualquier estado.
drop policy if exists "ofertas: insertar (municipalidad)" on public.ofertas;
create policy "ofertas: insertar (municipalidad)"
  on public.ofertas for insert
  with check (public.rol_actual() = 'municipalidad');

-- ─────────────────────────────────────────────────────────────
-- BLOQUE 4 — Política de UPDATE para empresa
-- ─────────────────────────────────────────────────────────────

-- La municipalidad ya tiene su política de migration_004; se conserva.
-- Nueva política para empresa: solo sus ofertas no cerradas,
-- y el estado resultante solo puede ser 'pendiente_aprobacion' o 'cerrada'.
drop policy if exists "ofertas: actualizar (empresa propia)" on public.ofertas;
create policy "ofertas: actualizar (empresa propia)"
  on public.ofertas for update
  using (
    public.rol_actual() = 'empresa'
    and empresa_id = (select id from public.empresas where usuario_id = auth.uid())
    and estado != 'cerrada'
  )
  with check (
    public.rol_actual() = 'empresa'
    and empresa_id = (select id from public.empresas where usuario_id = auth.uid())
    and estado in ('pendiente_aprobacion', 'cerrada')
  );

-- ─────────────────────────────────────────────────────────────
-- BLOQUE 5 — Permisos por columna en public.ofertas
-- Patrón de migration_018: revoke + grant selectivo + trigger de protección.
-- ─────────────────────────────────────────────────────────────

-- empresa_id queda excluida del grant de UPDATE: nadie la puede cambiar
-- después de la creación mediante el cliente autenticado.
-- motivo_rechazo se incluye en el grant para que la municipalidad pueda
-- escribirla; el trigger prevent_empresa_oferta_campos_fn la protege
-- ante el rol empresa.
revoke update on public.ofertas from authenticated;
grant update (titulo, descripcion, ubicacion, modalidad, jornada,
              requisitos, beneficios, estado, empresa_nombre,
              motivo_rechazo, updated_at)
  on public.ofertas to authenticated;

-- Trigger: bloquea que el rol empresa modifique motivo_rechazo en UPDATE.
create or replace function public.prevent_empresa_oferta_campos_fn()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if public.rol_actual()::text = 'empresa' then
    if new.motivo_rechazo is distinct from old.motivo_rechazo then
      raise exception 'No tenés permiso para modificar el motivo de rechazo.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_empresa_oferta_campos on public.ofertas;
create trigger prevent_empresa_oferta_campos
  before update on public.ofertas
  for each row
  execute function public.prevent_empresa_oferta_campos_fn();

-- ─────────────────────────────────────────────────────────────
-- BLOQUE 6 — Políticas de public.oferta_categorias para empresa
-- La empresa inserta y borra solo categorías de sus propias ofertas.
-- ─────────────────────────────────────────────────────────────

drop policy if exists "oferta_categorias: insertar (empresa o municipalidad)" on public.oferta_categorias;

-- Empresa: solo para sus propias ofertas.
drop policy if exists "oferta_categorias: insertar (empresa propia)" on public.oferta_categorias;
create policy "oferta_categorias: insertar (empresa propia)"
  on public.oferta_categorias for insert
  with check (
    public.rol_actual() = 'empresa'
    and exists (
      select 1 from public.ofertas o
      join public.empresas e on e.id = o.empresa_id
      where o.id = oferta_id
        and e.usuario_id = auth.uid()
    )
  );

-- Municipalidad: puede insertar en cualquier oferta.
drop policy if exists "oferta_categorias: insertar (municipalidad)" on public.oferta_categorias;
create policy "oferta_categorias: insertar (municipalidad)"
  on public.oferta_categorias for insert
  with check (public.rol_actual() = 'municipalidad');

drop policy if exists "oferta_categorias: eliminar (empresa o municipalidad)" on public.oferta_categorias;

-- Empresa: solo borra categorías de sus propias ofertas.
drop policy if exists "oferta_categorias: eliminar (empresa propia)" on public.oferta_categorias;
create policy "oferta_categorias: eliminar (empresa propia)"
  on public.oferta_categorias for delete
  using (
    public.rol_actual() = 'empresa'
    and exists (
      select 1 from public.ofertas o
      join public.empresas e on e.id = o.empresa_id
      where o.id = oferta_id
        and e.usuario_id = auth.uid()
    )
  );

-- Municipalidad: puede borrar categorías de cualquier oferta.
drop policy if exists "oferta_categorias: eliminar (municipalidad)" on public.oferta_categorias;
create policy "oferta_categorias: eliminar (municipalidad)"
  on public.oferta_categorias for delete
  using (public.rol_actual() = 'municipalidad');
