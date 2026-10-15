-- ============================================================
-- Portal Municipal de Empleo — Migración 039
-- Asignar curso solo a postulantes que lo necesitan
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_038_cursos_sin_abandono_y_notificaciones.sql ya aplicada.
-- Re-ejecutable sin errores. No borra ni modifica datos existentes.
-- ============================================================
--
-- Reemplaza asignaciones_curso_alta_fn (migration_038). Misma lógica, más
-- una validación nueva:
--   Municipalidad: solo puede crear la asignación si el postulante necesita
--     curso según public.estado_cursos_postulantes() (3 o más rechazos en
--     90 días, posteriores al último curso completado, sin asignación
--     activa). Si no, P0001: "Solo se puede asignar un curso a postulantes
--     con 3 o más rechazos recientes."
--   Sin rol (SQL Editor o service role): se permite igual, para
--     correcciones manuales de datos.
--
-- El control de asignación activa va primero para conservar su mensaje
-- (con una asignación activa necesita_curso ya es false).
-- Las asignaciones existentes no se tocan.
-- ============================================================


-- ============================================================
-- BLOQUE 1 — Trigger BEFORE INSERT de asignaciones_curso (reemplazo)
-- ============================================================

CREATE OR REPLACE FUNCTION public.asignaciones_curso_alta_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_rol text := public.rol_actual()::text;
  v_necesita boolean;
BEGIN
  NEW.estado        := 'asignado';
  NEW.iniciado_en   := NULL;
  NEW.completado_en := NULL;
  NEW.abandonado_en := NULL;
  NEW.updated_at    := now();

  IF EXISTS (
    SELECT 1
    FROM public.asignaciones_curso ac
    WHERE ac.postulante_id = NEW.postulante_id
      AND ac.estado IN ('asignado', 'en_curso')
  ) THEN
    RAISE EXCEPTION 'Este postulante ya tiene un curso asignado o en curso. Podrá recibir otro cuando complete el actual.';
  END IF;

  IF v_rol IS NOT DISTINCT FROM 'municipalidad' THEN
    SELECT e.necesita_curso INTO v_necesita
    FROM public.estado_cursos_postulantes(ARRAY[NEW.postulante_id]) e;

    IF v_necesita IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Solo se puede asignar un curso a postulantes con 3 o más rechazos recientes.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS asignaciones_curso_alta ON public.asignaciones_curso;
CREATE TRIGGER asignaciones_curso_alta
  BEFORE INSERT ON public.asignaciones_curso
  FOR EACH ROW EXECUTE FUNCTION public.asignaciones_curso_alta_fn();
