-- ============================================================
-- Portal Municipal de Empleo — Migración 022
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_021_ofertas_empresa.sql ya aplicada.
-- ============================================================
-- 1. Agrega `contenido_editado_en` a public.ofertas y un trigger
--    BEFORE UPDATE que la pone a now() solo cuando cambian columnas
--    de contenido (título, descripción, requisitos, etc.), no cuando
--    cambia únicamente el estado u otros metadatos.
--    La columna NO está en el grant de UPDATE de migration_021, así
--    que el cliente autenticado no puede escribirla directamente;
--    el trigger la actualiza como security definer.
--
-- 2. Agrega una política RLS que permite al postulante leer cualquier
--    oferta a la que se postuló, independientemente del estado.
--    Sin esto, las ofertas en `pendiente_aprobacion` quedan fuera del
--    LEFT JOIN en "Mis postulaciones" y aparecen como nulas,
--    mostrando erróneamente "Oferta cerrada".
--
-- 3. Verificación: la política de DELETE en postulaciones (migration_015)
--    "postulaciones: retirar (postulante)" solo exige que el postulante
--    sea propietario; no requiere que la oferta esté activa. El server
--    action también valida solo el estado de la postulación (recibida).
--    No se necesitan cambios para permitir retirar mientras la oferta
--    está en revisión.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- BLOQUE 1 — Columna contenido_editado_en en public.ofertas
-- ─────────────────────────────────────────────────────────────

alter table public.ofertas
  add column if not exists contenido_editado_en timestamptz;

-- La columna queda fuera del grant de UPDATE de migration_021
-- (que lista explícitamente las columnas permitidas y no incluye ésta),
-- por lo que el cliente autenticado no puede escribirla directamente.

-- ─────────────────────────────────────────────────────────────
-- BLOQUE 2 — Trigger que marca contenido_editado_en
-- Solo dispara cuando cambia el contenido publicable de la oferta,
-- no cuando cambia solo el estado, motivo_rechazo o updated_at.
-- ─────────────────────────────────────────────────────────────

create or replace function public.ofertas_marcar_contenido_editado_fn()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if (
    new.titulo          is distinct from old.titulo
    or new.descripcion  is distinct from old.descripcion
    or new.requisitos   is distinct from old.requisitos
    or new.beneficios   is distinct from old.beneficios
    or new.modalidad    is distinct from old.modalidad
    or new.jornada      is distinct from old.jornada
    or new.ubicacion    is distinct from old.ubicacion
    or new.empresa_nombre is distinct from old.empresa_nombre
  ) then
    new.contenido_editado_en := now();
  end if;
  return new;
end;
$$;

drop trigger if exists ofertas_marcar_contenido_editado on public.ofertas;
create trigger ofertas_marcar_contenido_editado
  before update on public.ofertas
  for each row
  execute function public.ofertas_marcar_contenido_editado_fn();

-- ─────────────────────────────────────────────────────────────
-- BLOQUE 3 — RLS: postulante puede leer sus ofertas relacionadas
-- Permite ver la oferta a la que se postuló en cualquier estado,
-- para que "Mis postulaciones" muestre el estado real (en revisión,
-- rechazada, cerrada) en lugar de mostrar la oferta como nula.
-- ─────────────────────────────────────────────────────────────

drop policy if exists "ofertas: lectura postulante (postulación propia)" on public.ofertas;
create policy "ofertas: lectura postulante (postulación propia)"
  on public.ofertas for select
  to authenticated
  using (
    public.rol_actual() = 'postulante'
    and exists (
      select 1
      from public.postulaciones p
      join public.postulantes ps on ps.id = p.postulante_id
      where p.oferta_id = public.ofertas.id
        and ps.usuario_id = auth.uid()
    )
  );
