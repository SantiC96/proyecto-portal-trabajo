-- ============================================================
-- Portal Municipal de Empleo — Migración 062
-- Búsqueda de ofertas con varios rubros y varias modalidades
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_036_vencimiento_ofertas.sql ya aplicada.
-- Re-ejecutable sin errores. No borra ni modifica datos existentes.
-- Después de aplicarla: npm run db:tipos
-- ============================================================
--
-- El listado público (/ofertas) permite elegir varios rubros y varias
-- modalidades a la vez (?categoria=A&categoria=B&modalidad=Presencial).
--
-- BLOQUE 1  buscar_ofertas_publicas_multiple(p_q, p_categorias,
--           p_modalidades, p_limite, p_desplazamiento): igual que
--           buscar_ofertas_publicas (036) — mismas columnas, solo ofertas
--           'activa' con vence_en > now(), mismo texto buscado, mismo orden
--           (created_at DESC, id DESC), mismo total_count para la
--           paginación, mismos topes de límite y desplazamiento, SECURITY
--           INVOKER (respeta RLS) y search_path = ''. Lo único distinto:
--             - p_categorias text[]: la oferta entra si tiene ALGUNO de los
--               rubros (OR), comparados sin mayúsculas, como en 036;
--             - p_modalidades text[]: la oferta entra si su modalidad es
--               ALGUNA de las elegidas (OR);
--             - entre rubros y modalidades, AND;
--             - una lista NULL, vacía o con solo valores en blanco no filtra.
--
-- BLOQUE 2  contar_ofertas_por_modalidad(p_q, p_categorias): cuántas
--           ofertas visibles cumplen el texto y los rubros, por modalidad,
--           sin filtrar por modalidad. Lo usa el estado vacío de /ofertas
--           para sugerir otra modalidad. Solo devuelve las modalidades con
--           al menos una oferta. Mismas reglas de visibilidad y permisos.
--
-- buscar_ofertas_publicas (036) no cambia: la sigue usando el carrusel del
-- inicio (últimas ofertas, sin filtros).
--
-- Las condiciones de texto, rubros y visibilidad están repetidas en las
-- dos funciones (y en 036): si cambian, cambiarlas en todas.
-- ============================================================


-- ============================================================
-- BLOQUE 1 — buscar_ofertas_publicas_multiple
-- ============================================================

CREATE OR REPLACE FUNCTION public.buscar_ofertas_publicas_multiple(
  p_q              text   DEFAULT NULL,
  p_categorias     text[] DEFAULT NULL,
  p_modalidades    text[] DEFAULT NULL,
  p_limite         int    DEFAULT 20,
  p_desplazamiento int    DEFAULT 0
)
RETURNS TABLE (
  id             uuid,
  empresa_nombre text,
  titulo         text,
  descripcion    text,
  created_at     timestamptz,
  publicado_en   timestamptz,
  ubicacion      text,
  modalidad      text,
  jornada        text,
  requisitos     text[],
  beneficios     text[],
  categorias     text[],
  total_count    bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH filtros AS (
    SELECT
      CASE
        WHEN pg_catalog.btrim(COALESCE(p_q, '')) = '' THEN NULL
        ELSE '%' || pg_catalog.replace(
                      pg_catalog.replace(
                        pg_catalog.replace(
                          public.normalizar_busqueda(
                            pg_catalog.left(pg_catalog.btrim(p_q), 100)
                          ),
                          '\', '\\'),
                        '%', '\%'),
                      '_', '\_') || '%'
      END                                                AS patron,
      -- NULL cuando no queda ningún valor: no filtra.
      (
        SELECT pg_catalog.array_agg(DISTINCT pg_catalog.lower(pg_catalog.btrim(x)))
        FROM pg_catalog.unnest(p_categorias) AS u(x)
        WHERE pg_catalog.btrim(COALESCE(x, '')) <> ''
      )                                                  AS categorias,
      (
        SELECT pg_catalog.array_agg(DISTINCT pg_catalog.btrim(x))
        FROM pg_catalog.unnest(p_modalidades) AS u(x)
        WHERE pg_catalog.btrim(COALESCE(x, '')) <> ''
      )                                                  AS modalidades
  ),
  coincidencias AS (
    SELECT
      o.id,
      o.empresa_nombre,
      o.titulo,
      o.descripcion,
      o.created_at,
      o.publicado_en,
      o.ubicacion,
      o.modalidad::text            AS modalidad,
      o.jornada::text              AS jornada,
      o.requisitos,
      o.beneficios,
      pg_catalog.count(*) OVER ()  AS total_count
    FROM public.ofertas o
    CROSS JOIN filtros f
    WHERE o.estado = 'activa'
      AND o.vence_en > now()
      AND (f.modalidades IS NULL OR o.modalidad::text = ANY (f.modalidades))
      AND (
        f.categorias IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.oferta_categorias oc
          JOIN public.categorias c ON c.id = oc.categoria_id
          WHERE oc.oferta_id = o.id
            AND pg_catalog.lower(c.nombre) = ANY (f.categorias)
        )
      )
      AND (
        f.patron IS NULL
        OR public.normalizar_busqueda(o.titulo)         LIKE f.patron ESCAPE '\'
        OR public.normalizar_busqueda(o.descripcion)    LIKE f.patron ESCAPE '\'
        OR public.normalizar_busqueda(o.ubicacion)      LIKE f.patron ESCAPE '\'
        OR public.normalizar_busqueda(o.empresa_nombre) LIKE f.patron ESCAPE '\'
        OR EXISTS (
          SELECT 1
          FROM pg_catalog.unnest(o.requisitos) AS r(texto)
          WHERE public.normalizar_busqueda(r.texto) LIKE f.patron ESCAPE '\'
        )
        OR EXISTS (
          SELECT 1
          FROM public.oferta_categorias oc2
          JOIN public.categorias c2 ON c2.id = oc2.categoria_id
          WHERE oc2.oferta_id = o.id
            AND public.normalizar_busqueda(c2.nombre) LIKE f.patron ESCAPE '\'
        )
      )
  )
  SELECT
    m.id,
    m.empresa_nombre,
    m.titulo,
    m.descripcion,
    m.created_at,
    m.publicado_en,
    m.ubicacion,
    m.modalidad,
    m.jornada,
    m.requisitos,
    m.beneficios,
    COALESCE(
      (
        SELECT pg_catalog.array_agg(c3.nombre ORDER BY c3.nombre)
        FROM public.oferta_categorias oc3
        JOIN public.categorias c3 ON c3.id = oc3.categoria_id
        WHERE oc3.oferta_id = m.id
      ),
      ARRAY[]::text[]
    )                                                   AS categorias,
    m.total_count
  FROM coincidencias m
  ORDER BY m.created_at DESC, m.id DESC
  LIMIT  LEAST(GREATEST(COALESCE(p_limite, 20), 1), 50)
  OFFSET GREATEST(COALESCE(p_desplazamiento, 0), 0)
$$;

REVOKE EXECUTE ON FUNCTION public.buscar_ofertas_publicas_multiple(text, text[], text[], int, int) FROM public;
GRANT  EXECUTE ON FUNCTION public.buscar_ofertas_publicas_multiple(text, text[], text[], int, int) TO anon, authenticated;


-- ============================================================
-- BLOQUE 2 — contar_ofertas_por_modalidad
-- ============================================================

CREATE OR REPLACE FUNCTION public.contar_ofertas_por_modalidad(
  p_q          text   DEFAULT NULL,
  p_categorias text[] DEFAULT NULL
)
RETURNS TABLE (
  modalidad text,
  cantidad  bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH filtros AS (
    SELECT
      CASE
        WHEN pg_catalog.btrim(COALESCE(p_q, '')) = '' THEN NULL
        ELSE '%' || pg_catalog.replace(
                      pg_catalog.replace(
                        pg_catalog.replace(
                          public.normalizar_busqueda(
                            pg_catalog.left(pg_catalog.btrim(p_q), 100)
                          ),
                          '\', '\\'),
                        '%', '\%'),
                      '_', '\_') || '%'
      END                                                AS patron,
      (
        SELECT pg_catalog.array_agg(DISTINCT pg_catalog.lower(pg_catalog.btrim(x)))
        FROM pg_catalog.unnest(p_categorias) AS u(x)
        WHERE pg_catalog.btrim(COALESCE(x, '')) <> ''
      )                                                  AS categorias
  )
  SELECT
    o.modalidad::text   AS modalidad,
    pg_catalog.count(*) AS cantidad
  FROM public.ofertas o
  CROSS JOIN filtros f
  WHERE o.estado = 'activa'
    AND o.vence_en > now()
    AND (
      f.categorias IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.oferta_categorias oc
        JOIN public.categorias c ON c.id = oc.categoria_id
        WHERE oc.oferta_id = o.id
          AND pg_catalog.lower(c.nombre) = ANY (f.categorias)
      )
    )
    AND (
      f.patron IS NULL
      OR public.normalizar_busqueda(o.titulo)         LIKE f.patron ESCAPE '\'
      OR public.normalizar_busqueda(o.descripcion)    LIKE f.patron ESCAPE '\'
      OR public.normalizar_busqueda(o.ubicacion)      LIKE f.patron ESCAPE '\'
      OR public.normalizar_busqueda(o.empresa_nombre) LIKE f.patron ESCAPE '\'
      OR EXISTS (
        SELECT 1
        FROM pg_catalog.unnest(o.requisitos) AS r(texto)
        WHERE public.normalizar_busqueda(r.texto) LIKE f.patron ESCAPE '\'
      )
      OR EXISTS (
        SELECT 1
        FROM public.oferta_categorias oc2
        JOIN public.categorias c2 ON c2.id = oc2.categoria_id
        WHERE oc2.oferta_id = o.id
          AND public.normalizar_busqueda(c2.nombre) LIKE f.patron ESCAPE '\'
      )
    )
  GROUP BY o.modalidad
  ORDER BY o.modalidad
$$;

REVOKE EXECUTE ON FUNCTION public.contar_ofertas_por_modalidad(text, text[]) FROM public;
GRANT  EXECUTE ON FUNCTION public.contar_ofertas_por_modalidad(text, text[]) TO anon, authenticated;
