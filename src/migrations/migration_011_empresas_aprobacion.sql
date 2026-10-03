-- ============================================================
-- Portal Municipal de Empleo — Migración 011
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================
-- Agrega el flujo de aprobación de empresas:
--   · Tres nuevas columnas en public.empresas
--   · Trigger que impide a empresas auto-aprobar su estado
--   · Política RLS para que municipalidad actualice el estado
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Columnas de aprobación en empresas
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.empresas
  ADD COLUMN estado_aprobacion text        NOT NULL DEFAULT 'pendiente'
    CHECK (estado_aprobacion IN ('pendiente', 'aprobada', 'rechazada')),
  ADD COLUMN fecha_decision    timestamptz,
  ADD COLUMN motivo_rechazo    text;

-- ─────────────────────────────────────────────────────────────
-- 2. Función del trigger
--
-- Lógica de permisos:
--   · service_role → auth.uid() devuelve NULL → rol_actual() devuelve NULL → permitido
--   · municipalidad → rol_actual() = 'municipalidad' → permitido
--   · empresa/postulante → columna cambió → EXCEPCIÓN
--
-- SECURITY DEFINER SET search_path = '' sigue la convención de migration_006;
-- bajo search_path vacío se requiere calificación completa: public.rol_actual().
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_empresa_estado_change_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF public.rol_actual() IS NOT NULL
     AND public.rol_actual()::text != 'municipalidad'
  THEN
    IF (NEW.estado_aprobacion IS DISTINCT FROM OLD.estado_aprobacion)
    OR (NEW.fecha_decision    IS DISTINCT FROM OLD.fecha_decision)
    OR (NEW.motivo_rechazo    IS DISTINCT FROM OLD.motivo_rechazo)
    THEN
      RAISE EXCEPTION 'No tenés permiso para modificar el estado de aprobación.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. Trigger BEFORE UPDATE en empresas
-- ─────────────────────────────────────────────────────────────
CREATE TRIGGER prevent_empresa_estado_change
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_empresa_estado_change_fn();

-- ─────────────────────────────────────────────────────────────
-- 4. Nueva política RLS: municipalidad puede actualizar
--    cualquier fila de empresas (incluidas las columnas de aprobación).
--    La política "empresas: editar propio perfil" de migration_004
--    se mantiene tal cual; el trigger protege las columnas de aprobación
--    para el rol empresa.
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "empresas: municipalidad actualiza aprobacion"
  ON public.empresas
  FOR UPDATE
  USING     (public.rol_actual() = 'municipalidad')
  WITH CHECK (public.rol_actual() = 'municipalidad');
