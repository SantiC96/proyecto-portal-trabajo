-- ============================================================
-- Portal Municipal de Empleo — Migración 027
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_026_revision_ofertas.sql ya aplicada.
-- ============================================================
-- Extiende prevent_empresa_oferta_campos_fn para que el trigger
-- mismo haga el reset de estado cuando la empresa edita el
-- contenido de una oferta activa o rechazada:
--
--   1. Protección intacta: si NEW trae cambios en columnas
--      protegidas (motivo_rechazo, publicado_en, revisado_por,
--      revisado_en), lanza el mismo error que antes.
--
--   2. Reset en edición legítima: si cambió alguna columna de
--      contenido y OLD.estado era 'activa' o 'rechazada', pone
--      NEW.estado = 'pendiente_aprobacion' y limpia en NEW el
--      motivo de rechazo y los datos de la revisión anterior
--      (revisado_por, revisado_en). publicado_en se conserva.
--      Como esto ocurre después del chequeo de protección, el
--      trigger no se bloquea a sí mismo.
--
--   3. Edición con oferta pendiente: sigue bloqueada por el
--      trigger prevent_empresa_editar_pendiente (migration_024),
--      que corre antes de este (orden alfabético).
--
-- Para municipalidad, la función no cambia nada: la oficina
-- sigue aprobando y rechazando como antes.
--
-- Orden de ejecución de triggers BEFORE UPDATE en public.ofertas
-- (todos son FOR EACH ROW):
--   1. ofertas_marcar_contenido_editado  (migration_022)
--   2. prevent_empresa_editar_pendiente  (migration_024)
--   3. prevent_empresa_oferta_campos     (migration_021 / este)
-- ============================================================

create or replace function public.prevent_empresa_oferta_campos_fn()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if public.rol_actual()::text = 'empresa' then

    -- ── Paso 1: protección de columnas reservadas ──────────────
    -- Ningún UPDATE enviado por la empresa puede incluir cambios en
    -- estas columnas; si los incluye se rechaza toda la operación.
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

    -- ── Paso 2: reset al reenviar (activa → pendiente o rechazada → pendiente) ──
    -- Si cambió al menos una columna de contenido publicable y la oferta
    -- estaba activa o rechazada, el trigger hace él solo el reset de estado.
    -- La acción de la empresa no necesita enviar estas columnas; eso es lo
    -- que evita que el paso 1 las bloquee.
    if old.estado in ('activa', 'rechazada')
      and (
        new.titulo            is distinct from old.titulo
        or new.descripcion    is distinct from old.descripcion
        or new.requisitos     is distinct from old.requisitos
        or new.beneficios     is distinct from old.beneficios
        or new.modalidad      is distinct from old.modalidad
        or new.jornada        is distinct from old.jornada
        or new.ubicacion      is distinct from old.ubicacion
        or new.empresa_nombre is distinct from old.empresa_nombre
      )
    then
      new.estado         := 'pendiente_aprobacion';
      new.motivo_rechazo := null;
      new.revisado_por   := null;
      new.revisado_en    := null;
      -- publicado_en se conserva: registra la primera publicación y no
      -- se sobreescribe en revisiones posteriores.
    end if;

  end if;

  return new;
end;
$$;

-- El trigger prevent_empresa_oferta_campos ya existe en la tabla desde
-- migration_021; al reemplazar solo la función, lo usa automáticamente.
-- No se necesita DROP/CREATE TRIGGER.
