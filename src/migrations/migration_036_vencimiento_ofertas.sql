-- ============================================================
-- Portal Municipal de Empleo — Migración 036
-- Vencimiento de ofertas
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_035_estados_curso_y_regla_rechazos.sql ya aplicada.
-- Re-ejecutable sin errores.
-- ============================================================
--
-- Cada oferta tiene una duración (15, 30, 45 o 60 días; 30 por defecto)
-- que elige la empresa, y una fecha de vencimiento vence_en.
--
--   - vence_en se calcula con un trigger cuando la oferta pasa a 'activa'
--     (la aprueba la oficina): momento de publicación + duracion_dias.
--     Editar una oferta activa no cambia vence_en: si vuelve a revisión y la
--     oficina la aprueba de nuevo antes de que venza, conserva la fecha.
--   - No hay cron: una oferta vencida sigue en estado 'activa', pero deja de
--     aparecer en la búsqueda pública (buscar_ofertas_publicas filtra
--     vence_en > now()) y la base rechaza postulaciones nuevas (trigger en
--     postulaciones con mensaje claro, P0001).
--   - renovar_oferta(): la empresa renueva SU oferta vencida
--     (vence_en = now() + duracion_dias) sin pasar de nuevo por revisión,
--     porque el contenido no cambia. Una vez renovada, no se puede volver a
--     renovar hasta que venza otra vez.
--
-- Datos existentes: ver BLOQUE 3 (backfill de las ofertas activas).
-- ============================================================


-- ============================================================
-- BLOQUE 1 — Columnas nuevas
-- ============================================================

ALTER TABLE public.ofertas
  ADD COLUMN IF NOT EXISTS duracion_dias int NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS vence_en      timestamptz;

-- Las filas existentes quedan con duracion_dias = 30 por el DEFAULT, así que
-- el CHECK se valida sin problemas.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    WHERE c.conname  = 'ofertas_duracion_dias_check'
      AND c.conrelid = 'public.ofertas'::regclass
  ) THEN
    ALTER TABLE public.ofertas
      ADD CONSTRAINT ofertas_duracion_dias_check
      CHECK (duracion_dias IN (15, 30, 45, 60));
  END IF;
END;
$$;


-- ============================================================
-- BLOQUE 2 — Permisos por columna
-- La empresa elige la duración al crear o editar. vence_en no está en
-- ningún grant: solo la escriben el trigger y renovar_oferta().
-- (El grant de UPDATE de ofertas es por columna desde migration_021.)
-- ============================================================

GRANT UPDATE (duracion_dias) ON public.ofertas TO authenticated;


-- ============================================================
-- BLOQUE 3 — Backfill de ofertas activas existentes
--
-- Las ofertas que ya están activas reciben vence_en = now() + 30 días,
-- contando desde el momento en que se ejecuta esta migración y NO desde su
-- fecha de publicación. Así ninguna oferta publicada desaparece de golpe del
-- listado público en producción: todas tienen 30 días de margen y después
-- la empresa puede renovarlas.
--
-- Solo toca filas activas sin vence_en, así que volver a ejecutar el script
-- no cambia las fechas ya calculadas. Las ofertas en otros estados quedan con
-- vence_en NULL hasta que la oficina las apruebe.
--
-- Corre antes de crear el trigger del BLOQUE 4. Los triggers existentes de
-- ofertas no intervienen: no cambia contenido y en el SQL Editor no hay rol
-- de empresa.
-- ============================================================

UPDATE public.ofertas o
SET    vence_en = now() + pg_catalog.make_interval(days => 30)
WHERE  o.estado   = 'activa'
  AND  o.vence_en IS NULL;


-- ============================================================
-- BLOQUE 4 — Trigger: calcular vence_en al publicar
--
-- Nombre elegido para que corra último entre los BEFORE UPDATE de ofertas
-- (orden alfabético: ofertas_marcar_contenido_editado,
-- prevent_empresa_editar_pendiente, prevent_empresa_oferta_campos,
-- validar_requisito_minimo_ofertas, vencimiento_ofertas) y vea el estado
-- final de NEW, incluido el reset a 'pendiente_aprobacion' de migration_027.
--
--   INSERT: si la oferta se crea ya activa (solo la oficina puede), vence_en
--           se calcula; en cualquier otro caso queda NULL, aunque el cliente
--           envíe un valor.
--   UPDATE: al pasar a 'activa' desde otro estado se calcula vence_en, salvo
--           que la oferta ya tenga una fecha futura (re-aprobación después de
--           una edición: se conserva). Cualquier otro UPDATE deja vence_en
--           como está.
-- ============================================================

CREATE OR REPLACE FUNCTION public.ofertas_calcular_vencimiento_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.estado = 'activa' THEN
      NEW.vence_en := now() + pg_catalog.make_interval(days => NEW.duracion_dias);
    ELSE
      NEW.vence_en := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.estado = 'activa'
     AND OLD.estado IS DISTINCT FROM 'activa'
     AND (OLD.vence_en IS NULL OR OLD.vence_en <= now()) THEN
    NEW.vence_en := now() + pg_catalog.make_interval(days => NEW.duracion_dias);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vencimiento_ofertas ON public.ofertas;
CREATE TRIGGER vencimiento_ofertas
  BEFORE INSERT OR UPDATE ON public.ofertas
  FOR EACH ROW EXECUTE FUNCTION public.ofertas_calcular_vencimiento_fn();


-- ============================================================
-- BLOQUE 5 — renovar_oferta
-- La empresa renueva una oferta propia, activa y vencida. Solo cambia
-- vence_en (y updated_at): el contenido no cambia, así que el trigger de
-- migration_027 no la manda a revisión.
-- ============================================================

CREATE OR REPLACE FUNCTION public.renovar_oferta(p_oferta_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_estado   text;
  v_vence_en timestamptz;
  v_duracion int;
  v_nuevo    timestamptz;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'empresa' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT o.estado::text, o.vence_en, o.duracion_dias
  INTO   v_estado, v_vence_en, v_duracion
  FROM   public.ofertas o
  JOIN   public.empresas e ON e.id = o.empresa_id
  WHERE  o.id = p_oferta_id
    AND  e.usuario_id = auth.uid()
  FOR UPDATE OF o;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la oferta o no tenés permiso para renovarla.';
  END IF;

  IF v_estado IS DISTINCT FROM 'activa' THEN
    RAISE EXCEPTION 'Solo podés renovar una oferta publicada que ya venció.';
  END IF;

  IF v_vence_en IS NULL OR v_vence_en > now() THEN
    RAISE EXCEPTION 'La oferta todavía no venció. Vas a poder renovarla cuando venza.';
  END IF;

  v_nuevo := now() + pg_catalog.make_interval(days => v_duracion);

  UPDATE public.ofertas o
  SET    vence_en   = v_nuevo,
         updated_at = now()
  WHERE  o.id = p_oferta_id;

  RETURN v_nuevo;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.renovar_oferta(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.renovar_oferta(uuid) TO authenticated;


-- ============================================================
-- BLOQUE 6 — Postulaciones: no a ofertas vencidas
--
-- 6a. oferta_acepta_postulaciones (migration_023), usada en la política de
--     INSERT de postulaciones: misma firma, ahora también exige que la
--     oferta no esté vencida.
-- 6b. Trigger BEFORE INSERT con mensaje claro. Corre antes de la política
--     RLS, así que el postulante ve este mensaje y no el error genérico de
--     permisos.
-- ============================================================

CREATE OR REPLACE FUNCTION public.oferta_acepta_postulaciones(p_oferta_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ofertas o
    WHERE o.id = p_oferta_id
      AND o.estado = 'activa'
      AND o.vence_en > now()
  )
$$;

REVOKE EXECUTE ON FUNCTION public.oferta_acepta_postulaciones(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.oferta_acepta_postulaciones(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.postulaciones_oferta_vigente_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.ofertas o
    WHERE o.id = NEW.oferta_id
      AND o.estado = 'activa'
      AND o.vence_en <= now()
  ) THEN
    RAISE EXCEPTION 'Esta oferta ya venció y no acepta postulaciones nuevas.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS postulaciones_oferta_vigente ON public.postulaciones;
CREATE TRIGGER postulaciones_oferta_vigente
  BEFORE INSERT ON public.postulaciones
  FOR EACH ROW EXECUTE FUNCTION public.postulaciones_oferta_vigente_fn();


-- ============================================================
-- BLOQUE 7 — buscar_ofertas_publicas (migration_034)
-- Misma firma y mismo retorno; único cambio: AND o.vence_en > now().
-- Sigue siendo SECURITY INVOKER.
-- ============================================================

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
      AND o.vence_en > now()
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


-- ============================================================
-- BLOQUE 8 — Índice para filtrar por vencimiento
-- ============================================================

CREATE INDEX IF NOT EXISTS ofertas_activas_vence_en_idx
  ON public.ofertas (vence_en)
  WHERE estado = 'activa';
