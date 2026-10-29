-- ============================================================
-- Portal Municipal de Empleo — Migración 065
-- Cantidad de ofertas vigentes por rubro
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_062_busqueda_ofertas_multiple.sql ya aplicada.
-- Re-ejecutable sin errores. No borra ni modifica datos existentes.
-- Después de aplicarla: npm run db:tipos
-- ============================================================
--
-- El listado público (/ofertas) muestra "Explorá por rubro": tarjetas con
-- la cantidad de ofertas vigentes de cada rubro, y el panel "Todos los
-- rubros" con los rubros que tienen al menos una.
--
-- BLOQUE 1  contar_ofertas_vigentes_por_rubro(): (categoria_id, rubro,
--           cantidad) de las ofertas visibles en el listado, con las mismas
--           reglas que buscar_ofertas_publicas_multiple (062): estado
--           'activa' y vence_en > now(). Una oferta con varios rubros cuenta
--           en cada uno. Solo devuelve los rubros con al menos una oferta,
--           ordenados por nombre. Sin parámetros: no depende del texto ni de
--           los filtros elegidos. SECURITY INVOKER (respeta RLS),
--           search_path = '' y los mismos permisos que la búsqueda pública
--           (anon y authenticated).
--
-- Las condiciones de visibilidad están repetidas en 036, 062 y acá: si
-- cambian, cambiarlas en todas.
-- ============================================================


-- ============================================================
-- BLOQUE 1 — contar_ofertas_vigentes_por_rubro
-- ============================================================

CREATE OR REPLACE FUNCTION public.contar_ofertas_vigentes_por_rubro()
RETURNS TABLE (
  categoria_id uuid,
  rubro        text,
  cantidad     bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    c.id                                AS categoria_id,
    c.nombre                            AS rubro,
    pg_catalog.count(DISTINCT o.id)     AS cantidad
  FROM public.categorias c
  JOIN public.oferta_categorias oc ON oc.categoria_id = c.id
  JOIN public.ofertas o            ON o.id = oc.oferta_id
  WHERE o.estado = 'activa'
    AND o.vence_en > now()
  GROUP BY c.id, c.nombre
  ORDER BY c.nombre
$$;

REVOKE EXECUTE ON FUNCTION public.contar_ofertas_vigentes_por_rubro() FROM public;
GRANT  EXECUTE ON FUNCTION public.contar_ofertas_vigentes_por_rubro() TO anon, authenticated;
