-- ============================================================
-- Portal Municipal de Empleo — Migración 032
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_031 ya aplicada.
-- ============================================================
-- Agrega un trigger BEFORE INSERT OR UPDATE en public.ofertas
-- que garantiza que toda oferta tenga al menos 1 requisito
-- no vacío al momento de insertarse o al editar su contenido.
--
-- Se usa un trigger (no un CHECK) para no afectar operaciones de
-- solo estado (cerrar, aprobar, rechazar, publicar) ni las ofertas
-- existentes guardadas con requisitos vacíos — Postgres evalúa los
-- CHECK en cualquier UPDATE de la fila, incluyendo esos casos.
--
-- Orden de triggers BEFORE en public.ofertas (todos FOR EACH ROW):
--   1. ofertas_marcar_contenido_editado  (migration_022)   → m
--   2. prevent_empresa_editar_pendiente  (migration_024)   → p
--   3. prevent_empresa_oferta_campos     (migration_021/027) → p
--   4. validar_requisito_minimo_ofertas  (esta migración)   → v
-- El orden es alfabético por nombre de trigger.
-- El nuevo trigger corre después de los de protección; si alguno
-- de ellos ya lanzó un error, este nunca se ejecuta.
-- ============================================================

-- ── Función ──────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.ofertas_requisito_minimo_fn() CASCADE;

CREATE OR REPLACE FUNCTION public.ofertas_requisito_minimo_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_requisitos_limpios text[];
BEGIN
  -- Aplica solo en INSERT, o en UPDATE cuando cambió alguna columna
  -- de contenido (las mismas que detecta prevent_empresa_oferta_campos).
  -- Si el UPDATE es solo de estado o columnas de revisión, no activa.
  IF TG_OP = 'UPDATE' AND NOT (
    NEW.titulo            IS DISTINCT FROM OLD.titulo
    OR NEW.descripcion    IS DISTINCT FROM OLD.descripcion
    OR NEW.requisitos     IS DISTINCT FROM OLD.requisitos
    OR NEW.beneficios     IS DISTINCT FROM OLD.beneficios
    OR NEW.modalidad      IS DISTINCT FROM OLD.modalidad
    OR NEW.jornada        IS DISTINCT FROM OLD.jornada
    OR NEW.ubicacion      IS DISTINCT FROM OLD.ubicacion
    OR NEW.empresa_nombre IS DISTINCT FROM OLD.empresa_nombre
  ) THEN
    RETURN NEW;
  END IF;

  -- Filtrar elementos vacíos o solo espacios
  SELECT ARRAY(
    SELECT trim(r)
    FROM unnest(NEW.requisitos) AS r
    WHERE trim(r) <> ''
  ) INTO v_requisitos_limpios;

  IF array_length(v_requisitos_limpios, 1) IS NULL
     OR array_length(v_requisitos_limpios, 1) < 1
  THEN
    RAISE EXCEPTION 'La oferta tiene que tener al menos un requisito.';
  END IF;

  RETURN NEW;
END;
$$;

-- ── Trigger ──────────────────────────────────────────────────
DROP TRIGGER IF EXISTS validar_requisito_minimo_ofertas ON public.ofertas;

CREATE TRIGGER validar_requisito_minimo_ofertas
  BEFORE INSERT OR UPDATE ON public.ofertas
  FOR EACH ROW EXECUTE FUNCTION public.ofertas_requisito_minimo_fn();
