-- ============================================================
-- Portal Municipal de Empleo — Migración 058
-- Panel del postulante: sus indicadores y las ofertas que coinciden con su
-- perfil
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_057_link_invitaciones.sql ya aplicada.
-- Re-ejecutable sin errores. No cambia ninguna fila ni ninguna tabla: solo
-- crea funciones y reemplaza buscar_candidatos_para_oferta (misma firma y
-- mismo resultado).
-- Después de aplicarla: npm run db:tipos
-- ============================================================
--
-- Ver docs/decisiones/029-dashboard-postulante.md.
--
--   BLOQUE 1  puntaje_coincidencia(oferta, postulante): la fórmula de
--             coincidencia de 056, en un solo lugar. Uso interno.
--   BLOQUE 2  buscar_candidatos_para_oferta (056), misma firma y mismo
--             resultado, con el puntaje de puntaje_coincidencia().
--   BLOQUE 3  indicadores_postulante() (postulante).
--   BLOQUE 4  ofertas_recomendadas_para_mi(p_limite) (postulante).
--   BLOQUE 5  ultimos_movimientos_postulante(p_limite) (postulante).
--
-- Las tres funciones del postulante son SECURITY DEFINER (el postulante no lee
-- derivaciones ni las ofertas a las que no se postuló cuando dejan de estar
-- publicadas) y fallan con 42501 para cualquier rol que no sea un postulante
-- con la cuenta activa (rol_actual(), 050), incluido el SQL Editor (rol
-- NULL). El postulante sale siempre de auth.uid(), nunca de un parámetro.
--
-- Errores:
--   42501  sin permiso ('No autorizado').
-- ============================================================


-- ============================================================
-- BLOQUE 1 — puntaje_coincidencia(p_oferta_id, p_postulante_id)
--
-- La fórmula de buscar_candidatos_para_oferta (056, BLOQUE 5), sin cambios:
--   rubro          40  interés en al menos un rubro de la oferta.
--   requisitos     10 por requisito que coincide con su experiencia, hasta 30.
--   título         10  el título de la oferta coincide con su experiencia.
--   disponibilidad 10  compatible con la jornada (disponibilidad_compatible).
--   CV             10  tiene al menos un CV disponible.
--   Máximo 100. Nivel: alta desde 60, media desde 35, baja debajo.
-- Devuelve además los motivos (los que muestra la búsqueda de la oficina):
-- rubros y requisitos que coinciden, en el orden de 056 (rubros por nombre,
-- requisitos en el orden de la oferta).
--
-- No devuelve filas si la oferta o el postulante no existen. No mira el
-- estado de la oferta ni si el postulante ya se postuló: eso lo filtra cada
-- función que la usa.
--
-- Uso interno: SECURITY INVOKER y sin EXECUTE para public, anon ni
-- authenticated. La llaman las funciones SECURITY DEFINER de abajo, que
-- controlan quién pide qué; con su dueño como usuario actual lee las tablas
-- sin RLS.
-- ============================================================

CREATE OR REPLACE FUNCTION public.puntaje_coincidencia(p_oferta_id uuid, p_postulante_id uuid)
RETURNS TABLE (
  puntaje                  int,
  nivel                    text,
  rubros_coincidentes      text[],
  requisitos_coincidentes  text[],
  coincide_titulo          boolean,
  disponibilidad_ok        boolean,
  tiene_cv                 boolean
)
LANGUAGE plpgsql STABLE SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  -- Pesos del puntaje y umbrales de coincidencia (ver el encabezado).
  c_peso_rubro          CONSTANT int := 40;
  c_peso_requisito      CONSTANT int := 10;
  c_tope_requisitos     CONSTANT int := 30;
  c_peso_titulo         CONSTANT int := 10;
  c_peso_disponibilidad CONSTANT int := 10;
  c_peso_cv             CONSTANT int := 10;
  c_umbral_alta         CONSTANT int := 60;
  c_umbral_media        CONSTANT int := 35;

  v_titulo          text;
  v_requisitos      text[];
  v_jornada         text;
  v_usuario_id      uuid;
  v_disponibilidad  text;
  v_lexemas         text[];
  v_rubros          text[];
  v_requisitos_ok   text[];
  v_titulo_ok       boolean;
  v_disponible      boolean;
  v_con_cv          boolean;
  v_puntos          int;
BEGIN
  SELECT o.titulo, o.requisitos, o.jornada::text
  INTO   v_titulo, v_requisitos, v_jornada
  FROM   public.ofertas o
  WHERE  o.id = p_oferta_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT p.usuario_id,
         p.disponibilidad,
         pg_catalog.tsvector_to_array(public.experiencia_tsv(p.experiencia_laboral))
  INTO   v_usuario_id, v_disponibilidad, v_lexemas
  FROM   public.postulantes p
  WHERE  p.id = p_postulante_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(pg_catalog.array_agg(c.nombre ORDER BY c.nombre), '{}'::text[])
  INTO   v_rubros
  FROM   public.oferta_categorias oc
  JOIN   public.postulante_categorias pc ON pc.categoria_id = oc.categoria_id
  JOIN   public.categorias c             ON c.id = oc.categoria_id
  WHERE  oc.oferta_id = p_oferta_id
    AND  pc.postulante_id = p_postulante_id;

  SELECT COALESCE(pg_catalog.array_agg(pg_catalog.btrim(r.texto) ORDER BY r.orden), '{}'::text[])
  INTO   v_requisitos_ok
  FROM   pg_catalog.unnest(COALESCE(v_requisitos, '{}'::text[])) WITH ORDINALITY AS r(texto, orden)
  WHERE  public.lexemas_coinciden(public.lexemas_significativos(r.texto), v_lexemas);

  v_titulo_ok  := public.lexemas_coinciden(public.lexemas_significativos(v_titulo), v_lexemas);
  v_disponible := public.disponibilidad_compatible(v_disponibilidad, v_jornada);
  v_con_cv     := EXISTS (
    SELECT 1
    FROM   public.archivos_usuario a
    WHERE  a.usuario_id = v_usuario_id
      AND  a.tipo = 'cv'
      AND  a.eliminado_en IS NULL
  );

  v_puntos :=
      CASE WHEN pg_catalog.cardinality(v_rubros) > 0 THEN c_peso_rubro ELSE 0 END
    + LEAST(pg_catalog.cardinality(v_requisitos_ok) * c_peso_requisito, c_tope_requisitos)
    + CASE WHEN v_titulo_ok  THEN c_peso_titulo         ELSE 0 END
    + CASE WHEN v_disponible THEN c_peso_disponibilidad ELSE 0 END
    + CASE WHEN v_con_cv     THEN c_peso_cv             ELSE 0 END;

  RETURN QUERY
  SELECT
    v_puntos,
    CASE
      WHEN v_puntos >= c_umbral_alta  THEN 'alta'
      WHEN v_puntos >= c_umbral_media THEN 'media'
      ELSE 'baja'
    END,
    v_rubros,
    v_requisitos_ok,
    v_titulo_ok,
    v_disponible,
    v_con_cv;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.puntaje_coincidencia(uuid, uuid) FROM public, anon, authenticated;


-- ============================================================
-- BLOQUE 2 — buscar_candidatos_para_oferta (056), con puntaje_coincidencia
--
-- Misma firma, mismas columnas, mismos filtros y mismo orden que 056. Lo
-- único que cambia es de dónde sale el puntaje: los rubros, requisitos,
-- título, disponibilidad y CV de cada candidato los calcula
-- puntaje_coincidencia() con los mismos pesos y umbrales que tenía esta
-- función. El filtro previo (quién es candidato: rubro en común o experiencia
-- que coincide con el título o algún requisito) sigue acá, igual que en 056.
-- ============================================================

CREATE OR REPLACE FUNCTION public.buscar_candidatos_para_oferta(
  p_oferta_id         uuid,
  p_solo_con_cv       boolean DEFAULT false,
  p_solo_funes        boolean DEFAULT false,
  p_nivel             int     DEFAULT NULL,
  p_ocultar_rechazos  boolean DEFAULT false,
  p_limite            int     DEFAULT 20,
  p_offset            int     DEFAULT 0
)
RETURNS TABLE (
  postulante_id             uuid,
  usuario_id                uuid,
  nombre                    text,
  apellido                  text,
  nivel_prioridad           smallint,
  localidad                 text,
  puntaje                   int,
  coincidencia              text,
  rubros_coincidentes       text[],
  requisitos_coincidentes   text[],
  coincide_titulo           boolean,
  disponibilidad_ok         boolean,
  tiene_cv                  boolean,
  ya_invitado               boolean,
  ultima_invitacion_estado  text,
  ultima_invitacion_fecha   timestamptz,
  ultima_invitacion_motivo  text,
  invitaciones_total        int,
  total                     bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_estado      public.estado_oferta;
  v_vence_en    timestamptz;
  v_eliminada   timestamptz;
  v_titulo      text;
  v_requisitos  text[];
  v_lex_titulo  text[];
  v_lex_todos   text[];
  v_consulta    tsquery;
  v_limite      int := LEAST(GREATEST(COALESCE(p_limite, 20), 1), 100);
  v_offset      int := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  IF public.rol_actual() IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT o.estado, o.vence_en, o.eliminada_en, o.titulo, o.requisitos
  INTO   v_estado, v_vence_en, v_eliminada, v_titulo, v_requisitos
  FROM   public.ofertas o
  WHERE  o.id = p_oferta_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La oferta no existe.';
  END IF;
  IF v_eliminada IS NOT NULL
     OR v_estado IS DISTINCT FROM 'activa'
     OR v_vence_en IS NULL
     OR v_vence_en <= now() THEN
    RAISE EXCEPTION 'Solo se buscan postulantes para ofertas publicadas y vigentes.';
  END IF;

  -- Filtro previo por texto: las raíces del título y de los requisitos.
  v_lex_titulo := public.lexemas_significativos(v_titulo);

  SELECT pg_catalog.array_agg(DISTINCT x.lexema)
  INTO   v_lex_todos
  FROM (
    SELECT pg_catalog.unnest(v_lex_titulo)
    UNION ALL
    SELECT pg_catalog.unnest(public.lexemas_significativos(r.texto))
    FROM pg_catalog.unnest(COALESCE(v_requisitos, '{}'::text[])) AS r(texto)
  ) AS x(lexema);

  IF COALESCE(pg_catalog.cardinality(v_lex_todos), 0) > 0 THEN
    v_consulta := pg_catalog.array_to_string(
      ARRAY(SELECT pg_catalog.quote_literal(l) FROM pg_catalog.unnest(v_lex_todos) AS l),
      ' | '
    )::tsquery;
  END IF;

  RETURN QUERY
  WITH candidatos AS (
    SELECT pc.postulante_id AS id
    FROM   public.oferta_categorias oc
    JOIN   public.postulante_categorias pc ON pc.categoria_id = oc.categoria_id
    WHERE  oc.oferta_id = p_oferta_id
    UNION
    SELECT p.id
    FROM   public.postulantes p
    WHERE  v_consulta IS NOT NULL
      AND  public.experiencia_tsv(p.experiencia_laboral) @@ v_consulta
  ),
  evaluados AS (
    SELECT
      p.id,
      p.usuario_id,
      u.nombre,
      u.apellido,
      p.nivel_prioridad,
      p.localidad,
      p.es_de_funes,
      p.created_at,
      pt.puntaje                  AS puntos,
      pt.nivel                    AS nivel_coincidencia,
      pt.rubros_coincidentes      AS rubros,
      pt.requisitos_coincidentes  AS requisitos_ok,
      pt.coincide_titulo          AS titulo_ok,
      pt.disponibilidad_ok        AS disponible,
      pt.tiene_cv                 AS con_cv,
      inv.estado   AS inv_estado,
      inv.fecha    AS inv_fecha,
      inv.motivo   AS inv_motivo,
      COALESCE(inv.cantidad, 0) AS inv_cantidad
    FROM       candidatos ca
    JOIN       public.postulantes p ON p.id = ca.id
    JOIN       public.usuarios u    ON u.id = p.usuario_id
    CROSS JOIN LATERAL public.puntaje_coincidencia(p_oferta_id, p.id) pt
    LEFT JOIN LATERAL (
      SELECT i.estado,
             CASE i.estado
               WHEN 'pendiente' THEN i.creada_en
               WHEN 'vencida'   THEN i.vencida_en
               ELSE i.respondida_en
             END                               AS fecha,
             i.motivo_rechazo                  AS motivo,
             (pg_catalog.count(*) OVER ())::int AS cantidad
      FROM   public.invitaciones_oferta i
      WHERE  i.oferta_id = p_oferta_id
        AND  i.postulante_id = p.id
      ORDER  BY i.creada_en DESC, i.id DESC
      LIMIT  1
    ) inv ON true
    WHERE u.activo
      AND NOT EXISTS (
        SELECT 1
        FROM   public.postulaciones po
        WHERE  po.oferta_id = p_oferta_id
          AND  po.postulante_id = p.id
          AND  po.retirada_en IS NULL
      )
      AND NOT EXISTS (
        SELECT 1
        FROM   public.postulaciones po
        JOIN   public.derivaciones d ON d.postulacion_id = po.id
        WHERE  po.oferta_id = p_oferta_id
          AND  po.postulante_id = p.id
          AND  d.estado_empresa = 'contratado'
      )
  ),
  puntuados AS (
    SELECT e.*
    FROM evaluados e
    WHERE (pg_catalog.cardinality(e.rubros) > 0
           OR pg_catalog.cardinality(e.requisitos_ok) > 0
           OR e.titulo_ok)
      AND (NOT COALESCE(p_solo_con_cv, false) OR e.con_cv)
      AND (NOT COALESCE(p_solo_funes, false)  OR e.es_de_funes)
      AND (p_nivel IS NULL OR e.nivel_prioridad = p_nivel)
      AND (NOT COALESCE(p_ocultar_rechazos, false) OR e.inv_estado IS DISTINCT FROM 'rechazada')
  )
  SELECT
    pu.id,
    pu.usuario_id,
    pu.nombre,
    pu.apellido,
    pu.nivel_prioridad,
    pu.localidad,
    pu.puntos,
    pu.nivel_coincidencia,
    pu.rubros,
    pu.requisitos_ok,
    pu.titulo_ok,
    pu.disponible,
    pu.con_cv,
    pu.inv_estado IS NOT NULL,
    pu.inv_estado,
    pu.inv_fecha,
    pu.inv_motivo,
    pu.inv_cantidad,
    pg_catalog.count(*) OVER ()
  FROM puntuados pu
  ORDER BY (pu.inv_estado IS NOT NULL), pu.puntos DESC, pu.nivel_prioridad, pu.created_at DESC, pu.id DESC
  LIMIT v_limite OFFSET v_offset;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.buscar_candidatos_para_oferta(uuid, boolean, boolean, int, boolean, int, int)
  FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.buscar_candidatos_para_oferta(uuid, boolean, boolean, int, boolean, int, int)
  TO authenticated;


-- ============================================================
-- BLOQUE 3 — indicadores_postulante()
--
-- Una fila con la situación actual de las postulaciones del postulante de la
-- sesión. Cuenta cada postulación una vez, con el mismo estado que muestra
-- Mis postulaciones (postulaciones.estado y, si está derivada, el resultado
-- de la empresa en derivaciones.estado_empresa):
--
--   postulaciones_activas    en curso: recibida, en_revision, o derivada sin
--                            resultado de la empresa (sin derivación,
--                            'pendiente' o 'en_proceso').
--                            postulacion_en_curso() (054), la misma regla que
--                            permite retirarla. Es en_revision +
--                            derivadas_sin_resultado.
--   en_revision              recibida + en_revision.
--   derivadas_sin_resultado  derivada sin resultado de la empresa.
--   contratadas              derivada con 'contratado'.
--   no_seleccionadas         rechazada_municipalidad (la oficina) o derivada
--                            con 'rechazado' (la empresa).
--   retiradas                retirada_postulante. Desde 063 también las
--                            retiradas cuando estaban 'recibida' (antes se
--                            borraban y no quedaban).
--   invitaciones_pendientes  invitaciones 'pendiente' con la oferta todavía
--                            abierta: las que mis_invitaciones() (056)
--                            devuelve como pendientes en /invitaciones.
--
-- No entran en ningún número las postulaciones cerradas porque la empresa
-- retiró la oferta (postulación 'oferta_retirada' o derivación
-- 'oferta_retirada', 051): no son un resultado del postulante.
--
-- Sin fila de postulantes (no debería pasar) devuelve todo en cero.
-- ============================================================

CREATE OR REPLACE FUNCTION public.indicadores_postulante()
RETURNS TABLE (
  postulaciones_activas    bigint,
  en_revision              bigint,
  derivadas_sin_resultado  bigint,
  contratadas              bigint,
  no_seleccionadas         bigint,
  retiradas                bigint,
  invitaciones_pendientes  bigint
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

  SELECT p.id INTO v_postulante_id
  FROM public.postulantes p
  WHERE p.usuario_id = auth.uid();

  IF v_postulante_id IS NULL THEN
    RETURN QUERY
    SELECT 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint;
    RETURN;
  END IF;

  RETURN QUERY
  WITH mias AS (
    SELECT po.estado,
           d.estado_empresa,
           po.estado::text         AS estado_txt,
           d.estado_empresa::text  AS empresa_txt
    FROM      public.postulaciones po
    LEFT JOIN public.derivaciones d ON d.postulacion_id = po.id
    WHERE     po.postulante_id = v_postulante_id
  )
  SELECT
    (SELECT pg_catalog.count(*) FROM mias m
      WHERE public.postulacion_en_curso(m.estado, m.estado_empresa)),

    (SELECT pg_catalog.count(*) FROM mias m
      WHERE m.estado_txt IN ('recibida', 'en_revision')),

    (SELECT pg_catalog.count(*) FROM mias m
      WHERE m.estado_txt = 'derivada'
        AND (m.empresa_txt IS NULL OR m.empresa_txt IN ('pendiente', 'en_proceso'))),

    (SELECT pg_catalog.count(*) FROM mias m
      WHERE m.estado_txt = 'derivada'
        AND m.empresa_txt = 'contratado'),

    (SELECT pg_catalog.count(*) FROM mias m
      WHERE m.estado_txt = 'rechazada_municipalidad'
         OR (m.estado_txt = 'derivada' AND m.empresa_txt = 'rechazado')),

    (SELECT pg_catalog.count(*) FROM mias m
      WHERE m.estado_txt = 'retirada_postulante'),

    (SELECT pg_catalog.count(*)
       FROM public.invitaciones_oferta i
       JOIN public.ofertas o ON o.id = i.oferta_id
      WHERE i.postulante_id = v_postulante_id
        AND i.estado = 'pendiente'
        AND o.estado = 'activa'
        AND o.eliminada_en IS NULL
        AND o.vence_en > now());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.indicadores_postulante() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.indicadores_postulante() TO authenticated;


-- ============================================================
-- BLOQUE 4 — ofertas_recomendadas_para_mi(p_limite)
--
-- Ofertas para el postulante de la sesión, con el mismo puntaje y nivel que
-- ve la oficina en la búsqueda (puntaje_coincidencia, BLOQUE 1):
--   - activas, vigentes (vence_en > now()) y no eliminadas: las que se ven
--     en el portal y aceptan postulaciones;
--   - sin una postulación vigente (no retirada) suya: si retiró la
--     postulación, la oferta puede volver a aparecer;
--   - solo coincidencia alta o media (puntaje >= 35).
-- Orden: puntaje descendente, después la publicada más recientemente
-- (publicado_en, o created_at para las anteriores a 026) e id.
-- p_limite entre 1 y 10 (por defecto 5).
--
-- lugar es ofertas.ubicacion. empresa_nombre es NULL si está vacío.
-- ============================================================

CREATE OR REPLACE FUNCTION public.ofertas_recomendadas_para_mi(p_limite int DEFAULT 5)
RETURNS TABLE (
  id                       uuid,
  titulo                   text,
  empresa_nombre           text,
  lugar                    text,
  modalidad                public.modalidad_oferta,
  vence_en                 timestamptz,
  puntaje                  int,
  nivel                    text,
  rubros_coincidentes      text[],
  requisitos_coincidentes  text[],
  coincide_titulo          boolean,
  disponibilidad_ok        boolean,
  tiene_cv                 boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_postulante_id uuid;
  v_limite        int := LEAST(GREATEST(COALESCE(p_limite, 5), 1), 10);
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'postulante' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT p.id INTO v_postulante_id
  FROM public.postulantes p
  WHERE p.usuario_id = auth.uid();

  IF v_postulante_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.titulo,
    NULLIF(pg_catalog.btrim(o.empresa_nombre), ''),
    o.ubicacion,
    o.modalidad,
    o.vence_en,
    pt.puntaje,
    pt.nivel,
    pt.rubros_coincidentes,
    pt.requisitos_coincidentes,
    pt.coincide_titulo,
    pt.disponibilidad_ok,
    pt.tiene_cv
  FROM public.ofertas o
  CROSS JOIN LATERAL public.puntaje_coincidencia(o.id, v_postulante_id) pt
  WHERE o.estado = 'activa'
    AND o.eliminada_en IS NULL
    AND o.vence_en > now()
    AND NOT EXISTS (
      SELECT 1
      FROM   public.postulaciones po
      WHERE  po.oferta_id = o.id
        AND  po.postulante_id = v_postulante_id
        AND  po.retirada_en IS NULL
    )
    AND pt.nivel IN ('alta', 'media')
  ORDER BY pt.puntaje DESC, COALESCE(o.publicado_en, o.created_at) DESC, o.id DESC
  LIMIT v_limite;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ofertas_recomendadas_para_mi(int) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.ofertas_recomendadas_para_mi(int) TO authenticated;


-- ============================================================
-- BLOQUE 5 — ultimos_movimientos_postulante(p_limite)
--
-- Las postulaciones del postulante de la sesión que cambiaron más
-- recientemente, con lo que hace falta para mostrarlas en una sola llamada.
-- No hay historial de estados: el movimiento de cada postulación es
--   fecha = GREATEST(postulaciones.updated_at, derivaciones.updated_at)
-- postulaciones.updated_at cambia con el estado en la oficina (revisión,
-- derivación, no seleccionada, retiro, oferta retirada); derivaciones
-- .updated_at lo pone el trigger de 028 en cada cambio de la empresa
-- (entrevista coordinada o reprogramada, resultado). GREATEST ignora el NULL
-- de las postulaciones sin derivación.
--
-- titulo y empresa_nombre salen de la oferta aunque ya no esté publicada (el
-- postulante no la lee por RLS si se cerró): es la oferta a la que se
-- postuló. empresa_nombre es NULL si está vacío. estado_empresa y
-- fecha_entrevista son NULL sin derivación. Nunca devuelve notas.
-- Orden: fecha descendente e id. p_limite entre 1 y 10 (por defecto 5).
-- ============================================================

CREATE OR REPLACE FUNCTION public.ultimos_movimientos_postulante(p_limite int DEFAULT 5)
RETURNS TABLE (
  postulacion_id    uuid,
  oferta_id         uuid,
  titulo            text,
  empresa_nombre    text,
  estado            public.estado_postulacion,
  estado_empresa    public.estado_empresa,
  fecha_entrevista  timestamptz,
  fecha             timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_postulante_id uuid;
  v_limite        int := LEAST(GREATEST(COALESCE(p_limite, 5), 1), 10);
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'postulante' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT p.id INTO v_postulante_id
  FROM public.postulantes p
  WHERE p.usuario_id = auth.uid();

  IF v_postulante_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    po.id,
    po.oferta_id,
    o.titulo,
    NULLIF(pg_catalog.btrim(o.empresa_nombre), ''),
    po.estado,
    d.estado_empresa,
    d.fecha_entrevista,
    GREATEST(po.updated_at, d.updated_at) AS fecha_movimiento
  FROM      public.postulaciones po
  JOIN      public.ofertas o        ON o.id = po.oferta_id
  LEFT JOIN public.derivaciones d   ON d.postulacion_id = po.id
  WHERE     po.postulante_id = v_postulante_id
  ORDER BY  fecha_movimiento DESC, po.id DESC
  LIMIT     v_limite;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ultimos_movimientos_postulante(int) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.ultimos_movimientos_postulante(int) TO authenticated;


-- ============================================================
-- Verificación (opcional, en el SQL Editor)
-- ============================================================
-- La búsqueda de la oficina da lo mismo que antes: comparar, para una oferta
-- vigente, el resultado de buscar_candidatos_para_oferta antes y después de
-- aplicar la migración (desde la pantalla de búsqueda de la oficina, o en el
-- SQL Editor con el rol de una cuenta de la oficina).
--
-- Puntaje de un postulante para una oferta (como dueño, en el SQL Editor):
-- select * from public.puntaje_coincidencia('<oferta_id>', '<postulante_id>');
--
-- Sin sesión de postulante las funciones nuevas fallan con 42501:
-- select * from public.indicadores_postulante();


-- ============================================================
-- ROLLBACK (comentado). Ejecutar a mano solo si hace falta volver atrás.
-- Primero se vuelve a crear buscar_candidatos_para_oferta como en 056 (volver
-- a ejecutar el BLOQUE 5 de migration_056_buscar_e_invitar_candidatos.sql,
-- con su REVOKE / GRANT): después ya nada usa puntaje_coincidencia y se puede
-- borrar. No hay datos que restaurar.
-- ============================================================
--
-- DROP FUNCTION IF EXISTS public.ultimos_movimientos_postulante(int);
-- DROP FUNCTION IF EXISTS public.ofertas_recomendadas_para_mi(int);
-- DROP FUNCTION IF EXISTS public.indicadores_postulante();
-- -- (aquí: BLOQUE 5 de migration_056, buscar_candidatos_para_oferta)
-- DROP FUNCTION IF EXISTS public.puntaje_coincidencia(uuid, uuid);
