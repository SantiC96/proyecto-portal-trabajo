-- ============================================================
-- Portal Municipal de Empleo — Migración 061
-- Gráfico de postulaciones según el período elegido
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_047_indicadores_portal.sql ya aplicada.
-- Re-ejecutable sin errores. No borra ni modifica datos existentes.
-- Después de aplicarla: npm run db:tipos
-- ============================================================
--
-- Ver docs/decisiones/032-graficos-de-indicadores.md.
--
-- postulaciones_por_periodo(p_desde, p_agrupacion): las postulaciones
-- creadas desde p_desde, agrupadas por día, semana (de lunes a domingo) o
-- mes en hora de Argentina, con los días, semanas o meses sin postulaciones
-- en 0. La suma de las filas es igual a postulaciones_nuevas de
-- indicadores_portal(p_desde): las dos cuentan postulaciones.created_at >=
-- p_desde, sin excluir ninguna.
--
--   p_desde       NULL = desde el inicio: la primera fila es la del mes (o
--                 día, o semana) de la primera postulación. Sin
--                 postulaciones, una sola fila en 0: la actual.
--   p_agrupacion  'dia', 'semana' o 'mes'. Cualquier otro valor falla con
--                 22023.
--
-- La primera fila puede ser parcial: si p_desde cae a mitad de un día, de
-- una semana o de un mes, solo cuenta lo creado desde p_desde. La última
-- termina en now().
--
-- Mismas reglas que postulaciones_por_mes() (047), que no cambia:
-- SECURITY DEFINER con search_path = '', 42501 para cualquier rol que no sea
-- municipalidad (incluido el SQL Editor, rol NULL), zona horaria
-- America/Argentina/Buenos_Aires y el índice postulaciones_created_at_idx.
-- ============================================================

CREATE OR REPLACE FUNCTION public.postulaciones_por_periodo(
  p_desde      timestamptz DEFAULT NULL,
  p_agrupacion text        DEFAULT 'mes'
)
RETURNS TABLE (
  inicio   date,
  cantidad integer
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_tz      constant text := 'America/Argentina/Buenos_Aires';
  v_unidad  text;
  v_paso    interval;
  v_primero date;
  v_ultimo  date;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  CASE p_agrupacion
    WHEN 'dia'    THEN v_unidad := 'day';   v_paso := pg_catalog.make_interval(days => 1);
    WHEN 'semana' THEN v_unidad := 'week';  v_paso := pg_catalog.make_interval(weeks => 1);
    WHEN 'mes'    THEN v_unidad := 'month'; v_paso := pg_catalog.make_interval(months => 1);
    ELSE
      RAISE EXCEPTION 'Agrupación no válida: %', COALESCE(p_agrupacion, 'NULL')
        USING ERRCODE = '22023';
  END CASE;

  -- date_trunc('week') empieza el lunes.
  v_ultimo := pg_catalog.date_trunc(v_unidad, pg_catalog.timezone(v_tz, pg_catalog.now()))::date;
  v_primero := pg_catalog.date_trunc(
    v_unidad,
    pg_catalog.timezone(
      v_tz,
      COALESCE(
        p_desde,
        (SELECT pg_catalog.min(po.created_at) FROM public.postulaciones po),
        pg_catalog.now()
      )
    )
  )::date;

  RETURN QUERY
  WITH periodos AS (
    SELECT g.t::date AS inicio
    FROM pg_catalog.generate_series(v_primero::timestamp, v_ultimo::timestamp, v_paso) AS g(t)
  ),
  conteo AS (
    SELECT
      pg_catalog.date_trunc(v_unidad, pg_catalog.timezone(v_tz, po.created_at))::date AS inicio,
      pg_catalog.count(*) AS cantidad
    FROM public.postulaciones po
    WHERE p_desde IS NULL OR po.created_at >= p_desde
    GROUP BY 1
  )
  SELECT p.inicio, COALESCE(c.cantidad, 0)::integer
  FROM periodos p
  LEFT JOIN conteo c ON c.inicio = p.inicio
  ORDER BY p.inicio;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.postulaciones_por_periodo(timestamptz, text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.postulaciones_por_periodo(timestamptz, text) TO authenticated;
