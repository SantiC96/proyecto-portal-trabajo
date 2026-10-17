-- ============================================================
-- Portal Municipal de Empleo — Migración 047
-- Dashboard de indicadores de la Oficina de Empleo
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_046_varios_cursos_e_informacion_laboral.sql ya aplicada.
-- Re-ejecutable sin errores. No borra ni modifica datos existentes.
-- Después de aplicarla: npm run db:tipos
-- ============================================================
--
-- Ver docs/decisiones/019-dashboard-de-indicadores.md.
--
--   BLOQUE 1  Índices sobre created_at de postulaciones y derivaciones,
--             para los filtros por período y el gráfico por mes.
--   BLOQUE 2  indicadores_portal(p_desde): totales generales e indicadores
--             del período en una sola fila.
--   BLOQUE 3  postulaciones_por_mes(): los últimos 12 meses en hora de
--             Argentina, con los meses sin postulaciones en 0.
--   BLOQUE 4  postulaciones_por_rubro(p_desde, p_limite): postulaciones por
--             categoría de la oferta, de mayor a menor, con el resto
--             agrupado en "Otros rubros".
--
-- Las tres funciones son SECURITY DEFINER (leen tablas que la oficina ve
-- por RLS y auth.users) y fallan con 42501 para cualquier rol que no sea
-- municipalidad, incluido el SQL Editor (rol NULL).
--
-- p_desde NULL = desde el inicio. El período termina siempre en now().
-- ============================================================


-- ============================================================
-- BLOQUE 1 — Índices
--
-- postulaciones y derivaciones no tenían índice por created_at (solo el
-- UNIQUE de postulaciones (oferta_id, postulante_id) y el de
-- derivaciones.postulacion_id). Son las tablas que más crecen y todas las
-- cuentas del período y el gráfico por mes filtran por created_at.
--
-- Los demás filtros usan índices que ya existen:
--   ofertas vigentes         ofertas_activas_vence_en_idx (036)
--   pre-entrevistas          pre_entrevistas_estado_fecha_idx (044)
--   cursos completados       asignaciones_curso_completado_en_idx (035)
--   rechazos de empresas     idx_derivaciones_rechazado (028)
--   rubros de la oferta      PK de oferta_categorias (oferta_id, categoria_id)
-- ============================================================

CREATE INDEX IF NOT EXISTS postulaciones_created_at_idx
  ON public.postulaciones (created_at);

CREATE INDEX IF NOT EXISTS derivaciones_created_at_idx
  ON public.derivaciones (created_at);


-- ============================================================
-- BLOQUE 2 — indicadores_portal
--
-- Totales generales (sin período):
--   postulantes_registrados   filas de postulantes.
--   empresas_aprobadas        estado_aprobacion = 'aprobada'.
--   empresas_rechazadas       estado_aprobacion = 'rechazada'.
--   empresas_pendientes       'pendiente' con el email confirmado: las que
--                             no lo confirmaron no existen para la oficina
--                             (mismo criterio que empresas_email_sin_confirmar,
--                             042). La base no deja aprobar ni rechazar sin
--                             email confirmado, así que solo puede haber
--                             pendientes sin confirmar.
--   ofertas_vigentes          estado 'activa' y vence_en > now(): las que se
--                             ven en el portal (036).
--
-- En el período (fecha del evento >= p_desde):
--   postulaciones_nuevas      postulaciones.created_at.
--   derivaciones_empresas     derivaciones.created_at.
--   contrataciones            estado_empresa 'contratado', por fecha del
--                             resultado.
--   rechazos_empresas         estado_empresa 'rechazado', por fecha del
--                             resultado.
--   no_seleccionados_oficina  postulaciones 'rechazada_municipalidad', por
--                             updated_at (misma fecha que usa
--                             postulaciones_no_seleccionadas, 038).
--   pre_entrevistas_realizadas estado 'realizada', por fecha_hora.
--   cursos_asignados          asignaciones_curso.created_at.
--   cursos_completados        estado 'completado', por completado_en.
--
-- Fecha del resultado de la empresa: fecha_respuesta, que el trigger de
-- derivaciones completa al pasar a un estado final (028/029); updated_at
-- solo para filas viejas sin fecha_respuesta (igual que 038).
--
-- Derivados del período:
--   tasa_contratacion         contrataciones / (contrataciones + rechazos
--                             de empresas) × 100, con un decimal. NULL si
--                             no hubo resultados finales.
--   dias_promedio_derivacion  promedio de días entre postulaciones.created_at
--                             y derivaciones.created_at, de las derivaciones
--                             del período, con un decimal. NULL si no hubo.
-- ============================================================

CREATE OR REPLACE FUNCTION public.indicadores_portal(p_desde timestamptz DEFAULT NULL)
RETURNS TABLE (
  postulantes_registrados    bigint,
  empresas_aprobadas         bigint,
  empresas_rechazadas        bigint,
  empresas_pendientes        bigint,
  ofertas_vigentes           bigint,
  postulaciones_nuevas       bigint,
  derivaciones_empresas      bigint,
  contrataciones             bigint,
  rechazos_empresas          bigint,
  no_seleccionados_oficina   bigint,
  pre_entrevistas_realizadas bigint,
  cursos_asignados           bigint,
  cursos_completados         bigint,
  tasa_contratacion          numeric,
  dias_promedio_derivacion   numeric
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_contrataciones bigint;
  v_rechazos       bigint;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT
    pg_catalog.count(*) FILTER (WHERE d.estado_empresa = 'contratado'),
    pg_catalog.count(*) FILTER (WHERE d.estado_empresa = 'rechazado')
  INTO v_contrataciones, v_rechazos
  FROM public.derivaciones d
  WHERE d.estado_empresa IN ('contratado', 'rechazado')
    AND (p_desde IS NULL OR COALESCE(d.fecha_respuesta, d.updated_at) >= p_desde);

  RETURN QUERY
  SELECT
    (SELECT pg_catalog.count(*) FROM public.postulantes pt),

    (SELECT pg_catalog.count(*) FROM public.empresas e
      WHERE e.estado_aprobacion = 'aprobada'),

    (SELECT pg_catalog.count(*) FROM public.empresas e
      WHERE e.estado_aprobacion = 'rechazada'),

    (SELECT pg_catalog.count(*)
       FROM public.empresas e
       JOIN auth.users au ON au.id = e.usuario_id
      WHERE e.estado_aprobacion = 'pendiente'
        AND au.email_confirmed_at IS NOT NULL),

    (SELECT pg_catalog.count(*) FROM public.ofertas o
      WHERE o.estado = 'activa'
        AND o.vence_en > pg_catalog.now()),

    (SELECT pg_catalog.count(*) FROM public.postulaciones po
      WHERE p_desde IS NULL OR po.created_at >= p_desde),

    (SELECT pg_catalog.count(*) FROM public.derivaciones d
      WHERE p_desde IS NULL OR d.created_at >= p_desde),

    v_contrataciones,

    v_rechazos,

    (SELECT pg_catalog.count(*) FROM public.postulaciones po
      WHERE po.estado = 'rechazada_municipalidad'
        AND (p_desde IS NULL OR po.updated_at >= p_desde)),

    (SELECT pg_catalog.count(*) FROM public.pre_entrevistas pe
      WHERE pe.estado = 'realizada'
        AND pe.fecha_hora <= pg_catalog.now()
        AND (p_desde IS NULL OR pe.fecha_hora >= p_desde)),

    (SELECT pg_catalog.count(*) FROM public.asignaciones_curso ac
      WHERE p_desde IS NULL OR ac.created_at >= p_desde),

    (SELECT pg_catalog.count(*) FROM public.asignaciones_curso ac
      WHERE ac.estado = 'completado'
        AND (p_desde IS NULL OR ac.completado_en >= p_desde)),

    CASE
      WHEN v_contrataciones + v_rechazos = 0 THEN NULL
      ELSE pg_catalog.round(
        v_contrataciones::numeric * 100 / (v_contrataciones + v_rechazos), 1)
    END,

    (SELECT pg_catalog.round(
              (pg_catalog.avg(EXTRACT(EPOCH FROM (d.created_at - po.created_at))) / 86400)::numeric,
              1)
       FROM public.derivaciones d
       JOIN public.postulaciones po ON po.id = d.postulacion_id
      WHERE p_desde IS NULL OR d.created_at >= p_desde);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.indicadores_portal(timestamptz) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.indicadores_portal(timestamptz) TO authenticated;


-- ============================================================
-- BLOQUE 3 — postulaciones_por_mes
-- 12 filas: el mes actual y los 11 anteriores, en hora de Argentina
-- (America/Argentina/Buenos_Aires). mes es el primer día del mes.
-- ============================================================

CREATE OR REPLACE FUNCTION public.postulaciones_por_mes()
RETURNS TABLE (
  mes      date,
  cantidad bigint
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_tz          constant text := 'America/Argentina/Buenos_Aires';
  v_mes_actual  date;
  v_primer_mes  date;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  v_mes_actual := pg_catalog.date_trunc('month', pg_catalog.timezone(v_tz, pg_catalog.now()))::date;
  v_primer_mes := (v_mes_actual - pg_catalog.make_interval(months => 11))::date;

  RETURN QUERY
  WITH meses AS (
    SELECT (v_primer_mes + pg_catalog.make_interval(months => g.n))::date AS mes
    FROM pg_catalog.generate_series(0, 11) AS g(n)
  ),
  conteo AS (
    SELECT
      pg_catalog.date_trunc('month', pg_catalog.timezone(v_tz, po.created_at))::date AS mes,
      pg_catalog.count(*) AS cantidad
    FROM public.postulaciones po
    -- Medianoche del primer mes en Argentina, como timestamptz: usa el índice.
    WHERE po.created_at >= pg_catalog.timezone(v_tz, v_primer_mes::timestamp)
    GROUP BY 1
  )
  SELECT m.mes, COALESCE(c.cantidad, 0)::bigint
  FROM meses m
  LEFT JOIN conteo c ON c.mes = m.mes
  ORDER BY m.mes;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.postulaciones_por_mes() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.postulaciones_por_mes() TO authenticated;


-- ============================================================
-- BLOQUE 4 — postulaciones_por_rubro
-- Rubro = categoría de la oferta (oferta_categorias). Una oferta puede tener
-- varias categorías: la postulación cuenta una vez en cada una, así que la
-- suma puede superar el total de postulaciones del período. Las ofertas sin
-- categoría cuentan como "Sin rubro".
-- Devuelve los p_limite rubros con más postulaciones (entre 1 y 20, 8 por
-- defecto) y, si sobran, una fila "Otros rubros" con la suma del resto
-- (es_otros = true). Empate: por nombre.
-- ============================================================

CREATE OR REPLACE FUNCTION public.postulaciones_por_rubro(
  p_desde  timestamptz DEFAULT NULL,
  p_limite integer     DEFAULT 8
)
RETURNS TABLE (
  rubro    text,
  cantidad bigint,
  es_otros boolean
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_limite integer := GREATEST(1, LEAST(COALESCE(p_limite, 8), 20));
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH por_rubro AS (
    SELECT
      COALESCE(c.nombre, 'Sin rubro')::text AS rubro,
      pg_catalog.count(*) AS cantidad
    FROM public.postulaciones po
    LEFT JOIN public.oferta_categorias oc ON oc.oferta_id = po.oferta_id
    LEFT JOIN public.categorias c         ON c.id = oc.categoria_id
    WHERE p_desde IS NULL OR po.created_at >= p_desde
    GROUP BY COALESCE(c.nombre, 'Sin rubro')
  ),
  ranking AS (
    SELECT
      pr.rubro,
      pr.cantidad,
      pg_catalog.row_number() OVER (ORDER BY pr.cantidad DESC, pr.rubro) AS puesto
    FROM por_rubro pr
  ),
  resultado AS (
    SELECT r.rubro, r.cantidad, false AS es_otros, r.puesto
    FROM ranking r
    WHERE r.puesto <= v_limite
    UNION ALL
    SELECT 'Otros rubros'::text, pg_catalog.sum(r.cantidad)::bigint, true, v_limite + 1
    FROM ranking r
    WHERE r.puesto > v_limite
    HAVING pg_catalog.count(*) > 0
  )
  SELECT res.rubro, res.cantidad, res.es_otros
  FROM resultado res
  ORDER BY res.puesto;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.postulaciones_por_rubro(timestamptz, integer) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.postulaciones_por_rubro(timestamptz, integer) TO authenticated;
