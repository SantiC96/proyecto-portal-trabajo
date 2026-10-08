-- ============================================================
-- Portal Municipal de Empleo — Migración 026
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_025_delete_policy_rechazada.sql ya aplicada.
-- ============================================================
-- Agrega las columnas de revisión a public.ofertas y extiende el
-- sistema de permisos por columna para soportar aprobar/rechazar
-- desde el panel de la oficina.
--
-- Columnas nuevas:
--   publicado_en  — timestamp de la primera publicación (se fija
--                   al aprobar por primera vez y no se sobreescribe
--                   en revisiones posteriores)
--   revisado_por  — usuario de la oficina que tomó la decisión
--   revisado_en   — timestamp de la decisión
--
-- Seguridad:
--   Las tres columnas se agregan al grant de UPDATE de authenticated
--   para que la municipalidad pueda escribirlas usando su sesión.
--   El trigger prevent_empresa_oferta_campos_fn se extiende para
--   bloquear que el rol empresa las modifique, incluso si la policy
--   RLS les permite actualizar su propia fila.
--   La WITH CHECK del UPDATE de empresa ya bloquea establecer
--   estado = 'activa', reforzando la imposibilidad de auto-aprobarse.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- BLOQUE 1 — Columnas nuevas en public.ofertas
-- ─────────────────────────────────────────────────────────────

alter table public.ofertas
  add column if not exists publicado_en  timestamptz,
  add column if not exists revisado_por  uuid references auth.users(id),
  add column if not exists revisado_en   timestamptz;

-- ─────────────────────────────────────────────────────────────
-- BLOQUE 2 — Actualizar el grant de UPDATE
-- Se revocan los permisos previos y se re-emiten incluyendo las tres
-- columnas nuevas. El patrón de revoke + grant selectivo sigue el de
-- migration_021.
-- ─────────────────────────────────────────────────────────────

revoke update on public.ofertas from authenticated;
grant update (titulo, descripcion, ubicacion, modalidad, jornada,
              requisitos, beneficios, estado, empresa_nombre,
              motivo_rechazo, updated_at,
              publicado_en, revisado_por, revisado_en)
  on public.ofertas to authenticated;

-- ─────────────────────────────────────────────────────────────
-- BLOQUE 3 — Extender trigger de protección para empresa
-- Se reemplaza la función prevent_empresa_oferta_campos_fn (definida
-- en migration_021) para incluir las tres columnas nuevas. El trigger
-- en la tabla no cambia; al reemplazar la función, el trigger usará
-- automáticamente la versión actualizada.
--
-- El bloqueo solo aplica cuando rol_actual() = 'empresa'. El service
-- role (supabaseAdmin) tiene auth.uid() = null y por tanto
-- rol_actual() = null, por lo que el bloqueo no lo afecta.
-- ─────────────────────────────────────────────────────────────

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
    if new.publicado_en is distinct from old.publicado_en then
      raise exception 'No tenés permiso para modificar la fecha de publicación.';
    end if;
    if new.revisado_por is distinct from old.revisado_por then
      raise exception 'No tenés permiso para modificar el revisor de la oferta.';
    end if;
    if new.revisado_en is distinct from old.revisado_en then
      raise exception 'No tenés permiso para modificar la fecha de revisión.';
    end if;
  end if;
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN DE SEGURIDAD
-- Resumen de por qué empresa no puede auto-aprobarse:
--
-- 1. RLS WITH CHECK en "ofertas: actualizar (empresa propia)" solo
--    permite estado in ('pendiente_aprobacion', 'cerrada') → 'activa'
--    es imposible por esta vía.
--
-- 2. El trigger prevent_empresa_oferta_campos_fn bloquea la escritura
--    de publicado_en, revisado_por, revisado_en y motivo_rechazo para
--    el rol empresa, incluso con permiso de columna.
--
-- 3. Las server actions de aprobación/rechazo verifican rol_actual()
--    en el servidor antes de ejecutar el UPDATE.
-- ─────────────────────────────────────────────────────────────
