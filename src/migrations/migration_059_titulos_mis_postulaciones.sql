-- ============================================================
-- Portal Municipal de Empleo — Migración 059
-- Mis postulaciones muestra el título de la oferta aunque el postulante ya no
-- la pueda leer (cerrada, vencida, retirada o eliminada)
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_058_dashboard_postulante.sql ya aplicada.
-- Re-ejecutable sin errores. No cambia ninguna fila, tabla ni política: solo
-- crea una función de lectura.
-- Después de aplicarla: npm run db:tipos
-- ============================================================
--
-- Ver docs/decisiones/029-dashboard-postulante.md.
--
--   BLOQUE 1  ofertas_de_mis_postulaciones(p_postulacion_ids) (postulante).
--
-- Las políticas RLS de ofertas no cambian: el postulante sigue sin leer una
-- oferta que dejó de estar publicada. Esta función le devuelve solo el título
-- y la empresa de las ofertas a las que se postuló, lo mismo que ya le
-- muestra el panel (ultimos_movimientos_postulante, 058).
--
-- Errores:
--   42501  sin permiso ('No autorizado').
--   P0001  más de 100 ids.
-- ============================================================


-- ============================================================
-- BLOQUE 1 — ofertas_de_mis_postulaciones(p_postulacion_ids)
--
-- Para las postulaciones de la lista que son del postulante de la sesión
-- (auth.uid()): postulacion_id, oferta_id, titulo y empresa_nombre (NULL si
-- está vacío). Los ids que no son suyos o no existen se ignoran sin error.
-- Una postulación cuya oferta ya no existe tampoco devuelve fila. Nunca
-- devuelve notas ni datos de otras personas.
-- Hasta 100 ids por llamada (Mis postulaciones pide como mucho una página).
-- ============================================================

CREATE OR REPLACE FUNCTION public.ofertas_de_mis_postulaciones(p_postulacion_ids uuid[])
RETURNS TABLE (
  postulacion_id  uuid,
  oferta_id       uuid,
  titulo          text,
  empresa_nombre  text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_postulante_id uuid;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'postulante' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(pg_catalog.cardinality(p_postulacion_ids), 0) > 100 THEN
    RAISE EXCEPTION 'Se pueden pedir hasta 100 postulaciones por vez.';
  END IF;

  SELECT p.id INTO v_postulante_id
  FROM public.postulantes p
  WHERE p.usuario_id = auth.uid();

  IF v_postulante_id IS NULL OR p_postulacion_ids IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    po.id,
    o.id,
    o.titulo,
    NULLIF(pg_catalog.btrim(o.empresa_nombre), '')
  FROM public.postulaciones po
  JOIN public.ofertas o ON o.id = po.oferta_id
  WHERE po.id = ANY (p_postulacion_ids)
    AND po.postulante_id = v_postulante_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ofertas_de_mis_postulaciones(uuid[]) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.ofertas_de_mis_postulaciones(uuid[]) TO authenticated;


-- ============================================================
-- Verificación (opcional, en el SQL Editor)
-- ============================================================
-- Sin sesión de postulante falla con 42501:
-- select * from public.ofertas_de_mis_postulaciones(array[]::uuid[]);


-- ============================================================
-- ROLLBACK (comentado). Ejecutar a mano solo si hace falta volver atrás.
-- No hay datos que restaurar. Antes, volver a la versión anterior de Mis
-- postulaciones ("Oferta no disponible" para las ofertas que no se pueden
-- leer), que no llama a esta función.
-- ============================================================
--
-- DROP FUNCTION IF EXISTS public.ofertas_de_mis_postulaciones(uuid[]);
