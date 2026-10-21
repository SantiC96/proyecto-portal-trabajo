-- ============================================================
-- Portal Municipal de Empleo — Migración 056
-- La oficina busca postulantes que coinciden con una oferta y los invita a
-- postularse
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_055_procedencia_y_prioridad.sql ya aplicada.
-- Re-ejecutable sin errores. No cambia ninguna fila existente: la columna
-- nueva postulaciones.origen queda en 'postulante' para todas.
-- Después de aplicarla: npm run db:tipos
-- ============================================================
--
-- Ver docs/decisiones/028-buscar-e-invitar-postulantes.md.
--
--   BLOQUE 1  postulaciones.origen ('postulante' | 'invitacion').
--   BLOQUE 2  Texto completo en español: experiencia_tsv(),
--             lexemas_significativos(), lexemas_coinciden(), índices.
--   BLOQUE 3  disponibilidad_compatible(): disponibilidad vs. jornada.
--   BLOQUE 4  Tabla invitaciones_oferta, índices, RLS y permisos.
--   BLOQUE 5  buscar_candidatos_para_oferta() (solo lectura, oficina).
--   BLOQUE 6  resumen_invitaciones_oferta() (oficina).
--   BLOQUE 7  invitar_a_oferta() (oficina).
--   BLOQUE 8  responder_invitacion() (postulante).
--   BLOQUE 9  Triggers: postulación propia con invitación pendiente, avisos
--             de invitaciones, postulaciones_notificar_alta_fn (043, misma
--             firma) y vencimiento al cerrar la oferta.
--   BLOQUE 10 mis_invitaciones() (postulante) y
--             vencer_invitaciones_de_ofertas_vencidas() (purga diaria).
--   BLOQUE 11 Avisos: tipos nuevos en el CHECK y en email_tipo_con_envio.
--
-- Estados de una invitación:
--   pendiente  la oficina invitó y el postulante no respondió. Como mucho una
--              pendiente por oferta y postulante (índice único parcial).
--   aceptada   el postulante dijo que sí: se creó una postulación normal
--              (origen 'invitacion') que la oficina revisa y deriva a mano. O
--              se postuló por su cuenta mientras la tenía pendiente.
--   rechazada  dijo que no (motivo opcional, hasta 500 caracteres).
--   vencida    la oferta dejó de aceptar postulaciones antes de la respuesta.
-- Puede haber varias invitaciones del mismo postulante a la misma oferta (el
-- historial): se puede volver a invitar a quien dijo que no o a quien se le
-- venció la invitación.
--
-- Cómo vence una invitación pendiente:
--   - La oferta deja de estar activa (cerrada por la empresa o por cubrir las
--     vacantes, vuelta a revisión por una edición, rechazada o eliminada):
--     trigger sobre ofertas (BLOQUE 9d), en la misma transacción.
--   - La oferta vence por fecha (sigue 'activa' con vence_en pasado, 036): la
--     marca la purga diaria (BLOQUE 10b, /api/mantenimiento/purgar). Hasta
--     entonces, mis_invitaciones() ya la devuelve como vencida y
--     responder_invitacion() la marca al intentar aceptarla.
--
-- La empresa no ve nada de esto: invitaciones_oferta no tiene política para
-- la empresa y postulaciones.origen no le llega (no lee postulaciones; las
-- funciones que le devuelven candidatos tienen columnas fijas y no cambian).
-- derivar_postulacion y el flujo de revisión no cambian: una postulación por
-- invitación es una postulación más.
--
-- Funciones existentes que se reemplazan (CREATE OR REPLACE, misma firma):
-- postulaciones_notificar_alta_fn (043) y email_tipo_con_envio (055). El
-- CHECK notificaciones_tipo_check se vuelve a crear con los tipos de 055 más
-- los nuevos.
--
-- Errores:
--   42501  sin permiso ('No autorizado').
--   P0001  regla de negocio; el mensaje es para el usuario.
-- ============================================================


-- ============================================================
-- BLOQUE 1 — postulaciones.origen
--
-- Lo más simple que no toca ningún trigger existente: una columna de texto
-- con DEFAULT 'postulante'. Agregar una columna con DEFAULT constante no
-- reescribe la tabla y todas las filas existentes quedan en 'postulante'.
-- No está en ningún grant (authenticated inserta solo oferta_id,
-- postulante_id y cv_archivo_id, 054; actualiza estado, nota_oficina,
-- revisado_por y updated_at, 018): solo responder_invitacion() escribe
-- 'invitacion'. La invitación apunta a su postulación con
-- invitaciones_oferta.postulacion_id.
-- ============================================================

ALTER TABLE public.postulaciones
  ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'postulante';

ALTER TABLE public.postulaciones DROP CONSTRAINT IF EXISTS postulaciones_origen_check;
ALTER TABLE public.postulaciones
  ADD CONSTRAINT postulaciones_origen_check
    CHECK (origen IN ('postulante', 'invitacion'));

COMMENT ON COLUMN public.postulaciones.origen IS
  'postulante: se postuló por su cuenta. invitacion: aceptó una invitación de '
  'la oficina (056). Solo lo ve la oficina.';


-- ============================================================
-- BLOQUE 2 — Texto completo en español
--
-- experiencia_tsv(texto): to_tsvector('spanish') de la experiencia laboral.
--   Con la configuración 'spanish' "atendí", "atención" y "atender" se
--   reducen a la misma raíz y las palabras vacías ("de", "en", "la") no
--   cuentan. Índice GIN sobre la expresión: el filtro previo de la búsqueda
--   (experiencia @@ consulta) no recorre la tabla.
-- lexemas_significativos(texto): las raíces de un requisito o del título sin
--   números ni palabras genéricas de los avisos de empleo ("experiencia",
--   "conocimientos", "años", "mínimo", "excluyente", "manejo", ...). Sin
--   ese filtro, "Experiencia en ventas" coincidiría con cualquiera que
--   escriba "experiencia".
-- lexemas_coinciden(requisito, experiencia): el requisito coincide si la
--   experiencia tiene al menos la mitad de sus raíces significativas
--   ("Atención al público" → atencion, public: alcanza con una; "Manejo de
--   caja registradora" → caj, registr: alcanza con una; un requisito de 6
--   raíces necesita 3). Exigir todas dejaba afuera a casi todos; alcanzar con
--   una sola de 6 traía demasiado ruido.
--
-- La consulta del filtro previo se arma con las raíces que da
-- to_tsvector('spanish') del requisito (convertidas a tsquery con OR). Es lo
-- mismo que to_tsquery('spanish', ...) pero sin volver a reducir una raíz ya
-- reducida: los dos lados quedan con la misma raíz.
-- ============================================================

CREATE OR REPLACE FUNCTION public.experiencia_tsv(p_texto text)
RETURNS tsvector
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT pg_catalog.to_tsvector('pg_catalog.spanish'::pg_catalog.regconfig, COALESCE(p_texto, ''))
$$;

CREATE OR REPLACE FUNCTION public.lexemas_significativos(p_texto text)
RETURNS text[]
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT COALESCE(pg_catalog.array_agg(DISTINCT l.lexema), '{}'::text[])
  FROM pg_catalog.unnest(
         pg_catalog.tsvector_to_array(public.experiencia_tsv(p_texto))
       ) AS l(lexema)
  -- Solo palabras (sin números, direcciones ni rutas): además, así cada raíz
  -- se puede escribir entre comillas en una tsquery sin escapar nada.
  WHERE l.lexema ~ '^[a-zà-ÿ]+$'
    AND pg_catalog.char_length(l.lexema) > 1
    AND l.lexema <> ALL (
      pg_catalog.tsvector_to_array(public.experiencia_tsv(
        'experiencia experiencias conocimiento conocimientos año años mes meses '
        'mínimo mínima mínimos excluyente excluyentes deseable deseables '
        'requisito requisitos indispensable preferentemente preferente '
        'buen buena buenos buenas capacidad manejo trabajo completo completa '
        'estudios disponibilidad horaria horario'
      ))
    )
$$;

CREATE OR REPLACE FUNCTION public.lexemas_coinciden(p_lexemas text[], p_lexemas_experiencia text[])
RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT COALESCE(pg_catalog.cardinality(p_lexemas), 0) > 0
     AND 2 * (
           SELECT pg_catalog.count(*)
           FROM pg_catalog.unnest(p_lexemas) AS l(lexema)
           WHERE l.lexema = ANY (p_lexemas_experiencia)
         ) >= pg_catalog.cardinality(p_lexemas)
$$;

-- Son funciones de texto puras (no leen tablas) y experiencia_tsv() está en
-- un índice de postulantes, que se evalúa con cualquier rol que escriba la
-- tabla: conservan el EXECUTE por defecto.

CREATE INDEX IF NOT EXISTS postulantes_experiencia_tsv_idx
  ON public.postulantes USING gin (public.experiencia_tsv(experiencia_laboral));

-- Rubro: postulantes interesados en las categorías de la oferta. La clave
-- primaria (postulante_id, categoria_id) no sirve para buscar por categoría.
CREATE INDEX IF NOT EXISTS postulante_categorias_categoria_idx
  ON public.postulante_categorias (categoria_id);


-- ============================================================
-- BLOQUE 3 — Disponibilidad del postulante vs. jornada de la oferta
--
-- Disponibilidad (046): manana, tarde, noche, completa, flexible.
-- Jornada (007): Tiempo completo, Part-time, Pasantía, Por proyecto.
--
--   Tiempo completo  completa, flexible
--   Part-time        manana, tarde, noche, completa, flexible
--   Pasantía         manana, tarde, completa, flexible
--   Por proyecto     completa, flexible
--
-- Quien tiene el día completo o es flexible puede tomar cualquier jornada;
-- un turno (mañana, tarde, noche) alcanza para un part-time; una pasantía
-- suele ser de día. Sin disponibilidad cargada no suma.
-- ============================================================

CREATE OR REPLACE FUNCTION public.disponibilidad_compatible(p_disponibilidad text, p_jornada text)
RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT COALESCE(CASE p_jornada
    WHEN 'Tiempo completo' THEN p_disponibilidad IN ('completa', 'flexible')
    WHEN 'Part-time'       THEN p_disponibilidad IN ('manana', 'tarde', 'noche', 'completa', 'flexible')
    WHEN 'Pasantía'        THEN p_disponibilidad IN ('manana', 'tarde', 'completa', 'flexible')
    WHEN 'Por proyecto'    THEN p_disponibilidad IN ('completa', 'flexible')
    ELSE false
  END, false)
$$;



-- ============================================================
-- BLOQUE 4 — invitaciones_oferta
--
-- Las escriben solo las funciones de esta migración (SECURITY DEFINER) y los
-- triggers: authenticated solo tiene SELECT, filtrado por RLS.
--   oficina     todas
--   postulante  las suyas
--   empresa     ninguna (no tiene política)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invitaciones_oferta (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  oferta_id       uuid        NOT NULL REFERENCES public.ofertas(id) ON DELETE CASCADE,
  postulante_id   uuid        NOT NULL REFERENCES public.postulantes(id) ON DELETE CASCADE,
  estado          text        NOT NULL DEFAULT 'pendiente',
  invitado_por    uuid        REFERENCES public.usuarios(id) ON DELETE SET NULL,
  creada_en       timestamptz NOT NULL DEFAULT now(),
  respondida_en   timestamptz,
  vencida_en      timestamptz,
  motivo_rechazo  text,
  -- ON DELETE SET NULL: retirar una postulación 'recibida' borra la fila (053).
  postulacion_id  uuid        REFERENCES public.postulaciones(id) ON DELETE SET NULL,
  CONSTRAINT invitaciones_oferta_estado_check
    CHECK (estado IN ('pendiente', 'aceptada', 'rechazada', 'vencida')),
  CONSTRAINT invitaciones_oferta_motivo_check
    CHECK (motivo_rechazo IS NULL
           OR pg_catalog.char_length(pg_catalog.btrim(motivo_rechazo)) BETWEEN 1 AND 500),
  -- Cada estado con sus columnas: respondida_en en aceptada y rechazada,
  -- vencida_en en vencida, motivo solo en rechazada y postulación solo en
  -- aceptada (puede quedar NULL si la postulación se borró).
  CONSTRAINT invitaciones_oferta_coherencia_check
    CHECK (CASE estado
      WHEN 'pendiente' THEN respondida_en IS NULL AND vencida_en IS NULL
                            AND motivo_rechazo IS NULL AND postulacion_id IS NULL
      WHEN 'aceptada'  THEN respondida_en IS NOT NULL AND vencida_en IS NULL
                            AND motivo_rechazo IS NULL
      WHEN 'rechazada' THEN respondida_en IS NOT NULL AND vencida_en IS NULL
                            AND postulacion_id IS NULL
      WHEN 'vencida'   THEN vencida_en IS NOT NULL AND respondida_en IS NULL
                            AND motivo_rechazo IS NULL AND postulacion_id IS NULL
    END)
);

COMMENT ON TABLE public.invitaciones_oferta IS
  'Invitaciones de la oficina a postulantes para que se postulen a una oferta '
  '(056). Historial: varias por oferta y postulante, una sola pendiente.';

CREATE UNIQUE INDEX IF NOT EXISTS invitaciones_oferta_pendiente_unica
  ON public.invitaciones_oferta (oferta_id, postulante_id)
  WHERE estado = 'pendiente';

-- Última invitación de cada postulante a una oferta (búsqueda y resumen).
CREATE INDEX IF NOT EXISTS invitaciones_oferta_oferta_idx
  ON public.invitaciones_oferta (oferta_id, postulante_id, creada_en DESC);

-- Las invitaciones de un postulante (su sección y la ficha de la oficina).
CREATE INDEX IF NOT EXISTS invitaciones_oferta_postulante_idx
  ON public.invitaciones_oferta (postulante_id, creada_en DESC);

CREATE INDEX IF NOT EXISTS invitaciones_oferta_postulacion_idx
  ON public.invitaciones_oferta (postulacion_id)
  WHERE postulacion_id IS NOT NULL;

ALTER TABLE public.invitaciones_oferta ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.invitaciones_oferta FROM public, anon, authenticated;
GRANT  SELECT ON public.invitaciones_oferta TO authenticated;
GRANT  ALL    ON public.invitaciones_oferta TO service_role;

DROP POLICY IF EXISTS "invitaciones_oferta: municipalidad lee todas" ON public.invitaciones_oferta;
CREATE POLICY "invitaciones_oferta: municipalidad lee todas"
  ON public.invitaciones_oferta FOR SELECT TO authenticated
  USING (public.rol_actual() = 'municipalidad');

DROP POLICY IF EXISTS "invitaciones_oferta: postulante lee las suyas" ON public.invitaciones_oferta;
CREATE POLICY "invitaciones_oferta: postulante lee las suyas"
  ON public.invitaciones_oferta FOR SELECT TO authenticated
  USING (
    public.rol_actual() = 'postulante'
    AND EXISTS (
      SELECT 1
      FROM public.postulantes p
      WHERE p.id = invitaciones_oferta.postulante_id
        AND p.usuario_id = auth.uid()
    )
  );


-- ============================================================
-- BLOQUE 5 — buscar_candidatos_para_oferta()
--
-- Solo lectura. Solo la oficina y solo para una oferta activa, no vencida y
-- no eliminada.
--
-- Quién aparece: postulantes con la cuenta activa que coinciden en rubro o en
-- texto (algún requisito o el título contra su experiencia laboral), sin una
-- postulación vigente (no retirada) a la oferta y que no fueron contratados
-- en ella. Los que ya se postularon se listan aparte (la pantalla los lee con
-- RLS).
--
-- Puntaje (pesos en un solo lugar: las constantes c_peso_* de abajo):
--   rubro          40  interés en al menos un rubro de la oferta. Es el
--                      criterio más fuerte: lo eligió el postulante.
--   requisitos     10 por requisito que coincide, hasta 30.
--   título         10  el título de la oferta coincide con su experiencia.
--   disponibilidad 10  compatible con la jornada (BLOQUE 3).
--   CV             10  tiene al menos un CV disponible.
--   Máximo 100. Coincidencia: alta desde 60, media desde 35, baja debajo.
--   Ejemplo: rubro (40) + 1 requisito (10) + CV (10) = 60, alta.
--
-- Orden (resuelto acá para que la paginación respete los dos grupos):
--   1. Los que nunca fueron invitados a esta oferta; al final, los que sí
--      (con la última invitación pendiente, rechazada, vencida o aceptada
--      con la postulación retirada después).
--   2. Puntaje descendente, nivel_prioridad (1, 2, 3), el más reciente, id.
--
-- Filtros: solo con CV, solo de Funes, nivel de prioridad y ocultar a los que
-- dijeron que no (su última invitación a esta oferta está rechazada).
-- p_limite entre 1 y 100. total es la cantidad de filas con los filtros, para
-- paginar.
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
  -- Pesos del puntaje y umbrales de coincidencia (ver el encabezado).
  c_peso_rubro          CONSTANT int := 40;
  c_peso_requisito      CONSTANT int := 10;
  c_tope_requisitos     CONSTANT int := 30;
  c_peso_titulo         CONSTANT int := 10;
  c_peso_disponibilidad CONSTANT int := 10;
  c_peso_cv             CONSTANT int := 10;
  c_umbral_alta         CONSTANT int := 60;
  c_umbral_media        CONSTANT int := 35;

  v_estado      public.estado_oferta;
  v_vence_en    timestamptz;
  v_eliminada   timestamptz;
  v_titulo      text;
  v_requisitos  text[];
  v_jornada     text;
  v_lex_titulo  text[];
  v_lex_todos   text[];
  v_consulta    tsquery;
  v_limite      int := LEAST(GREATEST(COALESCE(p_limite, 20), 1), 100);
  v_offset      int := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  IF public.rol_actual() IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT o.estado, o.vence_en, o.eliminada_en, o.titulo, o.requisitos, o.jornada::text
  INTO   v_estado, v_vence_en, v_eliminada, v_titulo, v_requisitos, v_jornada
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
  WITH rubros AS (
    SELECT pc.postulante_id,
           pg_catalog.array_agg(c.nombre ORDER BY c.nombre) AS nombres
    FROM   public.oferta_categorias oc
    JOIN   public.postulante_categorias pc ON pc.categoria_id = oc.categoria_id
    JOIN   public.categorias c            ON c.id = oc.categoria_id
    WHERE  oc.oferta_id = p_oferta_id
    GROUP  BY pc.postulante_id
  ),
  requisitos AS (
    SELECT r.orden,
           pg_catalog.btrim(r.texto)            AS texto,
           public.lexemas_significativos(r.texto) AS lexemas
    FROM   pg_catalog.unnest(COALESCE(v_requisitos, '{}'::text[])) WITH ORDINALITY AS r(texto, orden)
  ),
  candidatos AS (
    SELECT ru.postulante_id AS id FROM rubros ru
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
      COALESCE(ru.nombres, '{}'::text[]) AS rubros,
      COALESCE((
        SELECT pg_catalog.array_agg(rq.texto ORDER BY rq.orden)
        FROM   requisitos rq
        WHERE  public.lexemas_coinciden(rq.lexemas, lx.lexemas)
      ), '{}'::text[]) AS requisitos_ok,
      public.lexemas_coinciden(v_lex_titulo, lx.lexemas)            AS titulo_ok,
      public.disponibilidad_compatible(p.disponibilidad, v_jornada) AS disponibilidad_ok,
      EXISTS (
        SELECT 1
        FROM   public.archivos_usuario a
        WHERE  a.usuario_id = p.usuario_id
          AND  a.tipo = 'cv'
          AND  a.eliminado_en IS NULL
      ) AS con_cv,
      inv.estado   AS inv_estado,
      inv.fecha    AS inv_fecha,
      inv.motivo   AS inv_motivo,
      COALESCE(inv.cantidad, 0) AS inv_cantidad
    FROM       candidatos ca
    JOIN       public.postulantes p ON p.id = ca.id
    JOIN       public.usuarios u    ON u.id = p.usuario_id
    LEFT JOIN  rubros ru            ON ru.postulante_id = p.id
    CROSS JOIN LATERAL (
      SELECT pg_catalog.tsvector_to_array(public.experiencia_tsv(p.experiencia_laboral)) AS lexemas
    ) lx
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
    SELECT
      e.*,
      (CASE WHEN pg_catalog.cardinality(e.rubros) > 0 THEN c_peso_rubro ELSE 0 END
       + LEAST(pg_catalog.cardinality(e.requisitos_ok) * c_peso_requisito, c_tope_requisitos)
       + CASE WHEN e.titulo_ok         THEN c_peso_titulo         ELSE 0 END
       + CASE WHEN e.disponibilidad_ok THEN c_peso_disponibilidad ELSE 0 END
       + CASE WHEN e.con_cv            THEN c_peso_cv             ELSE 0 END
      )::int AS puntos
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
    CASE
      WHEN pu.puntos >= c_umbral_alta  THEN 'alta'
      WHEN pu.puntos >= c_umbral_media THEN 'media'
      ELSE 'baja'
    END,
    pu.rubros,
    pu.requisitos_ok,
    pu.titulo_ok,
    pu.disponibilidad_ok,
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
-- BLOQUE 6 — resumen_invitaciones_oferta(p_oferta_id)
-- Para el detalle de la oferta de la oficina. Cuenta personas, según la
-- última invitación de cada una: aceptaron, dijeron que no, sin respuesta
-- (pendiente con la oferta todavía abierta) y vencidas (vencida, o pendiente
-- con la oferta ya cerrada o vencida por fecha). invitados es el total.
-- ============================================================

CREATE OR REPLACE FUNCTION public.resumen_invitaciones_oferta(p_oferta_id uuid)
RETURNS TABLE (
  invitados      int,
  aceptaron      int,
  rechazaron     int,
  sin_respuesta  int,
  vencidas       int
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_abierta boolean;
BEGIN
  IF public.rol_actual() IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(o.estado = 'activa' AND o.eliminada_en IS NULL AND o.vence_en > now(), false)
  INTO   v_abierta
  FROM   public.ofertas o
  WHERE  o.id = p_oferta_id;

  RETURN QUERY
  WITH ultimas AS (
    SELECT DISTINCT ON (i.postulante_id)
           CASE
             WHEN i.estado = 'pendiente' AND NOT COALESCE(v_abierta, false) THEN 'vencida'
             ELSE i.estado
           END AS estado
    FROM   public.invitaciones_oferta i
    WHERE  i.oferta_id = p_oferta_id
    ORDER  BY i.postulante_id, i.creada_en DESC, i.id DESC
  )
  SELECT
    pg_catalog.count(*)::int,
    (pg_catalog.count(*) FILTER (WHERE u.estado = 'aceptada'))::int,
    (pg_catalog.count(*) FILTER (WHERE u.estado = 'rechazada'))::int,
    (pg_catalog.count(*) FILTER (WHERE u.estado = 'pendiente'))::int,
    (pg_catalog.count(*) FILTER (WHERE u.estado = 'vencida'))::int
  FROM ultimas u;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resumen_invitaciones_oferta(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.resumen_invitaciones_oferta(uuid) TO authenticated;


-- ============================================================
-- BLOQUE 7 — invitar_a_oferta(p_oferta_id, p_postulante_id)
--
-- Solo la oficina con la cuenta activa (rol_actual(), 050). Devuelve el id de
-- la invitación. El aviso al postulante (con email) sale del trigger del
-- BLOQUE 9b.
--
-- La oferta se bloquea FOR SHARE: si al mismo tiempo se cierra, uno espera
-- al otro. O se cierra antes (y acá se ve que ya no está activa) o después
-- (y el trigger de vencimiento, BLOQUE 9d, ya ve esta invitación).
-- Se puede volver a invitar a quien dijo que no o tuvo una invitación
-- vencida: solo se impide una segunda pendiente (además del índice único).
-- ============================================================

CREATE OR REPLACE FUNCTION public.invitar_a_oferta(p_oferta_id uuid, p_postulante_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_estado     public.estado_oferta;
  v_vence_en   timestamptz;
  v_eliminada  timestamptz;
  v_activo     boolean;
  v_id         uuid;
BEGIN
  IF public.rol_actual() IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT o.estado, o.vence_en, o.eliminada_en
  INTO   v_estado, v_vence_en, v_eliminada
  FROM   public.ofertas o
  WHERE  o.id = p_oferta_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La oferta no existe.';
  END IF;
  IF v_eliminada IS NOT NULL
     OR v_estado IS DISTINCT FROM 'activa'
     OR v_vence_en IS NULL
     OR v_vence_en <= now() THEN
    RAISE EXCEPTION 'La oferta ya no acepta postulaciones: no se puede invitar.';
  END IF;

  SELECT u.activo
  INTO   v_activo
  FROM   public.postulantes p
  JOIN   public.usuarios u ON u.id = p.usuario_id
  WHERE  p.id = p_postulante_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El postulante no existe.';
  END IF;
  IF NOT v_activo THEN
    RAISE EXCEPTION 'La cuenta de esta persona está desactivada.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM   public.postulaciones po
    WHERE  po.oferta_id = p_oferta_id
      AND  po.postulante_id = p_postulante_id
      AND  po.retirada_en IS NULL
  ) THEN
    RAISE EXCEPTION 'Esta persona ya se postuló a esta oferta.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM   public.invitaciones_oferta i
    WHERE  i.oferta_id = p_oferta_id
      AND  i.postulante_id = p_postulante_id
      AND  i.estado = 'pendiente'
  ) THEN
    RAISE EXCEPTION 'Esta persona ya tiene una invitación pendiente a esta oferta.';
  END IF;

  BEGIN
    INSERT INTO public.invitaciones_oferta (oferta_id, postulante_id, invitado_por)
    VALUES (p_oferta_id, p_postulante_id, auth.uid())
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Esta persona ya tiene una invitación pendiente a esta oferta.';
  END;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.invitar_a_oferta(uuid, uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.invitar_a_oferta(uuid, uuid) TO authenticated;


-- ============================================================
-- BLOQUE 8 — responder_invitacion(p_invitacion_id, p_acepta, p_cv_archivo_id,
--            p_motivo)
--
-- Solo el postulante dueño y solo invitaciones pendientes. Devuelve
-- 'aceptada', 'rechazada' o 'vencida'.
--
--   No acepta  'rechazada' con el motivo (opcional, hasta 500 caracteres).
--              El aviso a la oficina sale del trigger del BLOQUE 9b.
--   Acepta     - Ya tiene una postulación vigente a la oferta (se postuló por
--                su cuenta): la invitación queda 'aceptada' apuntando a esa
--                postulación, sin crear otra. Normalmente ya lo hizo el
--                trigger del BLOQUE 9a; esto cubre el caso de carrera.
--              - La oferta ya no acepta postulaciones: 'vencida' y se
--                devuelve 'vencida' (sin error, para que el cambio quede
--                guardado). La aplicación muestra "La oferta ya se cerró."
--              - Si no: INSERT de una postulación normal con el CV elegido y
--                origen 'invitacion'. Pasa por todos los triggers de
--                postulaciones: oferta vigente (036), CV elegido (054: tiene
--                que ser suyo y estar disponible), aviso a la oficina (043,
--                reemplazado en el BLOQUE 9c para no duplicarlo) y email de
--                confirmación (048). Queda 'recibida', sin derivar: la oficina
--                la revisa como cualquier otra.
--
-- Bloqueos: la oferta FOR SHARE y después la invitación FOR UPDATE (el mismo
-- orden que el cierre de la oferta: ofertas y después invitaciones).
-- ============================================================

CREATE OR REPLACE FUNCTION public.responder_invitacion(
  p_invitacion_id  uuid,
  p_acepta         boolean,
  p_cv_archivo_id  uuid DEFAULT NULL,
  p_motivo         text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_motivo         text := NULLIF(pg_catalog.btrim(p_motivo), '');
  v_oferta_id      uuid;
  v_postulante_id  uuid;
  v_estado         text;
  v_oferta_abierta boolean;
  v_postulacion_id uuid;
BEGIN
  IF public.rol_actual() IS DISTINCT FROM 'postulante' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  IF p_acepta IS NULL THEN
    RAISE EXCEPTION 'Indicá si te interesa la oferta.';
  END IF;
  IF NOT p_acepta AND v_motivo IS NOT NULL AND pg_catalog.char_length(v_motivo) > 500 THEN
    RAISE EXCEPTION 'El motivo puede tener hasta 500 caracteres.';
  END IF;

  -- oferta_id y postulante_id no cambian: se leen antes de bloquear.
  SELECT i.oferta_id, i.postulante_id
  INTO   v_oferta_id, v_postulante_id
  FROM   public.invitaciones_oferta i
  JOIN   public.postulantes p ON p.id = i.postulante_id
  WHERE  i.id = p_invitacion_id
    AND  p.usuario_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la invitación.';
  END IF;

  SELECT COALESCE(o.estado = 'activa' AND o.eliminada_en IS NULL AND o.vence_en > now(), false)
  INTO   v_oferta_abierta
  FROM   public.ofertas o
  WHERE  o.id = v_oferta_id
  FOR SHARE;

  SELECT i.estado
  INTO   v_estado
  FROM   public.invitaciones_oferta i
  WHERE  i.id = p_invitacion_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la invitación.';
  END IF;

  IF v_estado = 'aceptada' THEN
    RAISE EXCEPTION 'Ya aceptaste esta invitación.';
  ELSIF v_estado = 'rechazada' THEN
    RAISE EXCEPTION 'Ya respondiste esta invitación.';
  ELSIF v_estado = 'vencida' THEN
    RAISE EXCEPTION 'La oferta ya se cerró.';
  END IF;

  IF NOT p_acepta THEN
    UPDATE public.invitaciones_oferta
    SET    estado         = 'rechazada',
           respondida_en  = now(),
           motivo_rechazo = v_motivo
    WHERE  id = p_invitacion_id;
    RETURN 'rechazada';
  END IF;

  SELECT po.id
  INTO   v_postulacion_id
  FROM   public.postulaciones po
  WHERE  po.oferta_id = v_oferta_id
    AND  po.postulante_id = v_postulante_id
    AND  po.retirada_en IS NULL;

  IF v_postulacion_id IS NULL THEN
    IF NOT v_oferta_abierta THEN
      UPDATE public.invitaciones_oferta
      SET    estado     = 'vencida',
             vencida_en = now()
      WHERE  id = p_invitacion_id;
      RETURN 'vencida';
    END IF;

    BEGIN
      INSERT INTO public.postulaciones (oferta_id, postulante_id, cv_archivo_id, origen)
      VALUES (v_oferta_id, v_postulante_id, p_cv_archivo_id, 'invitacion')
      RETURNING id INTO v_postulacion_id;
    EXCEPTION WHEN unique_violation THEN
      -- Se postuló por su cuenta en este mismo momento: se usa esa.
      SELECT po.id
      INTO   v_postulacion_id
      FROM   public.postulaciones po
      WHERE  po.oferta_id = v_oferta_id
        AND  po.postulante_id = v_postulante_id
        AND  po.retirada_en IS NULL;
      IF v_postulacion_id IS NULL THEN
        RAISE;
      END IF;
    END;
  END IF;

  UPDATE public.invitaciones_oferta
  SET    estado         = 'aceptada',
         respondida_en  = now(),
         postulacion_id = v_postulacion_id
  WHERE  id = p_invitacion_id;

  RETURN 'aceptada';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.responder_invitacion(uuid, boolean, uuid, text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.responder_invitacion(uuid, boolean, uuid, text) TO authenticated;


-- ============================================================
-- BLOQUE 9 — Triggers
--
-- 9a. AFTER INSERT ON postulaciones (origen 'postulante'): si tenía una
--     invitación pendiente a esa oferta, pasa a 'aceptada' apuntando a la
--     postulación nueva. SKIP LOCKED: si en ese momento la está respondiendo
--     (responder_invitacion la tiene bloqueada), la deja; responder la enlaza
--     a esta postulación al chocar con el índice único. Nunca hace fallar la
--     postulación (EXCEPTION + WARNING).
-- 9b. Avisos de invitaciones (nunca rompen la acción, 041):
--       postulante  'invitacion_oferta'     al invitar. Con email. Clave por
--                                           invitación: volver a invitar
--                                           genera un aviso nuevo.
--       oficina     'invitacion_rechazada'  al decir que no, con el motivo si
--                                           lo dejó. Sin email. Link a la
--                                           búsqueda de la oferta.
-- 9c. postulaciones_notificar_alta_fn (043), misma firma. Una postulación por
--     invitación avisaba "X se postuló a «Y»" ('postulacion_nueva') y además
--     habría que avisar que aceptó: quedan en UN solo aviso, el de este
--     trigger, que con origen 'invitacion' es 'invitacion_aceptada' ("X
--     aceptó la invitación a «Y». Su postulación está pendiente de
--     revisión.") con link a la ficha de la postulación y la misma clave
--     postulacion_nueva:<id>. Así ningún otro camino puede sumar un segundo
--     aviso para la misma postulación. Sin email. El resto, igual que 043.
-- 9d. AFTER UPDATE ON ofertas: cuando una oferta activa deja de estarlo (o se
--     elimina), sus invitaciones pendientes pasan a 'vencida'. No avisa a
--     nadie. Si falla, falla el cambio de la oferta (no es un aviso).
-- ============================================================

-- 9a
CREATE OR REPLACE FUNCTION public.postulaciones_aceptar_invitacion_fn()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  BEGIN
    UPDATE public.invitaciones_oferta i
    SET    estado         = 'aceptada',
           respondida_en  = now(),
           postulacion_id = NEW.id
    WHERE  i.id IN (
      SELECT i2.id
      FROM   public.invitaciones_oferta i2
      WHERE  i2.oferta_id = NEW.oferta_id
        AND  i2.postulante_id = NEW.postulante_id
        AND  i2.estado = 'pendiente'
      FOR UPDATE SKIP LOCKED
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'postulaciones_aceptar_invitacion_fn: % (%)', SQLERRM, SQLSTATE;
  END;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.postulaciones_aceptar_invitacion_fn() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS postulaciones_aceptar_invitacion ON public.postulaciones;
CREATE TRIGGER postulaciones_aceptar_invitacion
  AFTER INSERT ON public.postulaciones
  FOR EACH ROW
  WHEN (NEW.origen = 'postulante')
  EXECUTE FUNCTION public.postulaciones_aceptar_invitacion_fn();

-- 9b
CREATE OR REPLACE FUNCTION public.invitaciones_oferta_avisos_fn()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_usuario_id uuid;
  v_nombre     text;
  v_oferta     text;
  v_empresa    text;
  v_motivo     text;
BEGIN
  BEGIN
    SELECT
      p.usuario_id,
      COALESCE(NULLIF(pg_catalog.btrim(u.nombre || ' ' || u.apellido), ''), 'Un postulante'),
      o.titulo,
      NULLIF(pg_catalog.btrim(o.empresa_nombre), '')
    INTO v_usuario_id, v_nombre, v_oferta, v_empresa
    FROM public.postulantes p
    JOIN public.usuarios u ON u.id = p.usuario_id
    JOIN public.ofertas o  ON o.id = NEW.oferta_id
    WHERE p.id = NEW.postulante_id;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    IF TG_OP = 'INSERT' AND NEW.estado = 'pendiente' THEN
      PERFORM public.notificar_usuario(
        v_usuario_id,
        'invitacion_oferta',
        'Una oferta para vos',
        'La Oficina de Empleo te propone la oferta «' || v_oferta || '»'
          || COALESCE(' de ' || v_empresa, '')
          || '. Entrá para decirnos si te interesa.',
        '/mis-postulaciones#invitaciones',
        'invitacion_oferta:' || NEW.id::text
      );

    ELSIF TG_OP = 'UPDATE'
          AND NEW.estado = 'rechazada'
          AND OLD.estado IS DISTINCT FROM 'rechazada' THEN
      v_motivo := pg_catalog.rtrim(pg_catalog.btrim(NEW.motivo_rechazo), '.');
      PERFORM public.notificar_oficina(
        'invitacion_rechazada',
        'Invitación no aceptada',
        v_nombre || ' no está interesado en la oferta «' || v_oferta || '».'
          || COALESCE(' Motivo: ' || NULLIF(v_motivo, '') || '.', ''),
        '/admin/ofertas/' || NEW.oferta_id::text || '/candidatos',
        'invitacion_rechazada:' || NEW.id::text
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'invitaciones_oferta_avisos_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.invitaciones_oferta_avisos_fn() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS invitaciones_oferta_avisos ON public.invitaciones_oferta;
CREATE TRIGGER invitaciones_oferta_avisos
  AFTER INSERT OR UPDATE ON public.invitaciones_oferta
  FOR EACH ROW EXECUTE FUNCTION public.invitaciones_oferta_avisos_fn();

-- 9c (copia de 043 con la rama de origen 'invitacion')
CREATE OR REPLACE FUNCTION public.postulaciones_notificar_alta_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_postulante text;
  v_oferta     text;
  v_empresa    text;
BEGIN
  BEGIN
    SELECT
      pg_catalog.btrim(u.nombre || ' ' || u.apellido),
      o.titulo,
      NULLIF(pg_catalog.btrim(o.empresa_nombre), '')
    INTO v_postulante, v_oferta, v_empresa
    FROM public.ofertas o
    JOIN public.postulantes pt ON pt.id = NEW.postulante_id
    JOIN public.usuarios u     ON u.id  = pt.usuario_id
    WHERE o.id = NEW.oferta_id;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    IF NEW.origen = 'invitacion' THEN
      PERFORM public.notificar_oficina(
        'invitacion_aceptada',
        'Invitación aceptada',
        v_postulante || ' aceptó la invitación a «' || v_oferta || '».'
          || ' Su postulación está pendiente de revisión.',
        '/admin/postulaciones/' || NEW.id::text,
        'postulacion_nueva:' || NEW.id::text
      );
    ELSE
      PERFORM public.notificar_oficina(
        'postulacion_nueva',
        'Nueva postulación',
        v_postulante || ' se postuló a «' || v_oferta || '»'
          || COALESCE(' de ' || v_empresa, '') || '.',
        '/admin/postulaciones/' || NEW.id::text,
        'postulacion_nueva:' || NEW.id::text
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'postulaciones_notificar_alta_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;

-- 9d
CREATE OR REPLACE FUNCTION public.ofertas_vencer_invitaciones_fn()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.invitaciones_oferta i
  SET    estado     = 'vencida',
         vencida_en = now()
  WHERE  i.oferta_id = NEW.id
    AND  i.estado = 'pendiente';
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ofertas_vencer_invitaciones_fn() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS ofertas_vencer_invitaciones ON public.ofertas;
CREATE TRIGGER ofertas_vencer_invitaciones
  AFTER UPDATE OF estado, eliminada_en ON public.ofertas
  FOR EACH ROW
  WHEN (OLD.estado = 'activa'
        AND (NEW.estado IS DISTINCT FROM OLD.estado
             OR (NEW.eliminada_en IS NOT NULL AND OLD.eliminada_en IS NULL)))
  EXECUTE FUNCTION public.ofertas_vencer_invitaciones_fn();


-- ============================================================
-- BLOQUE 10 — Lectura del postulante y purga diaria
--
-- 10a. mis_invitaciones(): las invitaciones del postulante de la sesión con
--      el título y la empresa de la oferta (el postulante no lee por RLS una
--      oferta cerrada a la que no se postuló). Una pendiente cuya oferta ya
--      no acepta postulaciones se devuelve como 'vencida' (con la fecha de
--      vencimiento de la oferta, o ahora si se cerró de otra forma) hasta que
--      la purga la marque. Primero las pendientes y después por fecha.
-- 10b. vencer_invitaciones_de_ofertas_vencidas(): marca 'vencida' las
--      pendientes de ofertas que ya no aceptan postulaciones (en la práctica,
--      las vencidas por fecha: el resto ya las venció el trigger 9d). Solo
--      service_role; la llama /api/mantenimiento/purgar.
-- ============================================================

CREATE OR REPLACE FUNCTION public.mis_invitaciones()
RETURNS TABLE (
  id                 uuid,
  oferta_id          uuid,
  oferta_titulo      text,
  empresa_nombre     text,
  oferta_disponible  boolean,
  estado             text,
  creada_en          timestamptz,
  respondida_en      timestamptz,
  vencida_en         timestamptz,
  motivo_rechazo     text,
  postulacion_id     uuid
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    i.id,
    i.oferta_id,
    o.titulo,
    NULLIF(pg_catalog.btrim(o.empresa_nombre), ''),
    x.abierta,
    CASE WHEN i.estado = 'pendiente' AND NOT x.abierta THEN 'vencida' ELSE i.estado END,
    i.creada_en,
    i.respondida_en,
    CASE
      WHEN i.estado = 'pendiente' AND NOT x.abierta THEN LEAST(COALESCE(o.vence_en, now()), now())
      ELSE i.vencida_en
    END,
    i.motivo_rechazo,
    i.postulacion_id
  FROM public.invitaciones_oferta i
  JOIN public.postulantes p ON p.id = i.postulante_id
  JOIN public.ofertas o     ON o.id = i.oferta_id
  CROSS JOIN LATERAL (
    SELECT COALESCE(o.estado = 'activa' AND o.eliminada_en IS NULL AND o.vence_en > now(), false) AS abierta
  ) x
  WHERE p.usuario_id = auth.uid()
    AND public.rol_actual() = 'postulante'
  ORDER BY (i.estado = 'pendiente' AND x.abierta) DESC, i.creada_en DESC, i.id DESC
$$;

REVOKE EXECUTE ON FUNCTION public.mis_invitaciones() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.mis_invitaciones() TO authenticated;

CREATE OR REPLACE FUNCTION public.vencer_invitaciones_de_ofertas_vencidas()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_cantidad int;
BEGIN
  UPDATE public.invitaciones_oferta i
  SET    estado     = 'vencida',
         vencida_en = LEAST(COALESCE(o.vence_en, now()), now())
  FROM   public.ofertas o
  WHERE  o.id = i.oferta_id
    AND  i.estado = 'pendiente'
    AND  NOT COALESCE(o.estado = 'activa' AND o.eliminada_en IS NULL AND o.vence_en > now(), false);

  GET DIAGNOSTICS v_cantidad = ROW_COUNT;
  RETURN v_cantidad;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.vencer_invitaciones_de_ofertas_vencidas() FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.vencer_invitaciones_de_ofertas_vencidas() TO service_role;


-- ============================================================
-- BLOQUE 11 — Avisos
-- 11a. CHECK de tipos: el vigente de 055 más
--        Oficina     'invitacion_aceptada'   sin email
--                    'invitacion_rechazada'  sin email
--        Postulante  'invitacion_oferta'     con email
-- 11b. email_tipo_con_envio (055) más 'invitacion_oferta'.
-- ============================================================

ALTER TABLE public.notificaciones DROP CONSTRAINT IF EXISTS notificaciones_tipo_check;
ALTER TABLE public.notificaciones
  ADD CONSTRAINT notificaciones_tipo_check
  CHECK (tipo IN (
    -- Oficina
    'contratacion',
    'empresa_pendiente',
    'oferta_pendiente',
    'curso_completado',
    'postulacion_nueva',
    'necesita_curso',
    'oferta_retirada',
    'postulacion_retirada',
    'comprobante_pendiente',
    'invitacion_aceptada',
    'invitacion_rechazada',
    -- Postulante
    'postulacion_derivada',
    'entrevista',
    'seleccionado',
    'no_seleccionado_empresa',
    'no_seleccionado_oficina',
    'curso_asignado',
    'pre_entrevista_coordinada',
    'pre_entrevista_reprogramada',
    'postulacion_cerrada',
    'comprobante_aprobado',
    'comprobante_rechazado',
    'invitacion_oferta',
    -- Empresa
    'solicitud_aprobada',
    'solicitud_rechazada',
    'oferta_aprobada',
    'oferta_rechazada',
    'candidato_derivado',
    'oferta_por_vencer',
    'oferta_vencida',
    'candidato_retirado'
  ));

CREATE OR REPLACE FUNCTION public.email_tipo_con_envio(p_tipo text)
RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT p_tipo IN (
    -- Postulante
    'postulacion_derivada',
    'entrevista',
    'seleccionado',
    'no_seleccionado_empresa',
    'no_seleccionado_oficina',
    'curso_asignado',
    'pre_entrevista_coordinada',
    'pre_entrevista_reprogramada',
    'postulacion_cerrada',
    'comprobante_aprobado',
    'comprobante_rechazado',
    'invitacion_oferta',
    -- Empresa
    'solicitud_aprobada',
    'solicitud_rechazada',
    'oferta_aprobada',
    'oferta_rechazada',
    'candidato_derivado',
    'oferta_por_vencer',
    'oferta_vencida',
    'candidato_retirado',
    -- Oficina
    'empresa_pendiente',
    'oferta_pendiente',
    'contratacion'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.email_tipo_con_envio(text)
  FROM public, anon, authenticated;


-- ============================================================
-- Verificación (opcional, en el SQL Editor)
-- ============================================================
-- Todas las postulaciones existentes quedaron con origen 'postulante':
-- select origen, count(*) from public.postulaciones group by origen;
--
-- Cómo se comparan un requisito y una experiencia:
-- select public.lexemas_significativos('Experiencia mínima de 2 años en atención al público');
-- select public.lexemas_coinciden(
--   public.lexemas_significativos('Atención al público'),
--   tsvector_to_array(public.experiencia_tsv('Atendí al público en un comercio')));
--
-- Invitaciones pendientes de ofertas que ya no aceptan postulaciones (las
-- marca la purga diaria):
-- select i.id, o.titulo, o.vence_en from public.invitaciones_oferta i
-- join public.ofertas o on o.id = i.oferta_id
-- where i.estado = 'pendiente' and not (o.estado = 'activa' and o.vence_en > now());


-- ============================================================
-- ROLLBACK (comentado). Ejecutar a mano solo si hace falta volver atrás.
-- postulaciones_notificar_alta_fn vuelve a la versión de 043 (BLOQUE 4) y
-- email_tipo_con_envio y el CHECK de notificaciones a los de 055 (BLOQUE 9);
-- para el CHECK, antes borrar los avisos de los tipos nuevos. Quitar la
-- columna origen no borra postulaciones: las que vinieron por invitación
-- quedan como cualquier otra.
-- ============================================================
--
-- DELETE FROM public.notificaciones
-- WHERE tipo IN ('invitacion_aceptada', 'invitacion_rechazada', 'invitacion_oferta');
-- -- (aquí: CHECK notificaciones_tipo_check y email_tipo_con_envio de 055)
-- -- (aquí: postulaciones_notificar_alta_fn de 043)
--
-- DROP FUNCTION IF EXISTS public.vencer_invitaciones_de_ofertas_vencidas();
-- DROP FUNCTION IF EXISTS public.mis_invitaciones();
--
-- DROP TRIGGER IF EXISTS ofertas_vencer_invitaciones ON public.ofertas;
-- DROP FUNCTION IF EXISTS public.ofertas_vencer_invitaciones_fn();
-- DROP TRIGGER IF EXISTS invitaciones_oferta_avisos ON public.invitaciones_oferta;
-- DROP FUNCTION IF EXISTS public.invitaciones_oferta_avisos_fn();
-- DROP TRIGGER IF EXISTS postulaciones_aceptar_invitacion ON public.postulaciones;
-- DROP FUNCTION IF EXISTS public.postulaciones_aceptar_invitacion_fn();
--
-- DROP FUNCTION IF EXISTS public.responder_invitacion(uuid, boolean, uuid, text);
-- DROP FUNCTION IF EXISTS public.invitar_a_oferta(uuid, uuid);
-- DROP FUNCTION IF EXISTS public.resumen_invitaciones_oferta(uuid);
-- DROP FUNCTION IF EXISTS public.buscar_candidatos_para_oferta(uuid, boolean, boolean, int, boolean, int, int);
--
-- DROP TABLE IF EXISTS public.invitaciones_oferta;
--
-- DROP FUNCTION IF EXISTS public.disponibilidad_compatible(text, text);
-- DROP INDEX IF EXISTS public.postulante_categorias_categoria_idx;
-- DROP INDEX IF EXISTS public.postulantes_experiencia_tsv_idx;
-- DROP FUNCTION IF EXISTS public.lexemas_coinciden(text[], text[]);
-- DROP FUNCTION IF EXISTS public.lexemas_significativos(text);
-- DROP FUNCTION IF EXISTS public.experiencia_tsv(text);
--
-- ALTER TABLE public.postulaciones DROP CONSTRAINT IF EXISTS postulaciones_origen_check;
-- ALTER TABLE public.postulaciones DROP COLUMN IF EXISTS origen;
