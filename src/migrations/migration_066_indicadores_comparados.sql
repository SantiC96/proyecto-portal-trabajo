-- ============================================================
-- Portal Municipal de Empleo — Migración 066
-- Indicadores de la Oficina comparados con el período anterior
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_065_ofertas_vigentes_por_rubro.sql ya aplicada.
-- Re-ejecutable sin errores. No borra ni modifica datos existentes.
-- Después de aplicarla: npm run db:tipos
-- ============================================================
--
-- Ver docs/decisiones/032-graficos-de-indicadores.md (punto 8).
--
-- Solo lectura: tres funciones nuevas, sin tablas, columnas ni índices.
--
--   BLOQUE 1  indicadores_comparados(p_desde): los valores de las tarjetas y
--             del resumen del período, y los mismos del período anterior.
--   BLOQUE 2  series_indicadores(p_desde, p_agrupacion): por día, semana o
--             mes, postulaciones, contrataciones, postulantes registrados y
--             ofertas publicadas (mini líneas y evolución general).
--   BLOQUE 3  estado_postulaciones_periodo(p_desde): cómo están hoy las
--             postulaciones creadas en el período.
--
-- Las últimas postulaciones no necesitan función: la Oficina ya las lee con
-- una consulta común (RLS de postulaciones, postulantes, usuarios, ofertas y
-- derivaciones), como el listado de /admin/postulaciones.
--
-- Mismas reglas que indicadores_portal (047): SECURITY DEFINER con
-- search_path = '', 42501 para cualquier rol que no sea municipalidad
-- (incluido el SQL Editor, rol NULL), EXECUTE solo para authenticated y zona
-- horaria America/Argentina/Buenos_Aires para agrupar.
--
-- ── Período ──────────────────────────────────────────────────────────────
--
--   Período           [p_desde, now()].
--   Período anterior  [p_desde - (now() - p_desde), p_desde): la misma
--                     duración, justo antes. "Este año" (desde el 1 de enero)
--                     se compara con los mismos días inmediatamente
--                     anteriores, no con el mismo tramo del año pasado.
--   p_desde NULL      "Desde el inicio": todo, sin período anterior (las
--                     columnas *_anterior vuelven NULL).
--   p_desde > now()   falla con 22023.
--
-- ── Qué cuenta cada valor (BLOQUES 1 y 2) ────────────────────────────────
--
--   postulantes_registrados  Total de filas de postulantes, sin período
--                            (igual que indicadores_portal).
--   postulantes_nuevos       Postulantes con created_at en el período: los
--                            que se registraron. Es la base de la variación
--                            de la tarjeta "Postulantes registrados" y de su
--                            mini línea. No descuenta cuentas borradas
--                            después (ya no tienen fila: no cuentan en
--                            ningún período).
--   ofertas_vigentes         Hoy: estado 'activa' y vence_en > now(), como
--                            indicadores_portal y el listado público (036).
--   ofertas_publicadas       APROXIMACIÓN. La base no guarda qué ofertas
--                            estaban vigentes en una fecha pasada (no hay
--                            historial de estado ni fecha de cierre, y
--                            vence_en cambia al renovar), así que la
--                            variación y la mini línea de "Ofertas vigentes"
--                            usan las ofertas PUBLICADAS en cada período:
--                            fecha de publicación >= desde. Fecha de
--                            publicación = publicado_en (la primera
--                            aprobación, 026); para las ofertas anteriores a
--                            026 sin publicado_en, created_at si están
--                            'activa' o 'cerrada' (mismo criterio que
--                            indicadores_empresa, 049). Una oferta cuenta
--                            una sola vez, en el período de su primera
--                            publicación, aunque después se cierre, se
--                            rechace una edición o se elimine. No cuenta
--                            borradores ni ofertas que nunca se aprobaron.
--   postulaciones_nuevas     postulaciones.created_at en el período, sin
--                            excluir ninguna (igual que indicadores_portal y
--                            postulaciones_por_periodo: la suma de la serie
--                            coincide con la tarjeta).
--   derivaciones             derivaciones.created_at en el período (igual
--                            que derivaciones_empresas de indicadores_portal).
--   contrataciones           Derivaciones con estado_empresa 'contratado',
--                            por la fecha del resultado: fecha_respuesta, o
--                            updated_at en filas viejas sin ella (igual que
--                            indicadores_portal). Una contratación del
--                            período puede venir de una postulación de un
--                            período anterior.
--   tasa_contratacion        contrataciones / postulaciones_nuevas × 100 del
--                            mismo período, con un decimal; NULL si no hubo
--                            postulaciones. Es una razón entre cantidades
--                            del período, no un seguimiento de cada
--                            postulación: como las contrataciones pueden
--                            venir de postulaciones anteriores, en un
--                            período muy corto podría superar 100 (no se
--                            recorta). No es la tasa de indicadores_portal
--                            (contrataciones sobre resultados finales de las
--                            empresas).
--
-- La serie (BLOQUE 2) cuenta lo mismo por día, semana o mes: la suma de cada
-- columna es el valor del período del BLOQUE 1 con el mismo p_desde.
--
-- ── Estado de las postulaciones (BLOQUE 3) ───────────────────────────────
--
-- Postulaciones creadas en el período, según su estado HOY (no el que tenían
-- al final del período). Cada postulación cae en una sola columna y las
-- cinco suman postulaciones_nuevas:
--
--   en_revision          estado 'recibida' o 'en_revision'.
--   derivadas            estado 'derivada' con la derivación pendiente, en
--                        proceso o contratada (o sin fila de derivación).
--   rechazadas           estado 'rechazada_municipalidad' (no seleccionadas
--                        por la Oficina), o 'derivada' con estado_empresa
--                        'rechazado' (no seleccionadas por la empresa).
--   retiradas            estado 'retirada_postulante' (053), o 'derivada'
--                        con estado_empresa 'retirada_postulante' (no debería
--                        pasar: el retiro cambia las dos).
--   de_ofertas_retiradas estado 'oferta_retirada', o 'derivada' con
--                        estado_empresa 'oferta_retirada' (051: al retirar
--                        la oferta, la postulación derivada sigue 'derivada').
--
-- Las dos últimas no van en la dona "Estado de postulaciones": no son una
-- revisión, una derivación ni un rechazo, sino una decisión del postulante o
-- de la empresa (decisiones 024 y 025: el retiro no es un rechazo). Se
-- devuelven aparte para que la pantalla diga cuántas quedaron afuera y la
-- diferencia con "Postulaciones nuevas" no quede sin explicar.
-- ============================================================


-- ============================================================
-- BLOQUE 1 — indicadores_comparados
-- ============================================================

CREATE OR REPLACE FUNCTION public.indicadores_comparados(p_desde timestamptz DEFAULT NULL)
RETURNS TABLE (
  postulantes_registrados       bigint,
  postulantes_nuevos            bigint,
  postulantes_nuevos_anterior   bigint,
  ofertas_vigentes              bigint,
  ofertas_publicadas            bigint,
  ofertas_publicadas_anterior   bigint,
  postulaciones_nuevas          bigint,
  postulaciones_nuevas_anterior bigint,
  derivaciones                  bigint,
  derivaciones_anterior         bigint,
  contrataciones                bigint,
  contrataciones_anterior       bigint,
  tasa_contratacion             numeric,
  tasa_contratacion_anterior    numeric
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_ahora    constant timestamptz := pg_catalog.now();
  v_anterior timestamptz;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  IF p_desde > v_ahora THEN
    RAISE EXCEPTION 'El período no puede empezar en el futuro' USING ERRCODE = '22023';
  END IF;

  -- NULL si p_desde es NULL: los FILTER del período anterior no cuentan nada.
  v_anterior := p_desde - (v_ahora - p_desde);

  RETURN QUERY
  WITH
  postulantes AS (
    SELECT
      pg_catalog.count(*) AS total,
      pg_catalog.count(*) FILTER (WHERE p_desde IS NULL OR pt.created_at >= p_desde) AS actual,
      pg_catalog.count(*) FILTER (WHERE pt.created_at >= v_anterior AND pt.created_at < p_desde) AS anterior
    FROM public.postulantes pt
  ),
  vigentes AS (
    SELECT pg_catalog.count(*) AS total
    FROM public.ofertas o
    WHERE o.estado = 'activa'
      AND o.vence_en > v_ahora
  ),
  publicadas AS (
    SELECT
      pg_catalog.count(*) FILTER (WHERE p_desde IS NULL OR x.fecha >= p_desde) AS actual,
      pg_catalog.count(*) FILTER (WHERE x.fecha >= v_anterior AND x.fecha < p_desde) AS anterior
    FROM (
      SELECT COALESCE(
               o.publicado_en,
               CASE WHEN o.estado IN ('activa', 'cerrada') THEN o.created_at END
             ) AS fecha
      FROM public.ofertas o
    ) x
    WHERE x.fecha IS NOT NULL
  ),
  postulaciones AS (
    SELECT
      pg_catalog.count(*) FILTER (WHERE p_desde IS NULL OR po.created_at >= p_desde) AS actual,
      pg_catalog.count(*) FILTER (WHERE po.created_at >= v_anterior AND po.created_at < p_desde) AS anterior
    FROM public.postulaciones po
    WHERE p_desde IS NULL OR po.created_at >= v_anterior
  ),
  derivadas AS (
    SELECT
      pg_catalog.count(*) FILTER (WHERE p_desde IS NULL OR d.created_at >= p_desde) AS actual,
      pg_catalog.count(*) FILTER (WHERE d.created_at >= v_anterior AND d.created_at < p_desde) AS anterior
    FROM public.derivaciones d
    WHERE p_desde IS NULL OR d.created_at >= v_anterior
  ),
  contratadas AS (
    SELECT
      pg_catalog.count(*) FILTER (WHERE p_desde IS NULL OR x.fecha >= p_desde) AS actual,
      pg_catalog.count(*) FILTER (WHERE x.fecha >= v_anterior AND x.fecha < p_desde) AS anterior
    FROM (
      SELECT COALESCE(d.fecha_respuesta, d.updated_at) AS fecha
      FROM public.derivaciones d
      WHERE d.estado_empresa = 'contratado'
    ) x
  )
  SELECT
    pt.total,
    pt.actual,
    CASE WHEN p_desde IS NULL THEN NULL ELSE pt.anterior END,
    vi.total,
    pu.actual,
    CASE WHEN p_desde IS NULL THEN NULL ELSE pu.anterior END,
    po.actual,
    CASE WHEN p_desde IS NULL THEN NULL ELSE po.anterior END,
    de.actual,
    CASE WHEN p_desde IS NULL THEN NULL ELSE de.anterior END,
    co.actual,
    CASE WHEN p_desde IS NULL THEN NULL ELSE co.anterior END,
    CASE
      WHEN po.actual = 0 THEN NULL
      ELSE pg_catalog.round(co.actual::numeric * 100 / po.actual, 1)
    END,
    CASE
      WHEN p_desde IS NULL OR po.anterior = 0 THEN NULL
      ELSE pg_catalog.round(co.anterior::numeric * 100 / po.anterior, 1)
    END
  FROM postulantes pt, vigentes vi, publicadas pu, postulaciones po, derivadas de, contratadas co;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.indicadores_comparados(timestamptz) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.indicadores_comparados(timestamptz) TO authenticated;


-- ============================================================
-- BLOQUE 2 — series_indicadores
--
-- Mismas filas que postulaciones_por_periodo (061): un día, una semana (de
-- lunes a domingo) o un mes por fila, en hora de Argentina, con los vacíos en
-- 0. La primera fila puede ser parcial (empieza en p_desde) y la última
-- termina en now().
--
--   p_desde       NULL = desde el inicio: la primera fila es la del primer
--                 evento de cualquiera de las cuatro columnas. Sin ninguno,
--                 una sola fila en 0: la actual.
--   p_agrupacion  'dia', 'semana' o 'mes'. Cualquier otro valor falla con
--                 22023.
--
-- Columnas (definidas en el encabezado): postulaciones, contrataciones,
-- postulantes_nuevos y ofertas_publicadas.
-- ============================================================

CREATE OR REPLACE FUNCTION public.series_indicadores(
  p_desde      timestamptz DEFAULT NULL,
  p_agrupacion text        DEFAULT 'mes'
)
RETURNS TABLE (
  inicio             date,
  postulaciones      integer,
  contrataciones     integer,
  postulantes_nuevos integer,
  ofertas_publicadas integer
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_tz      constant text := 'America/Argentina/Buenos_Aires';
  v_ahora   constant timestamptz := pg_catalog.now();
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

  IF p_desde > v_ahora THEN
    RAISE EXCEPTION 'El período no puede empezar en el futuro' USING ERRCODE = '22023';
  END IF;

  -- date_trunc('week') empieza el lunes. LEAST ignora los NULL.
  v_ultimo := pg_catalog.date_trunc(v_unidad, pg_catalog.timezone(v_tz, v_ahora))::date;
  v_primero := pg_catalog.date_trunc(
    v_unidad,
    pg_catalog.timezone(
      v_tz,
      COALESCE(
        p_desde,
        LEAST(
          (SELECT pg_catalog.min(po.created_at) FROM public.postulaciones po),
          (SELECT pg_catalog.min(pt.created_at) FROM public.postulantes pt),
          (SELECT pg_catalog.min(COALESCE(d.fecha_respuesta, d.updated_at))
             FROM public.derivaciones d
            WHERE d.estado_empresa = 'contratado'),
          (SELECT pg_catalog.min(COALESCE(
                    o.publicado_en,
                    CASE WHEN o.estado IN ('activa', 'cerrada') THEN o.created_at END))
             FROM public.ofertas o)
        ),
        v_ahora
      )
    )
  )::date;

  RETURN QUERY
  WITH
  periodos AS (
    SELECT g.t::date AS inicio
    FROM pg_catalog.generate_series(v_primero::timestamp, v_ultimo::timestamp, v_paso) AS g(t)
  ),
  eventos AS (
    SELECT 'postulacion'::text AS tipo, po.created_at AS fecha
    FROM public.postulaciones po
    WHERE p_desde IS NULL OR po.created_at >= p_desde
    UNION ALL
    SELECT 'contratacion', x.fecha
    FROM (
      SELECT COALESCE(d.fecha_respuesta, d.updated_at) AS fecha
      FROM public.derivaciones d
      WHERE d.estado_empresa = 'contratado'
    ) x
    WHERE p_desde IS NULL OR x.fecha >= p_desde
    UNION ALL
    SELECT 'postulante', pt.created_at
    FROM public.postulantes pt
    WHERE p_desde IS NULL OR pt.created_at >= p_desde
    UNION ALL
    SELECT 'oferta', x.fecha
    FROM (
      SELECT COALESCE(
               o.publicado_en,
               CASE WHEN o.estado IN ('activa', 'cerrada') THEN o.created_at END
             ) AS fecha
      FROM public.ofertas o
    ) x
    WHERE x.fecha IS NOT NULL
      AND (p_desde IS NULL OR x.fecha >= p_desde)
  ),
  conteo AS (
    SELECT
      pg_catalog.date_trunc(v_unidad, pg_catalog.timezone(v_tz, e.fecha))::date AS inicio,
      pg_catalog.count(*) FILTER (WHERE e.tipo = 'postulacion')  AS postulaciones,
      pg_catalog.count(*) FILTER (WHERE e.tipo = 'contratacion') AS contrataciones,
      pg_catalog.count(*) FILTER (WHERE e.tipo = 'postulante')   AS postulantes_nuevos,
      pg_catalog.count(*) FILTER (WHERE e.tipo = 'oferta')       AS ofertas_publicadas
    FROM eventos e
    -- Una fecha futura (no debería haber) no agrega filas después de hoy.
    WHERE e.fecha <= v_ahora
    GROUP BY 1
  )
  SELECT
    p.inicio,
    COALESCE(c.postulaciones, 0)::integer,
    COALESCE(c.contrataciones, 0)::integer,
    COALESCE(c.postulantes_nuevos, 0)::integer,
    COALESCE(c.ofertas_publicadas, 0)::integer
  FROM periodos p
  LEFT JOIN conteo c ON c.inicio = p.inicio
  ORDER BY p.inicio;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.series_indicadores(timestamptz, text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.series_indicadores(timestamptz, text) TO authenticated;


-- ============================================================
-- BLOQUE 3 — estado_postulaciones_periodo
-- Una fila. Las cinco columnas suman las postulaciones creadas en el período
-- (postulaciones_nuevas). Definiciones en el encabezado.
-- ============================================================

CREATE OR REPLACE FUNCTION public.estado_postulaciones_periodo(p_desde timestamptz DEFAULT NULL)
RETURNS TABLE (
  en_revision          bigint,
  derivadas            bigint,
  rechazadas           bigint,
  retiradas            bigint,
  de_ofertas_retiradas bigint
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH clasificadas AS (
    SELECT
      CASE
        WHEN po.estado IN ('recibida', 'en_revision') THEN 'en_revision'
        WHEN po.estado = 'rechazada_municipalidad' THEN 'rechazada'
        WHEN po.estado = 'retirada_postulante' THEN 'retirada'
        WHEN po.estado = 'oferta_retirada' THEN 'oferta_retirada'
        -- 'derivada': según la derivación (relación 1 a 1).
        WHEN d.estado_empresa = 'rechazado' THEN 'rechazada'
        WHEN d.estado_empresa = 'retirada_postulante' THEN 'retirada'
        WHEN d.estado_empresa = 'oferta_retirada' THEN 'oferta_retirada'
        ELSE 'derivada'
      END AS grupo
    FROM public.postulaciones po
    LEFT JOIN public.derivaciones d ON d.postulacion_id = po.id
    WHERE p_desde IS NULL OR po.created_at >= p_desde
  )
  SELECT
    pg_catalog.count(*) FILTER (WHERE c.grupo = 'en_revision'),
    pg_catalog.count(*) FILTER (WHERE c.grupo = 'derivada'),
    pg_catalog.count(*) FILTER (WHERE c.grupo = 'rechazada'),
    pg_catalog.count(*) FILTER (WHERE c.grupo = 'retirada'),
    pg_catalog.count(*) FILTER (WHERE c.grupo = 'oferta_retirada')
  FROM clasificadas c;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.estado_postulaciones_periodo(timestamptz) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.estado_postulaciones_periodo(timestamptz) TO authenticated;
