-- ============================================================
-- Portal Municipal de Empleo — Migración 024
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_023_fix_policy_postular.sql ya aplicada.
-- ============================================================
-- 1. Bloquea que el rol empresa edite el contenido de una oferta
--    mientras esté en estado pendiente_aprobacion. Solo se permite
--    pasar a 'cerrada' (cerrar la oferta). La empresa sí puede
--    editar una oferta activa (vuelve a pendiente) o rechazada
--    (se reenvía a revisión).
--
--    Implementado con un trigger BEFORE UPDATE (SECURITY DEFINER)
--    porque el RLS no puede comparar OLD y NEW en WITH CHECK.
--
-- 2. Permite que empresa elimine una oferta pendiente sin postulaciones.
--    El chequeo de postulaciones usa una función SECURITY DEFINER
--    para evitar ciclos de policies entre ofertas y postulaciones
--    (el mismo patrón que oferta_acepta_postulaciones en migration_023).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- BLOQUE 1 — Función auxiliar: verificar que una oferta no tiene postulaciones
-- ─────────────────────────────────────────────────────────────

create or replace function public.oferta_sin_postulaciones(p_oferta_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select not exists (
    select 1 from public.postulaciones
    where oferta_id = p_oferta_id
  )
$$;

revoke execute on function public.oferta_sin_postulaciones(uuid) from public, anon;
grant execute on function public.oferta_sin_postulaciones(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- BLOQUE 2 — Trigger que impide editar contenido mientras está pendiente
--
-- Condición de bloqueo: el rol es 'empresa' Y el estado anterior
-- era 'pendiente_aprobacion' Y el nuevo estado sigue siendo
-- 'pendiente_aprobacion'. Esto cubre la edición de contenido
-- (que siempre termina en 'pendiente') sin bloquear el cierre
-- (que pone el estado en 'cerrada').
-- La municipalidad no es afectada (rol_actual() != 'empresa').
-- ─────────────────────────────────────────────────────────────

create or replace function public.prevent_empresa_editar_pendiente_fn()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if public.rol_actual()::text = 'empresa'
    and old.estado = 'pendiente_aprobacion'
    and new.estado = 'pendiente_aprobacion'
  then
    raise exception 'No podés editar una oferta que está pendiente de revisión.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_empresa_editar_pendiente on public.ofertas;
create trigger prevent_empresa_editar_pendiente
  before update on public.ofertas
  for each row
  execute function public.prevent_empresa_editar_pendiente_fn();

-- ─────────────────────────────────────────────────────────────
-- BLOQUE 3 — Policy DELETE para empresa en ofertas
--
-- Condiciones: rol empresa, oferta propia, estado pendiente_aprobacion,
-- sin postulaciones. La función oferta_sin_postulaciones bypasea RLS
-- en postulaciones para evitar ciclos de policies.
--
-- Las oferta_categorias asociadas se eliminan automáticamente
-- por el ON DELETE CASCADE de migration_021.
-- ─────────────────────────────────────────────────────────────

drop policy if exists "ofertas: eliminar (empresa propia, pendiente, sin postulaciones)" on public.ofertas;
create policy "ofertas: eliminar (empresa propia, pendiente, sin postulaciones)"
  on public.ofertas for delete
  using (
    public.rol_actual() = 'empresa'
    and empresa_id = (select id from public.empresas where usuario_id = auth.uid())
    and estado = 'pendiente_aprobacion'
    and public.oferta_sin_postulaciones(id)
  );
