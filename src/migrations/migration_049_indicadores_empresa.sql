-- ============================================================
-- Portal Municipal de Empleo — Migración 049
-- Dashboard de indicadores de la empresa
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_048_emails.sql ya aplicada.
-- Re-ejecutable sin errores. No borra ni modifica datos existentes.
-- Después de aplicarla: npm run db:tipos
-- ============================================================
--
-- Ver docs/decisiones/021-dashboard-de-empresa.md.
--
--   BLOQUE 1  Índices: no hacen falta nuevos (ver detalle).
--   BLOQUE 2  indicadores_empresa(p_desde): totales de la empresa en una
--             sola fila.
--   BLOQUE 3  indicadores_por_oferta_empresa(p_desde): una fila por oferta
--             de la empresa.
--
-- Las dos funciones son SECURITY DEFINER (la empresa no tiene SELECT en
-- postulaciones ni en derivaciones) y fallan con 42501 para cualquier rol
-- que no sea empresa, incluido el SQL Editor (rol NULL).
--
-- Qué ve cada empresa:
--   - La empresa sale siempre de auth.uid() (empresas.usuario_id), nunca de
--     un parámetro. Si no está aprobada, indicadores_empresa devuelve una
--     fila en cero e indicadores_por_oferta_empresa no devuelve filas.
--   - Solo sus ofertas (ofertas.empresa_id).
--   - De los candidatos, solo las derivaciones de esas ofertas. Las
--     postulaciones se leen únicamente a través de una derivación (JOIN, no
--     LEFT JOIN): las que la oficina no derivó no cuentan en ningún número.
--   - Ningún dato personal: las funciones devuelven solo cantidades.
--
-- p_desde NULL = desde el inicio. El período termina siempre en now().
-- El estado de las ofertas y las vacantes son la situación actual y no
-- dependen del período.
-- ============================================================


-- ============================================================
-- BLOQUE 1 — Índices
--
-- No se agregan índices. Todas las consultas parten de las ofertas de una
-- empresa y bajan por claves que ya tienen índice:
--   ofertas por empresa         ofertas_empresa_id_idx (021)
--   postulaciones por oferta    UNIQUE (oferta_id, postulante_id) (001)
--   derivación de postulación   UNIQUE (postulacion_id) (001)
--   vacantes de la oferta       PK de oferta_vacantes (029)
-- Los filtros por fecha se aplican sobre las derivaciones de una sola
-- empresa, que son pocas: un índice por fecha no se usaría.
-- ============================================================


-- ============================================================
-- BLOQUE 2 — indicadores_empresa
--
-- Ofertas (situación actual, mismo criterio que el inicio del panel):
--   ofertas_totales           todas las ofertas de la empresa.
--   ofertas_vigentes          estado 'activa' y vence_en > now(): las que se
--                             ven en el portal (036).
--   ofertas_pendientes        estado 'pendiente_aprobacion'.
--   ofertas_vencidas          estado 'activa' y vence_en <= now() (siguen
--                             'activa' en la base, 036).
--   ofertas_cerradas          estado 'cerrada'.
--   ofertas_rechazadas        estado 'rechazada'.
--
-- Vacantes (situación actual), de las ofertas publicadas alguna vez
-- (publicado_en no nulo, o estado 'activa' / 'cerrada' para las ofertas
-- anteriores a 026, que no tienen publicado_en):
--   vacantes_totales          suma de oferta_vacantes.cantidad.
--   vacantes_cubiertas        seleccionados de cada oferta, como máximo sus
--                             vacantes (desde 040 la base no deja
--                             seleccionar más; el tope cubre datos viejos).
--
-- En el período (fecha del evento >= p_desde):
--   candidatos_derivados      derivaciones.created_at.
--   entrevistas_coordinadas   derivaciones con fecha_entrevista, por esa
--                             fecha (incluye las próximas). La base no
--                             guarda cuándo se coordinó; al reprogramar,
--                             cuenta la fecha nueva.
--   seleccionados             estado_empresa 'contratado', por fecha del
--                             resultado.
--   no_seleccionados          estado_empresa 'rechazado', por fecha del
--                             resultado.
--   dias_promedio_contratacion promedio de días entre derivaciones.created_at
--                             y la fecha del resultado, de los seleccionados
--                             del período, con un decimal. NULL si no hubo.
--
-- Fecha del resultado: fecha_respuesta, que completa el trigger de
-- derivaciones (028/029); updated_at solo para filas viejas sin
-- fecha_respuesta (igual que 038 y 047).
-- ============================================================

CREATE OR REPLACE FUNCTION public.indicadores_empresa(p_desde timestamptz DEFAULT NULL)
RETURNS TABLE (
  ofertas_totales            bigint,
  ofertas_vigentes           bigint,
  ofertas_pendientes         bigint,
  ofertas_vencidas           bigint,
  ofertas_cerradas           bigint,
  ofertas_rechazadas         bigint,
  vacantes_totales           bigint,
  vacantes_cubiertas         bigint,
  candidatos_derivados       bigint,
  entrevistas_coordinadas    bigint,
  seleccionados              bigint,
  no_seleccionados           bigint,
  dias_promedio_contratacion numeric
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_empresa_id uuid;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'empresa' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT e.id INTO v_empresa_id
  FROM public.empresas e
  WHERE e.usuario_id = auth.uid()
    AND e.estado_aprobacion = 'aprobada';

  IF v_empresa_id IS NULL THEN
    RETURN QUERY
    SELECT 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint,
           0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint,
           NULL::numeric;
    RETURN;
  END IF;

  RETURN QUERY
  WITH mis_ofertas AS (
    SELECT o.id, o.estado, o.vence_en, o.publicado_en
    FROM public.ofertas o
    WHERE o.empresa_id = v_empresa_id
  ),
  mis_derivaciones AS (
    SELECT
      po.oferta_id,
      d.estado_empresa,
      d.created_at,
      d.fecha_entrevista,
      COALESCE(d.fecha_respuesta, d.updated_at) AS fecha_resultado
    FROM mis_ofertas mo
    JOIN public.postulaciones po ON po.oferta_id = mo.id
    JOIN public.derivaciones d   ON d.postulacion_id = po.id
  ),
  cobertura AS (
    SELECT
      COALESCE(ov.cantidad, 0) AS vacantes,
      (SELECT pg_catalog.count(*)
         FROM mis_derivaciones md
        WHERE md.oferta_id = mo.id
          AND md.estado_empresa = 'contratado') AS seleccionados_total
    FROM mis_ofertas mo
    LEFT JOIN public.oferta_vacantes ov ON ov.oferta_id = mo.id
    WHERE mo.publicado_en IS NOT NULL
       OR mo.estado IN ('activa', 'cerrada')
  )
  SELECT
    (SELECT pg_catalog.count(*) FROM mis_ofertas mo),

    (SELECT pg_catalog.count(*) FROM mis_ofertas mo
      WHERE mo.estado = 'activa'
        AND mo.vence_en > pg_catalog.now()),

    (SELECT pg_catalog.count(*) FROM mis_ofertas mo
      WHERE mo.estado = 'pendiente_aprobacion'),

    (SELECT pg_catalog.count(*) FROM mis_ofertas mo
      WHERE mo.estado = 'activa'
        AND mo.vence_en <= pg_catalog.now()),

    (SELECT pg_catalog.count(*) FROM mis_ofertas mo
      WHERE mo.estado = 'cerrada'),

    (SELECT pg_catalog.count(*) FROM mis_ofertas mo
      WHERE mo.estado = 'rechazada'),

    (SELECT COALESCE(pg_catalog.sum(c.vacantes), 0)::bigint FROM cobertura c),

    (SELECT COALESCE(pg_catalog.sum(LEAST(c.seleccionados_total, c.vacantes)), 0)::bigint
       FROM cobertura c),

    (SELECT pg_catalog.count(*) FROM mis_derivaciones md
      WHERE p_desde IS NULL OR md.created_at >= p_desde),

    (SELECT pg_catalog.count(*) FROM mis_derivaciones md
      WHERE md.fecha_entrevista IS NOT NULL
        AND (p_desde IS NULL OR md.fecha_entrevista >= p_desde)),

    (SELECT pg_catalog.count(*) FROM mis_derivaciones md
      WHERE md.estado_empresa = 'contratado'
        AND (p_desde IS NULL OR md.fecha_resultado >= p_desde)),

    (SELECT pg_catalog.count(*) FROM mis_derivaciones md
      WHERE md.estado_empresa = 'rechazado'
        AND (p_desde IS NULL OR md.fecha_resultado >= p_desde)),

    (SELECT pg_catalog.round(
              (pg_catalog.avg(EXTRACT(EPOCH FROM (md.fecha_resultado - md.created_at))) / 86400)::numeric,
              1)
       FROM mis_derivaciones md
      WHERE md.estado_empresa = 'contratado'
        AND (p_desde IS NULL OR md.fecha_resultado >= p_desde));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.indicadores_empresa(timestamptz) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.indicadores_empresa(timestamptz) TO authenticated;


-- ============================================================
-- BLOQUE 3 — indicadores_por_oferta_empresa
--
-- Una fila por oferta de la empresa, en cualquier estado, de la más nueva
-- a la más vieja (mismo orden que Mis ofertas).
--   estado, vence_en          tal como están en la base: la aplicación
--                             muestra "Vencida" con estadoVencimiento().
--   vacantes                  oferta_vacantes.cantidad (NULL si la oferta no
--                             tiene fila, no debería pasar desde 029).
--   cubiertas                 seleccionados desde siempre, como máximo las
--                             vacantes. Situación actual.
--   derivados, entrevistas,   en el período, con las mismas fechas que
--   seleccionados             indicadores_empresa.
-- ============================================================

CREATE OR REPLACE FUNCTION public.indicadores_por_oferta_empresa(p_desde timestamptz DEFAULT NULL)
RETURNS TABLE (
  oferta_id     uuid,
  titulo        text,
  estado        public.estado_oferta,
  vence_en      timestamptz,
  vacantes      integer,
  cubiertas     bigint,
  derivados     bigint,
  entrevistas   bigint,
  seleccionados bigint
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_empresa_id uuid;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'empresa' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT e.id INTO v_empresa_id
  FROM public.empresas e
  WHERE e.usuario_id = auth.uid()
    AND e.estado_aprobacion = 'aprobada';

  IF v_empresa_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH por_oferta AS (
    SELECT
      po.oferta_id,
      pg_catalog.count(*) FILTER (WHERE d.estado_empresa = 'contratado') AS seleccionados_total,
      pg_catalog.count(*) FILTER (
        WHERE p_desde IS NULL OR d.created_at >= p_desde) AS derivados,
      pg_catalog.count(*) FILTER (
        WHERE d.fecha_entrevista IS NOT NULL
          AND (p_desde IS NULL OR d.fecha_entrevista >= p_desde)) AS entrevistas,
      pg_catalog.count(*) FILTER (
        WHERE d.estado_empresa = 'contratado'
          AND (p_desde IS NULL
               OR COALESCE(d.fecha_respuesta, d.updated_at) >= p_desde)) AS seleccionados
    FROM public.ofertas o
    JOIN public.postulaciones po ON po.oferta_id = o.id
    JOIN public.derivaciones d   ON d.postulacion_id = po.id
    WHERE o.empresa_id = v_empresa_id
    GROUP BY po.oferta_id
  )
  SELECT
    o.id,
    o.titulo,
    o.estado,
    o.vence_en,
    ov.cantidad,
    LEAST(COALESCE(p.seleccionados_total, 0), COALESCE(ov.cantidad, 0))::bigint,
    COALESCE(p.derivados, 0)::bigint,
    COALESCE(p.entrevistas, 0)::bigint,
    COALESCE(p.seleccionados, 0)::bigint
  FROM public.ofertas o
  LEFT JOIN public.oferta_vacantes ov ON ov.oferta_id = o.id
  LEFT JOIN por_oferta p              ON p.oferta_id  = o.id
  WHERE o.empresa_id = v_empresa_id
  ORDER BY o.created_at DESC, o.id DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.indicadores_por_oferta_empresa(timestamptz) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.indicadores_por_oferta_empresa(timestamptz) TO authenticated;
