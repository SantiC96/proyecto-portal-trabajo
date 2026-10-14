-- ============================================================
-- Portal Municipal de Empleo — Migración 034
-- Búsqueda y paginación de ofertas públicas en el servidor
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Re-ejecutable sin errores. No modifica tablas, datos ni políticas.
-- ============================================================
--
-- Reemplaza el filtrado en el navegador del listado público (/ y /ofertas)
-- por una función que filtra, cuenta y pagina en la base.
--
-- La función es SECURITY INVOKER: se ejecuta con los permisos de quien la
-- llama (anon o authenticated), así que las políticas RLS existentes de
-- ofertas, oferta_categorias y categorias se siguen aplicando. Además filtra
-- estado = 'activa', igual que la consulta anterior: aunque una empresa
-- logueada pueda leer sus propias ofertas pendientes por RLS, acá no aparecen.
-- ============================================================


-- ── 1. Normalización de texto para comparar sin mayúsculas ni acentos ──
--
--    No usa la extensión unaccent (no está habilitada en el proyecto):
--    translate() cubre las vocales acentuadas, la diéresis, la ñ y la ç del
--    español. Se traducen también las mayúsculas acentuadas antes de lower()
--    para no depender de la configuración regional (collation) de la base.

CREATE OR REPLACE FUNCTION public.normalizar_busqueda(p_texto text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT pg_catalog.lower(
    pg_catalog.translate(
      COALESCE(p_texto, ''),
      'ÁÀÂÄÃáàâäãÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÖÕóòôöõÚÙÛÜúùûüÑñÇç',
      'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNnCc'
    )
  )
$$;

-- La función principal es SECURITY INVOKER, así que quien la llama también
-- necesita poder ejecutar esta.
REVOKE EXECUTE ON FUNCTION public.normalizar_busqueda(text) FROM public;
GRANT  EXECUTE ON FUNCTION public.normalizar_busqueda(text) TO anon, authenticated;


-- ── 2. Búsqueda paginada de ofertas públicas ──────────────────
--
--    Parámetros nulos o vacíos no filtran.
--    p_q          texto libre: título, descripción, ubicación, empresa,
--                 categorías y requisitos (contiene, sin mayúsculas ni acentos).
--                 Se recorta a 100 caracteres y se escapan \ % _ para que se
--                 busquen literalmente.
--    p_categoria  nombre exacto de la categoría (sin distinguir mayúsculas).
--    p_modalidad  'Presencial' | 'Híbrido' | 'Remoto'.
--    p_limite     filas por página; entre 1 y 50.
--    p_desplazamiento  filas a saltear; mínimo 0.
--
--    total_count trae el total de coincidencias (antes de LIMIT/OFFSET) en
--    cada fila. Si el desplazamiento supera el total, no devuelve filas.
--    Orden estable: created_at DESC y luego id DESC, para que no se repitan
--    ni se salteen ofertas entre páginas.

CREATE OR REPLACE FUNCTION public.buscar_ofertas_publicas(
  p_q              text DEFAULT NULL,
  p_categoria      text DEFAULT NULL,
  p_modalidad      text DEFAULT NULL,
  p_limite         int  DEFAULT 20,
  p_desplazamiento int  DEFAULT 0
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
      NULLIF(pg_catalog.btrim(COALESCE(p_categoria, '')), '') AS categoria,
      NULLIF(pg_catalog.btrim(COALESCE(p_modalidad, '')), '') AS modalidad
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
      AND (f.modalidad IS NULL OR o.modalidad::text = f.modalidad)
      AND (
        f.categoria IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.oferta_categorias oc
          JOIN public.categorias c ON c.id = oc.categoria_id
          WHERE oc.oferta_id = o.id
            AND pg_catalog.lower(c.nombre) = pg_catalog.lower(f.categoria)
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

REVOKE EXECUTE ON FUNCTION public.buscar_ofertas_publicas(text, text, text, int, int) FROM public;
GRANT  EXECUTE ON FUNCTION public.buscar_ofertas_publicas(text, text, text, int, int) TO anon, authenticated;


-- ── 3. Índice para el listado y el orden ─────────────────────
--
--    Todos los listados de ofertas filtran por estado y ordenan por
--    created_at (público: solo 'activa'; panel municipal: una pestaña por
--    estado; contadores por estado). Este índice permite resolver el filtro y
--    el orden sin recorrer ni ordenar la tabla completa, y le da a PostgreSQL
--    un orden ya resuelto para cortar con LIMIT/OFFSET.
--
--    No se agrega índice para el texto: un LIKE '%texto%' no puede usar un
--    índice btree. Haría falta pg_trgm (extensión nueva), que queda fuera de
--    esta migración; con el volumen actual de ofertas activas no es necesario.
--
--    Sin CONCURRENTLY porque el SQL Editor ejecuta el script en una
--    transacción; la tabla es chica y el bloqueo de escritura dura un instante.

CREATE INDEX IF NOT EXISTS ofertas_estado_created_at_idx
  ON public.ofertas (estado, created_at DESC, id DESC);
