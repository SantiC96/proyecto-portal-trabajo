-- ============================================================
-- Portal Municipal de Empleo — Migración 064
-- Entrevistas flexibles: seleccionar sin entrevista, modalidad presencial u
-- online (con link) y reprogramar la modalidad, el lugar o el link
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_063_retiro_postulacion_recibida.sql ya aplicada.
-- Re-ejecutable sin errores. No cambia el estado de ninguna fila: las
-- pre-entrevistas y las entrevistas que ya existen quedan como presenciales,
-- con el mismo lugar y sin link.
-- Después de aplicarla: npm run db:tipos
-- ============================================================
--
-- Ver docs/decisiones/017-pre-entrevista.md y
-- docs/decisiones/007-acceso-candidatos-empresa.md.
--
--   BLOQUE 1  pre_entrevistas: modalidad ('presencial' | 'online', por
--             defecto 'presencial') y link. lugar deja de ser NOT NULL: lo
--             exige el CHECK solo en las presenciales.
--   BLOQUE 2  derivaciones: modalidad_entrevista y link_entrevista, con sus
--             CHECK y el permiso de UPDATE para la empresa.
--   BLOQUE 3  detalle_entrevista_aviso(): el texto "Fecha … Modalidad …
--             Lugar/Link …" de los avisos, en un solo lugar.
--   BLOQUE 4  Pre-entrevista: pre_entrevistas_transicion_fn (053) con la
--             modalidad y el link; validar_datos_pre_entrevista,
--             coordinar_pre_entrevista y reprogramar_pre_entrevista (044)
--             con firma nueva; mis_pre_entrevistas (044) devuelve la
--             modalidad y el link.
--   BLOQUE 5  Aviso de la pre-entrevista: pre_entrevistas_notificar_fn (044)
--             con la modalidad y el lugar o el link; los dos triggers
--             también disparan si cambian la modalidad o el link.
--   BLOQUE 6  derivaciones_empresa_update_fn (053), misma firma:
--               · la empresa puede seleccionar desde 'pendiente' (sin
--                 entrevista) y desde 'en_proceso' sin esperar la fecha;
--               · al coordinar o reprogramar, el lugar se exige solo en
--                 presencial y el link solo en online;
--               · cualquier cambio de los datos de la entrevista exige una
--                 fecha futura y el estado 'en_proceso'.
--   BLOQUE 7  Aviso de la entrevista: derivaciones_notificar_postulante_fn
--             (051) con la modalidad y el lugar o el link; el trigger
--             derivaciones_notificar_postulante (041) también dispara si
--             cambian la modalidad o el link.
--   BLOQUE 8  estado_derivacion_postulante (028) y
--             derivaciones_de_oferta_empresa (028) devuelven la modalidad y
--             el link.
--
-- Transiciones de la empresa (BLOQUE 6):
--   pendiente  → en_proceso (coordinar) | contratado | rechazado
--   en_proceso → en_proceso (reprogramar) | contratado | rechazado
--   contratado, rechazado, oferta_retirada, retirada_postulante: finales.
-- Antes (029–053): pendiente → en_proceso | rechazado, y contratado solo
-- desde en_proceso con la fecha de la entrevista ya pasada.
--
-- Lo que NO cambia y por qué:
--   Seleccionar desde 'pendiente' pasa por los mismos triggers que desde
--   'en_proceso', porque todos miran solo el estado nuevo:
--     derivaciones_limite_vacantes (040)       BEFORE UPDATE OF
--                                              estado_empresa, WHEN NEW =
--                                              'contratado' AND OLD <>
--                                              'contratado'.
--     derivaciones_auto_cerrar_oferta (029)    sale si NEW <> 'contratado' u
--                                              OLD = 'contratado'.
--     derivaciones_notificar_contratacion (038) a la oficina, mismo WHEN que
--                                              el límite de vacantes.
--     derivaciones_notificar_postulante (051)  'seleccionado' cuando cambia
--                                              estado_empresa a 'contratado';
--                                              la rama de la entrevista exige
--                                              'en_proceso', así que desde
--                                              'pendiente' solo sale
--                                              "¡Fuiste seleccionado!".
--   Rechazar: igual que hoy (desde 'pendiente' o 'en_proceso', con motivo).
--   Estados finales, oferta retirada (051) y retiro del postulante (053):
--     las dos ramas del principio de derivaciones_empresa_update_fn se
--     copian sin cambios.
--   derivar_postulacion (045): no exige pre-entrevista; no hay otra regla de
--     fecha para derivar.
--   registrar_resultado_pre_entrevista (044): 'realizada' o 'no_asistio'
--     siguen pidiendo que la fecha haya pasado. No impide derivar ni
--     seleccionar: solo registra el resultado de la pre-entrevista.
--   bloquear_pre_entrevista (044): sigue devolviendo estado, fecha y lugar;
--     reprogramar lee la modalidad y el link de la fila ya bloqueada.
--   derivaciones_sin_resultado_empresa (037): sigue mirando la fecha de la
--     entrevista (un candidato sin entrevista no entra en el recordatorio).
--   Tipos de aviso: coordinar y reprogramar ya avisaban (aviso y correo)
--     con 'pre_entrevista_coordinada', 'pre_entrevista_reprogramada' y
--     'entrevista'. No hace falta un tipo nuevo: el CHECK de notificaciones
--     (056) y email_tipo_con_envio (056) no cambian.
--
-- Errores (igual que 044 y 053):
--   42501  rol incorrecto ('No autorizado').
--   P0001  el estado o los datos no permiten la acción; el mensaje es para
--          el usuario.
-- ============================================================


-- ============================================================
-- BLOQUE 1 — pre_entrevistas: modalidad y link
--
--   modalidad  'presencial' | 'online'. DEFAULT 'presencial': las filas que
--              existen quedan presenciales (agregar una columna con DEFAULT
--              constante no reescribe la tabla).
--   link       https:// sin espacios; solo en las online (NULL en las
--              presenciales).
--   lugar      obligatorio y no vacío en las presenciales; en las online
--              puede ser NULL (si viene, no vacío).
-- Todas las filas actuales tienen lugar no vacío (CHECK de 044) y link NULL,
-- así que cumplen los CHECK nuevos.
-- El largo del link (500) lo controlan las funciones, como el del lugar.
-- ============================================================

ALTER TABLE public.pre_entrevistas
  ADD COLUMN IF NOT EXISTS modalidad text NOT NULL DEFAULT 'presencial',
  ADD COLUMN IF NOT EXISTS link      text;

ALTER TABLE public.pre_entrevistas ALTER COLUMN lugar DROP NOT NULL;

ALTER TABLE public.pre_entrevistas DROP CONSTRAINT IF EXISTS pre_entrevistas_modalidad_check;
ALTER TABLE public.pre_entrevistas
  ADD CONSTRAINT pre_entrevistas_modalidad_check
  CHECK (modalidad IN ('presencial', 'online'));

ALTER TABLE public.pre_entrevistas DROP CONSTRAINT IF EXISTS pre_entrevistas_lugar_check;
ALTER TABLE public.pre_entrevistas
  ADD CONSTRAINT pre_entrevistas_lugar_check
  CHECK (
    CASE modalidad
      WHEN 'presencial' THEN lugar IS NOT NULL AND pg_catalog.btrim(lugar) <> ''
      ELSE lugar IS NULL OR pg_catalog.btrim(lugar) <> ''
    END
  );

ALTER TABLE public.pre_entrevistas DROP CONSTRAINT IF EXISTS pre_entrevistas_link_check;
ALTER TABLE public.pre_entrevistas
  ADD CONSTRAINT pre_entrevistas_link_check
  CHECK (
    CASE modalidad
      WHEN 'online' THEN link IS NOT NULL AND link ~ '^https://[^[:space:]]+$'
      ELSE link IS NULL
    END
  );


-- ============================================================
-- BLOQUE 2 — derivaciones: modalidad y link de la entrevista
--
--   modalidad_entrevista  'presencial' | 'online', DEFAULT 'presencial'. En
--                         una derivación sin entrevista ('pendiente') no
--                         dice nada: la pantalla solo la muestra con fecha.
--   link_entrevista       https:// sin espacios; solo con modalidad online.
-- Que una entrevista online tenga link es un CHECK (todas las filas actuales
-- son presenciales y sin link). Que una presencial coordinada tenga lugar
-- sigue en el trigger (BLOQUE 6), como desde 029: hay filas viejas
-- contratadas o rechazadas sin lugar que un CHECK rechazaría.
-- La empresa actualiza derivaciones directamente (028): se le dan las dos
-- columnas nuevas en el grant de UPDATE.
-- ============================================================

ALTER TABLE public.derivaciones
  ADD COLUMN IF NOT EXISTS modalidad_entrevista text NOT NULL DEFAULT 'presencial',
  ADD COLUMN IF NOT EXISTS link_entrevista      text;

ALTER TABLE public.derivaciones DROP CONSTRAINT IF EXISTS derivaciones_modalidad_entrevista_check;
ALTER TABLE public.derivaciones
  ADD CONSTRAINT derivaciones_modalidad_entrevista_check
  CHECK (modalidad_entrevista IN ('presencial', 'online'));

ALTER TABLE public.derivaciones DROP CONSTRAINT IF EXISTS derivaciones_link_entrevista_check;
ALTER TABLE public.derivaciones
  ADD CONSTRAINT derivaciones_link_entrevista_check
  CHECK (
    CASE modalidad_entrevista
      WHEN 'online' THEN link_entrevista IS NOT NULL
                         AND link_entrevista ~ '^https://[^[:space:]]+$'
      ELSE link_entrevista IS NULL
    END
  );

GRANT UPDATE (modalidad_entrevista, link_entrevista) ON public.derivaciones TO authenticated;


-- ============================================================
-- BLOQUE 3 — Texto de la entrevista para los avisos
--
--   presencial  " Fecha: 03/11/2026 a las 10:30 hs. Modalidad: presencial.
--               Lugar: <lugar>."
--   online      " Fecha: … Modalidad: online. Lugar: <lugar>. Link: <link>"
--               (el lugar solo si hay). El link va al final y sin punto
--               pegado, para que el correo y la campanita no lo corten.
-- La fecha, en hora de Argentina (notificaciones_fecha, 041). El aviso y el
-- correo usan el mismo texto (emails_pendientes toma la notificación, 048).
-- Sin EXECUTE para los roles del cliente.
-- ============================================================

CREATE OR REPLACE FUNCTION public.detalle_entrevista_aviso(
  p_fecha_hora timestamptz,
  p_modalidad  text,
  p_lugar      text,
  p_link       text
)
RETURNS text
LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT
    ' Fecha: ' || public.notificaciones_fecha(p_fecha_hora, true) || '.'
    || CASE
         WHEN p_modalidad = 'online' THEN
           ' Modalidad: online.'
           || COALESCE(' Lugar: ' || NULLIF(pg_catalog.btrim(p_lugar), '') || '.', '')
           || COALESCE(' Link: ' || NULLIF(pg_catalog.btrim(p_link), ''), '')
         ELSE
           ' Modalidad: presencial.'
           || COALESCE(' Lugar: ' || NULLIF(pg_catalog.btrim(p_lugar), '') || '.', '')
       END;
$$;

REVOKE EXECUTE ON FUNCTION public.detalle_entrevista_aviso(timestamptz, text, text, text)
  FROM public, anon, authenticated;


-- ============================================================
-- BLOQUE 4 — Pre-entrevista
--
-- 4a. pre_entrevistas_transicion_fn: copia de 053. Donde 053 miraba la fecha
--     y el lugar, ahora mira la fecha, la modalidad, el lugar y el link
--     (v_datos_cambian). Mismas reglas: solo se cambian en una coordinada
--     (reprogramar) o al volver de no_asistio a coordinada; una cancelada o
--     una realizada no cambian.
-- ============================================================

CREATE OR REPLACE FUNCTION public.pre_entrevistas_transicion_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  v_datos_cambian boolean :=
       NEW.fecha_hora IS DISTINCT FROM OLD.fecha_hora
    OR NEW.modalidad  IS DISTINCT FROM OLD.modalidad
    OR NEW.lugar      IS DISTINCT FROM OLD.lugar
    OR NEW.link       IS DISTINCT FROM OLD.link;
BEGIN
  IF NEW.postulacion_id IS DISTINCT FROM OLD.postulacion_id THEN
    RAISE EXCEPTION 'No se puede cambiar la postulación de una pre-entrevista.';
  END IF;

  -- ── Cancelada por el retiro de la postulación (migration_053) ──────────────
  IF OLD.estado = 'cancelada' THEN
    IF NEW.estado IS DISTINCT FROM OLD.estado OR v_datos_cambian THEN
      RAISE EXCEPTION 'La pre-entrevista quedó cancelada porque el postulante retiró la postulación.';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.estado = 'cancelada' THEN
    IF OLD.estado IS DISTINCT FROM 'coordinada' THEN
      RAISE EXCEPTION 'Solo se cancela una pre-entrevista coordinada.';
    END IF;
    IF public.rol_actual() IS NOT NULL
       AND pg_catalog.current_setting('ftl.retiro_postulacion', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'Una pre-entrevista se cancela solo cuando el postulante retira la postulación.';
    END IF;
    IF v_datos_cambian THEN
      RAISE EXCEPTION 'Al cancelar una pre-entrevista no se cambian sus datos.';
    END IF;
    RETURN NEW;
  END IF;

  -- ── Resto: igual que 044 ───────────────────────────────────────────────────
  IF NEW.estado = OLD.estado THEN
    IF NEW.estado <> 'coordinada' AND v_datos_cambian THEN
      RAISE EXCEPTION 'Solo se pueden cambiar la fecha, la modalidad, el lugar o el link de una pre-entrevista coordinada.';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.estado = 'realizada' THEN
    RAISE EXCEPTION 'La pre-entrevista ya se realizó y no se puede modificar.';
  END IF;

  IF NOT (
       (OLD.estado = 'coordinada' AND NEW.estado IN ('realizada', 'no_asistio'))
    OR (OLD.estado = 'no_asistio' AND NEW.estado = 'coordinada')
  ) THEN
    RAISE EXCEPTION 'La pre-entrevista no puede pasar de «%» a «%».', OLD.estado, NEW.estado;
  END IF;

  RETURN NEW;
END;
$$;

-- 4b. Firmas nuevas. Las de 044 se borran para que una llamada con los
--     parámetros por nombre (PostgREST) no sea ambigua. Las funciones nuevas
--     agregan p_modalidad y p_link al final, con DEFAULT 'presencial' y NULL:
--     una llamada con los cuatro parámetros de antes sigue funcionando y
--     coordina una presencial.
DROP FUNCTION IF EXISTS public.coordinar_pre_entrevista(uuid, timestamptz, text, text);
DROP FUNCTION IF EXISTS public.reprogramar_pre_entrevista(uuid, timestamptz, text, text);
DROP FUNCTION IF EXISTS public.validar_datos_pre_entrevista(timestamptz, text, text);

-- 4c. Validaciones comunes de coordinar y reprogramar (044 con la modalidad).
--     Largos iguales a LARGO_MAXIMO (src/lib/validaciones.ts): lugar y link
--     500, nota 2000. El link: https:// y sin espacios (lo mismo que el CHECK
--     del BLOQUE 1, con un mensaje para el usuario).
--     Sin EXECUTE para los roles del cliente.
CREATE OR REPLACE FUNCTION public.validar_datos_pre_entrevista(
  p_fecha_hora timestamptz,
  p_modalidad  text,
  p_lugar      text,
  p_link       text,
  p_nota       text
)
RETURNS void
LANGUAGE plpgsql STABLE SET search_path = ''
AS $$
BEGIN
  IF p_fecha_hora IS NULL THEN
    RAISE EXCEPTION 'Indicá la fecha y la hora de la pre-entrevista.';
  END IF;
  IF p_fecha_hora <= now() THEN
    RAISE EXCEPTION 'La fecha de la pre-entrevista tiene que ser posterior al momento actual.';
  END IF;

  IF p_modalidad IS NULL OR p_modalidad NOT IN ('presencial', 'online') THEN
    RAISE EXCEPTION 'Elegí si la pre-entrevista es presencial u online.';
  END IF;

  IF p_modalidad = 'presencial' AND NULLIF(pg_catalog.btrim(p_lugar), '') IS NULL THEN
    RAISE EXCEPTION 'Indicá el lugar de la pre-entrevista.';
  END IF;
  IF pg_catalog.length(pg_catalog.btrim(COALESCE(p_lugar, ''))) > 500 THEN
    RAISE EXCEPTION 'El lugar puede tener hasta 500 caracteres.';
  END IF;

  IF p_modalidad = 'online' THEN
    IF NULLIF(pg_catalog.btrim(p_link), '') IS NULL THEN
      RAISE EXCEPTION 'Indicá el link de la reunión.';
    END IF;
    IF pg_catalog.btrim(p_link) !~ '^https://[^[:space:]]+$' THEN
      RAISE EXCEPTION 'El link tiene que empezar con https:// y no puede tener espacios.';
    END IF;
    IF pg_catalog.length(pg_catalog.btrim(p_link)) > 500 THEN
      RAISE EXCEPTION 'El link puede tener hasta 500 caracteres.';
    END IF;
  END IF;

  IF pg_catalog.length(pg_catalog.btrim(COALESCE(p_nota, ''))) > 2000 THEN
    RAISE EXCEPTION 'La nota puede tener hasta 2000 caracteres.';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validar_datos_pre_entrevista(timestamptz, text, text, text, text)
  FROM public, anon, authenticated;

-- 4d. Coordinar (044 con la modalidad). Presencial: guarda el lugar y deja el
--     link en NULL. Online: guarda el link y el lugar solo si viene.
CREATE OR REPLACE FUNCTION public.coordinar_pre_entrevista(
  p_postulacion_id uuid,
  p_fecha_hora     timestamptz,
  p_lugar          text,
  p_nota           text,
  p_modalidad      text DEFAULT 'presencial',
  p_link           text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_usuario_id        uuid := auth.uid();
  v_estado            public.estado_postulacion;
  v_pre_entrevista_id uuid;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  PERFORM public.validar_datos_pre_entrevista(p_fecha_hora, p_modalidad, p_lugar, p_link, p_nota);

  SELECT po.estado
  INTO   v_estado
  FROM   public.postulaciones po
  WHERE  po.id = p_postulacion_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la postulación.';
  END IF;

  IF v_estado NOT IN ('recibida', 'en_revision') THEN
    RAISE EXCEPTION 'Solo se puede coordinar la pre-entrevista de una postulación pendiente (recibida o en revisión).';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.pre_entrevistas pe
    WHERE pe.postulacion_id = p_postulacion_id
  ) THEN
    RAISE EXCEPTION 'Esta postulación ya tiene una pre-entrevista. Si necesitás cambiar sus datos, reprogramala.';
  END IF;

  INSERT INTO public.pre_entrevistas (
    postulacion_id, fecha_hora, modalidad, lugar, link, estado, nota_oficina, coordinada_por
  )
  VALUES (
    p_postulacion_id,
    p_fecha_hora,
    p_modalidad,
    NULLIF(pg_catalog.btrim(p_lugar), ''),
    CASE WHEN p_modalidad = 'online' THEN pg_catalog.btrim(p_link) END,
    'coordinada',
    NULLIF(pg_catalog.btrim(p_nota), ''),
    v_usuario_id
  )
  RETURNING id INTO v_pre_entrevista_id;

  IF v_estado = 'recibida' THEN
    UPDATE public.postulaciones po
    SET    estado       = 'en_revision',
           revisado_por = v_usuario_id,
           updated_at   = now()
    WHERE  po.id = p_postulacion_id;
  END IF;

  RETURN v_pre_entrevista_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.coordinar_pre_entrevista(uuid, timestamptz, text, text, text, text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.coordinar_pre_entrevista(uuid, timestamptz, text, text, text, text) TO authenticated;

-- 4e. Reprogramar (044 con la modalidad): una coordinada con otros datos, o
--     una no_asistio que vuelve a 'coordinada'. Una coordinada sin ningún
--     cambio de fecha, modalidad, lugar ni link se rechaza, como en 044.
CREATE OR REPLACE FUNCTION public.reprogramar_pre_entrevista(
  p_pre_entrevista_id uuid,
  p_fecha_hora        timestamptz,
  p_lugar             text,
  p_nota              text,
  p_modalidad         text DEFAULT 'presencial',
  p_link              text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_actual    record;
  v_modalidad text;
  v_lugar     text;
  v_link      text;
  v_nuevo_lugar text := NULLIF(pg_catalog.btrim(p_lugar), '');
  v_nuevo_link  text := CASE WHEN p_modalidad = 'online' THEN pg_catalog.btrim(p_link) END;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  PERFORM public.validar_datos_pre_entrevista(p_fecha_hora, p_modalidad, p_lugar, p_link, p_nota);

  SELECT b.o_estado, b.o_fecha_hora, b.o_lugar
  INTO   v_actual
  FROM   public.bloquear_pre_entrevista(p_pre_entrevista_id) b;

  IF v_actual.o_estado = 'realizada' THEN
    RAISE EXCEPTION 'La pre-entrevista ya se realizó y no se puede reprogramar.';
  END IF;
  IF v_actual.o_estado = 'cancelada' THEN
    RAISE EXCEPTION 'La pre-entrevista quedó cancelada porque el postulante retiró la postulación.';
  END IF;

  -- La fila ya está bloqueada por bloquear_pre_entrevista.
  SELECT pe.modalidad, pe.lugar, pe.link
  INTO   v_modalidad, v_lugar, v_link
  FROM   public.pre_entrevistas pe
  WHERE  pe.id = p_pre_entrevista_id;

  IF v_actual.o_estado = 'coordinada'
     AND v_actual.o_fecha_hora = p_fecha_hora
     AND v_modalidad = p_modalidad
     AND v_lugar IS NOT DISTINCT FROM v_nuevo_lugar
     AND v_link  IS NOT DISTINCT FROM v_nuevo_link THEN
    RAISE EXCEPTION 'Para reprogramar, cambiá la fecha, la hora, la modalidad, el lugar o el link.';
  END IF;

  UPDATE public.pre_entrevistas pe
  SET    estado         = 'coordinada',
         fecha_hora     = p_fecha_hora,
         modalidad      = p_modalidad,
         lugar          = v_nuevo_lugar,
         link           = v_nuevo_link,
         nota_oficina   = NULLIF(pg_catalog.btrim(p_nota), ''),
         coordinada_por = auth.uid(),
         updated_at     = now()
  WHERE  pe.id = p_pre_entrevista_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reprogramar_pre_entrevista(uuid, timestamptz, text, text, text, text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.reprogramar_pre_entrevista(uuid, timestamptz, text, text, text, text) TO authenticated;

-- 4f. Lo que ve el postulante (044) con la modalidad y el link. Sigue sin la
--     nota interna ni quién la coordinó. Cambia el tipo de retorno: se borra
--     y se vuelve a crear con los mismos permisos.
DROP FUNCTION IF EXISTS public.mis_pre_entrevistas(uuid[]);

CREATE FUNCTION public.mis_pre_entrevistas(p_postulacion_ids uuid[])
RETURNS TABLE (
  postulacion_id uuid,
  estado         text,
  fecha_hora     timestamptz,
  modalidad      text,
  lugar          text,
  link           text
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT
    pe.postulacion_id,
    pe.estado,
    pe.fecha_hora,
    pe.modalidad,
    pe.lugar,
    pe.link
  FROM public.pre_entrevistas pe
  JOIN public.postulaciones po ON po.id = pe.postulacion_id
  JOIN public.postulantes pt   ON pt.id = po.postulante_id
  WHERE pe.postulacion_id = ANY (p_postulacion_ids)
    AND pt.usuario_id     = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mis_pre_entrevistas(uuid[]) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.mis_pre_entrevistas(uuid[]) TO authenticated;


-- ============================================================
-- BLOQUE 5 — Aviso de la pre-entrevista
-- pre_entrevistas_notificar_fn: copia de 044; el detalle sale de
-- detalle_entrevista_aviso (BLOQUE 3). Mismos tipos, títulos, link y claves.
-- El trigger de reprogramación también dispara si cambian la modalidad o el
-- link (antes, solo la fecha o el lugar).
-- ============================================================

CREATE OR REPLACE FUNCTION public.pre_entrevistas_notificar_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_oferta             text;
  v_empresa            text;
  v_postulante_usuario uuid;
  v_detalle            text;
BEGIN
  BEGIN
    SELECT
      o.titulo,
      NULLIF(pg_catalog.btrim(o.empresa_nombre), ''),
      pt.usuario_id
    INTO v_oferta, v_empresa, v_postulante_usuario
    FROM public.postulaciones po
    JOIN public.ofertas o      ON o.id  = po.oferta_id
    JOIN public.postulantes pt ON pt.id = po.postulante_id
    WHERE po.id = NEW.postulacion_id;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    v_detalle := public.detalle_entrevista_aviso(NEW.fecha_hora, NEW.modalidad, NEW.lugar, NEW.link);

    IF TG_OP = 'INSERT' THEN
      PERFORM public.notificar_usuario(
        v_postulante_usuario,
        'pre_entrevista_coordinada',
        'Pre-entrevista coordinada',
        'La Oficina de Empleo coordinó una pre-entrevista con vos por tu postulación a «'
          || v_oferta || '»' || COALESCE(' (' || v_empresa || ')', '') || '.' || v_detalle,
        '/mis-postulaciones',
        'pre_entrevista_coordinada:' || NEW.id::text
      );
    ELSE
      PERFORM public.notificar_usuario(
        v_postulante_usuario,
        'pre_entrevista_reprogramada',
        'Pre-entrevista reprogramada',
        'La Oficina de Empleo reprogramó tu pre-entrevista por tu postulación a «'
          || v_oferta || '»' || COALESCE(' (' || v_empresa || ')', '') || '.' || v_detalle,
        '/mis-postulaciones',
        'pre_entrevista_reprogramada:' || NEW.id::text
          || ':' || public.notificaciones_marca(COALESCE(NEW.updated_at, now()))
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'pre_entrevistas_notificar_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS pre_entrevistas_notificar_alta ON public.pre_entrevistas;
CREATE TRIGGER pre_entrevistas_notificar_alta
  AFTER INSERT ON public.pre_entrevistas
  FOR EACH ROW
  WHEN (NEW.estado = 'coordinada')
  EXECUTE FUNCTION public.pre_entrevistas_notificar_fn();

DROP TRIGGER IF EXISTS pre_entrevistas_notificar_reprogramacion ON public.pre_entrevistas;
CREATE TRIGGER pre_entrevistas_notificar_reprogramacion
  AFTER UPDATE ON public.pre_entrevistas
  FOR EACH ROW
  WHEN (NEW.estado = 'coordinada'
        AND (OLD.estado IS DISTINCT FROM 'coordinada'
             OR NEW.fecha_hora IS DISTINCT FROM OLD.fecha_hora
             OR NEW.modalidad  IS DISTINCT FROM OLD.modalidad
             OR NEW.lugar      IS DISTINCT FROM OLD.lugar
             OR NEW.link       IS DISTINCT FROM OLD.link))
  EXECUTE FUNCTION public.pre_entrevistas_notificar_fn();


-- ============================================================
-- BLOQUE 6 — derivaciones_empresa_update_fn (053, misma firma)
--
-- Las ramas de 'retirada_postulante' (053), 'oferta_retirada' (051) y
-- municipalidad, la protección de columnas reservadas, los estados finales,
-- el motivo obligatorio al rechazar y fecha_respuesta: copia de 053.
-- Cambios, solo para la empresa:
--   1. pendiente → contratado vuelve a ser válida (como en 028): la empresa
--      puede seleccionar sin haber coordinado una entrevista.
--   2. Sin la regla "Solo podés seleccionar a un candidato después de que
--      haya pasado la fecha de la entrevista" (029): desde 'en_proceso'
--      también se selecciona antes de la fecha.
--   3. Al coordinar o reprogramar ('en_proceso'): fecha obligatoria;
--      presencial exige el lugar (como 029); online exige un link https://
--      sin espacios y el lugar es opcional.
--   4. La modalidad, el lugar y el link, igual que la fecha, solo cambian
--      con el estado 'en_proceso', y cualquier cambio de los datos de la
--      entrevista exige una fecha futura (antes, solo si cambiaba la fecha).
-- ============================================================

CREATE OR REPLACE FUNCTION public.derivaciones_empresa_update_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_rol            text    := public.rol_actual()::text;
  v_retiro         boolean := pg_catalog.current_setting('ftl.retiro_oferta', true) IS NOT DISTINCT FROM 'on';
  v_retiro_postul  boolean := pg_catalog.current_setting('ftl.retiro_postulacion', true) IS NOT DISTINCT FROM 'on';
  v_datos_cambian  boolean;
BEGIN
  -- ── Cierre porque el postulante se retiró (migration_053) ───────────────────
  IF OLD.estado_empresa::text = 'retirada_postulante' OR NEW.estado_empresa::text = 'retirada_postulante' THEN
    IF NEW.estado_empresa IS DISTINCT FROM OLD.estado_empresa THEN
      IF v_rol IS NOT NULL AND NOT v_retiro_postul THEN
        IF OLD.estado_empresa::text = 'retirada_postulante' THEN
          RAISE EXCEPTION 'El candidato retiró su postulación y el proceso quedó cerrado.';
        END IF;
        RAISE EXCEPTION 'Un proceso se cierra por retiro solo cuando el postulante retira su postulación.';
      END IF;
      IF NEW.estado_empresa::text = 'retirada_postulante' THEN
        IF OLD.estado_empresa::text NOT IN ('pendiente', 'en_proceso') THEN
          RAISE EXCEPTION 'Este proceso ya tiene un estado final y no puede modificarse.';
        END IF;
        NEW.fecha_respuesta := now();
      END IF;
    ELSIF v_rol IS NOT NULL THEN
      RAISE EXCEPTION 'El candidato retiró su postulación y el proceso quedó cerrado.';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- ── Cierre por oferta retirada (migration_051) ──────────────────────────────
  IF OLD.estado_empresa::text = 'oferta_retirada' OR NEW.estado_empresa::text = 'oferta_retirada' THEN
    IF NEW.estado_empresa IS DISTINCT FROM OLD.estado_empresa THEN
      IF v_rol IS NOT NULL AND NOT v_retiro THEN
        IF OLD.estado_empresa::text = 'oferta_retirada' THEN
          RAISE EXCEPTION 'Este proceso quedó cerrado porque la empresa retiró la oferta.';
        END IF;
        RAISE EXCEPTION 'Un proceso se cierra por oferta retirada solo cuando la empresa retira la oferta.';
      END IF;
      IF NEW.estado_empresa::text = 'oferta_retirada' THEN
        IF OLD.estado_empresa IN ('contratado', 'rechazado') THEN
          RAISE EXCEPTION 'Este proceso ya tiene un estado final y no puede modificarse.';
        END IF;
        NEW.fecha_respuesta := now();
      END IF;
    ELSIF v_rol = 'empresa' THEN
      RAISE EXCEPTION 'Este proceso quedó cerrado porque retiraste la oferta.';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- ── Municipalidad: puede corregir cualquier estado ──────────────────────────
  IF v_rol = 'municipalidad' THEN
    IF NEW.estado_empresa IN ('contratado', 'rechazado')
       AND OLD.estado_empresa NOT IN ('contratado', 'rechazado') THEN
      NEW.fecha_respuesta := now();
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- ── Empresa: protección de columnas reservadas ──────────────────────────────
  IF NEW.postulacion_id IS DISTINCT FROM OLD.postulacion_id THEN
    RAISE EXCEPTION 'No podés modificar la postulación de origen.';
  END IF;
  IF NEW.municipalidad_usuario_id IS DISTINCT FROM OLD.municipalidad_usuario_id THEN
    RAISE EXCEPTION 'No podés modificar el agente que realizó la derivación.';
  END IF;
  IF NEW.nota_municipalidad IS DISTINCT FROM OLD.nota_municipalidad THEN
    RAISE EXCEPTION 'No podés modificar la nota de la municipalidad.';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'No podés modificar la fecha de derivación.';
  END IF;
  IF NEW.fecha_respuesta IS DISTINCT FROM OLD.fecha_respuesta THEN
    RAISE EXCEPTION 'La fecha de respuesta la registra el sistema automáticamente.';
  END IF;

  -- ── Empresa: estado final es irreversible ────────────────────────────────────
  IF OLD.estado_empresa IN ('contratado', 'rechazado') THEN
    RAISE EXCEPTION 'Este proceso ya tiene un estado final y no puede modificarse.';
  END IF;

  -- ── Empresa: transiciones válidas (migration_064) ────────────────────────────
  -- pendiente  → en_proceso (coordinar) | contratado | rechazado
  -- en_proceso → en_proceso (reprogramar) | contratado | rechazado
  IF NOT (
    (OLD.estado_empresa = 'pendiente'  AND NEW.estado_empresa IN ('en_proceso', 'contratado', 'rechazado'))
    OR
    (OLD.estado_empresa = 'en_proceso' AND NEW.estado_empresa IN ('en_proceso', 'contratado', 'rechazado'))
  ) THEN
    RAISE EXCEPTION 'Transición de estado no permitida: % → %',
      OLD.estado_empresa::text, NEW.estado_empresa::text;
  END IF;

  -- ── Empresa: datos de la entrevista al coordinar o reprogramar ───────────────
  IF NEW.estado_empresa = 'en_proceso' THEN
    IF NEW.fecha_entrevista IS NULL THEN
      RAISE EXCEPTION 'Debés indicar la fecha y hora de la entrevista para coordinarla.';
    END IF;
    IF NEW.modalidad_entrevista = 'presencial'
       AND (NEW.lugar_entrevista IS NULL OR pg_catalog.btrim(NEW.lugar_entrevista) = '') THEN
      RAISE EXCEPTION 'Debés indicar el lugar de la entrevista.';
    END IF;
    IF NEW.modalidad_entrevista = 'online'
       AND (NEW.link_entrevista IS NULL
            OR NEW.link_entrevista !~ '^https://[^[:space:]]+$') THEN
      RAISE EXCEPTION 'Debés indicar el link de la reunión: tiene que empezar con https:// y no puede tener espacios.';
    END IF;
  END IF;

  -- ── Empresa: los datos de la entrevista solo cambian al coordinar o
  --    reprogramar, y con una fecha futura ─────────────────────────────────────
  v_datos_cambian :=
       NEW.fecha_entrevista     IS DISTINCT FROM OLD.fecha_entrevista
    OR NEW.modalidad_entrevista IS DISTINCT FROM OLD.modalidad_entrevista
    OR NEW.lugar_entrevista     IS DISTINCT FROM OLD.lugar_entrevista
    OR NEW.link_entrevista      IS DISTINCT FROM OLD.link_entrevista;

  IF v_datos_cambian THEN
    IF NEW.estado_empresa != 'en_proceso' THEN
      RAISE EXCEPTION 'Solo podés cambiar los datos de la entrevista al coordinarla o reprogramarla.';
    END IF;
    IF NEW.fecha_entrevista <= now() THEN
      RAISE EXCEPTION 'La fecha y hora de la entrevista debe ser posterior al momento actual.';
    END IF;
  END IF;

  -- ── Empresa: rechazado exige nota_empresa no vacía ───────────────────────────
  IF NEW.estado_empresa = 'rechazado'
     AND (NEW.nota_empresa IS NULL OR TRIM(NEW.nota_empresa) = '') THEN
    RAISE EXCEPTION 'Debés indicar el motivo para no seleccionar al candidato.';
  END IF;

  -- ── Auto-set fecha_respuesta al cerrar el proceso ────────────────────────────
  IF NEW.estado_empresa IN ('contratado', 'rechazado') THEN
    NEW.fecha_respuesta := now();
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


-- ============================================================
-- BLOQUE 7 — Aviso de la entrevista de la empresa
-- derivaciones_notificar_postulante_fn: copia de 051. Cambios:
--   · el detalle sale de detalle_entrevista_aviso (BLOQUE 3);
--   · la rama de la entrevista también dispara si cambian la modalidad o el
--     link;
--   · la clave incluye la modalidad, el lugar y el link (antes, solo el
--     lugar), así cada cambio tiene su aviso.
-- Coordinar ("Entrevista coordinada") y reprogramar ("Entrevista
-- reprogramada") ya avisaban, con correo (tipo 'entrevista'). Seleccionar,
-- no seleccionar y oferta retirada no cambian.
-- ============================================================

CREATE OR REPLACE FUNCTION public.derivaciones_notificar_postulante_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_oferta             text;
  v_empresa            text;
  v_postulante_usuario uuid;
  v_reprogramada       boolean;
BEGIN
  BEGIN
    SELECT
      o.titulo,
      COALESCE(NULLIF(pg_catalog.btrim(o.empresa_nombre), ''), 'La empresa'),
      pt.usuario_id
    INTO v_oferta, v_empresa, v_postulante_usuario
    FROM public.postulaciones po
    JOIN public.ofertas o      ON o.id  = po.oferta_id
    JOIN public.postulantes pt ON pt.id = po.postulante_id
    WHERE po.id = NEW.postulacion_id;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    IF NEW.estado_empresa = 'en_proceso'
       AND NEW.fecha_entrevista IS NOT NULL
       AND (NEW.fecha_entrevista     IS DISTINCT FROM OLD.fecha_entrevista
            OR NEW.modalidad_entrevista IS DISTINCT FROM OLD.modalidad_entrevista
            OR NEW.lugar_entrevista     IS DISTINCT FROM OLD.lugar_entrevista
            OR NEW.link_entrevista      IS DISTINCT FROM OLD.link_entrevista) THEN
      v_reprogramada := OLD.estado_empresa = 'en_proceso' AND OLD.fecha_entrevista IS NOT NULL;

      PERFORM public.notificar_usuario(
        v_postulante_usuario,
        'entrevista',
        CASE WHEN v_reprogramada THEN 'Entrevista reprogramada' ELSE 'Entrevista coordinada' END,
        CASE
          WHEN v_reprogramada THEN
            v_empresa || ' reprogramó tu entrevista para «' || v_oferta || '».'
          ELSE
            v_empresa || ' coordinó una entrevista con vos para «' || v_oferta || '».'
        END
          || public.detalle_entrevista_aviso(
               NEW.fecha_entrevista, NEW.modalidad_entrevista,
               NEW.lugar_entrevista, NEW.link_entrevista
             ),
        '/mis-postulaciones',
        'entrevista:' || NEW.id::text
          || ':' || public.notificaciones_marca(NEW.fecha_entrevista)
          || ':' || pg_catalog.md5(
               NEW.modalidad_entrevista
               || '|' || COALESCE(pg_catalog.btrim(NEW.lugar_entrevista), '')
               || '|' || COALESCE(NEW.link_entrevista, '')
             )
      );
    END IF;

    IF NEW.estado_empresa IS DISTINCT FROM OLD.estado_empresa THEN
      IF NEW.estado_empresa = 'contratado' THEN
        PERFORM public.notificar_usuario(
          v_postulante_usuario,
          'seleccionado',
          '¡Fuiste seleccionado!',
          v_empresa || ' te seleccionó para el puesto «' || v_oferta || '».',
          '/mis-postulaciones',
          'seleccionado:' || NEW.id::text
        );
      ELSIF NEW.estado_empresa = 'rechazado' THEN
        PERFORM public.notificar_usuario(
          v_postulante_usuario,
          'no_seleccionado_empresa',
          'No fuiste seleccionado',
          'Esta vez ' || v_empresa || ' no te seleccionó para «' || v_oferta
            || '». Podés seguir postulándote a otras ofertas del portal.',
          '/mis-postulaciones',
          'no_seleccionado:' || NEW.id::text
        );
      ELSIF NEW.estado_empresa::text = 'oferta_retirada' THEN
        PERFORM public.notificar_usuario(
          v_postulante_usuario,
          'postulacion_cerrada',
          'Postulación cerrada',
          'La empresa retiró la oferta «' || v_oferta || '». Tu postulación quedó cerrada; '
            || 'podés seguir postulándote a otras ofertas.',
          '/mis-postulaciones',
          'postulacion_cerrada:' || NEW.postulacion_id::text
        );
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'derivaciones_notificar_postulante_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS derivaciones_notificar_postulante ON public.derivaciones;
CREATE TRIGGER derivaciones_notificar_postulante
  AFTER UPDATE ON public.derivaciones
  FOR EACH ROW
  WHEN (NEW.estado_empresa       IS DISTINCT FROM OLD.estado_empresa
        OR NEW.fecha_entrevista     IS DISTINCT FROM OLD.fecha_entrevista
        OR NEW.modalidad_entrevista IS DISTINCT FROM OLD.modalidad_entrevista
        OR NEW.lugar_entrevista     IS DISTINCT FROM OLD.lugar_entrevista
        OR NEW.link_entrevista      IS DISTINCT FROM OLD.link_entrevista)
  EXECUTE FUNCTION public.derivaciones_notificar_postulante_fn();


-- ============================================================
-- BLOQUE 8 — Lecturas con la modalidad y el link
-- Copias de 028 con las dos columnas al final. Cambia el tipo de retorno: se
-- borran y se vuelven a crear con los mismos permisos. Mismos filtros
-- (auth.uid()) y nunca las notas de la empresa ni de la oficina al
-- postulante.
-- ============================================================

DROP FUNCTION IF EXISTS public.estado_derivacion_postulante(uuid);

CREATE FUNCTION public.estado_derivacion_postulante(p_postulacion_id uuid)
RETURNS TABLE (
  estado_empresa       public.estado_empresa,
  fecha_entrevista     timestamptz,
  lugar_entrevista     text,
  modalidad_entrevista text,
  link_entrevista      text
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT
    d.estado_empresa,
    d.fecha_entrevista,
    d.lugar_entrevista,
    d.modalidad_entrevista,
    d.link_entrevista
  FROM public.derivaciones d
  JOIN public.postulaciones po ON po.id = d.postulacion_id
  JOIN public.postulantes pt   ON pt.id = po.postulante_id
  WHERE d.postulacion_id = p_postulacion_id
    AND pt.usuario_id    = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.estado_derivacion_postulante(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.estado_derivacion_postulante(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.derivaciones_de_oferta_empresa(uuid);

CREATE FUNCTION public.derivaciones_de_oferta_empresa(p_oferta_id uuid)
RETURNS TABLE (
  derivacion_id         uuid,
  postulante_id         uuid,
  estado_empresa        public.estado_empresa,
  nota_municipalidad    text,
  fecha_entrevista      timestamptz,
  lugar_entrevista      text,
  fecha_respuesta       timestamptz,
  derivacion_created_at timestamptz,
  derivacion_updated_at timestamptz,
  modalidad_entrevista  text,
  link_entrevista       text
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT
    d.id               AS derivacion_id,
    po.postulante_id,
    d.estado_empresa,
    d.nota_municipalidad,
    d.fecha_entrevista,
    d.lugar_entrevista,
    d.fecha_respuesta,
    d.created_at       AS derivacion_created_at,
    d.updated_at       AS derivacion_updated_at,
    d.modalidad_entrevista,
    d.link_entrevista
  FROM public.derivaciones d
  JOIN public.postulaciones po ON po.id = d.postulacion_id
  JOIN public.ofertas o        ON o.id  = po.oferta_id
  JOIN public.empresas e       ON e.id  = o.empresa_id
  WHERE po.oferta_id  = p_oferta_id
    AND e.usuario_id  = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.derivaciones_de_oferta_empresa(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.derivaciones_de_oferta_empresa(uuid) TO authenticated;


-- ============================================================
-- Verificación (opcional, en el SQL Editor)
-- ============================================================
-- Todas las filas existentes quedaron presenciales y sin link:
-- select modalidad, count(*), count(link) from public.pre_entrevistas group by 1;
-- select modalidad_entrevista, count(*), count(link_entrevista)
-- from public.derivaciones group by 1;
--
-- Los CHECK nuevos:
-- select conname, pg_get_constraintdef(oid) from pg_constraint
-- where conname in ('pre_entrevistas_modalidad_check', 'pre_entrevistas_lugar_check',
--   'pre_entrevistas_link_check', 'derivaciones_modalidad_entrevista_check',
--   'derivaciones_link_entrevista_check');
--
-- Texto de un aviso online:
-- select public.detalle_entrevista_aviso(now() + interval '1 day', 'online', null,
--   'https://meet.google.com/abc-defg-hij');
--
-- Que no quedaron las firmas viejas:
-- select oid::regprocedure from pg_proc
-- where proname in ('coordinar_pre_entrevista', 'reprogramar_pre_entrevista',
--   'validar_datos_pre_entrevista');


-- ============================================================
-- ROLLBACK (no se ejecuta; copiar y correr a mano si hace falta)
-- Antes de volver atrás, las filas online tienen que pasar a presenciales con
-- un lugar (el CHECK de 044 exige lugar no vacío):
--   update public.pre_entrevistas set modalidad = 'presencial',
--     lugar = coalesce(lugar, link), link = null where modalidad = 'online';
--   update public.derivaciones set modalidad_entrevista = 'presencial',
--     lugar_entrevista = coalesce(lugar_entrevista, link_entrevista),
--     link_entrevista = null where modalidad_entrevista = 'online';
-- Después:
--   1. DROP de las funciones nuevas con su firma (coordinar/reprogramar de 6
--      parámetros, validar_datos_pre_entrevista de 5, detalle_entrevista_aviso)
--      y DROP de mis_pre_entrevistas, estado_derivacion_postulante y
--      derivaciones_de_oferta_empresa.
--   2. Re-ejecutar de migration_044_pre_entrevistas.sql los BLOQUES 5, 6 y 9
--      (sin el CHECK de notificaciones, que hoy es el de 056), de
--      migration_053_retiro_postulacion.sql el BLOQUE 3 (sin el CHECK de
--      estado) y el BLOQUE 4 (derivaciones_empresa_update_fn), de
--      migration_051 la función derivaciones_notificar_postulante_fn (10d),
--      de migration_041 el trigger derivaciones_notificar_postulante, y de
--      migration_028 las funciones 3d y 3f.
--   3. Quitar las columnas y los CHECK:
--      alter table public.pre_entrevistas drop constraint if exists pre_entrevistas_modalidad_check,
--        drop constraint if exists pre_entrevistas_link_check,
--        drop column if exists modalidad, drop column if exists link;
--      alter table public.pre_entrevistas drop constraint if exists pre_entrevistas_lugar_check;
--      alter table public.pre_entrevistas add constraint pre_entrevistas_lugar_check
--        check (pg_catalog.btrim(lugar) <> '');
--      alter table public.pre_entrevistas alter column lugar set not null;
--      alter table public.derivaciones drop constraint if exists derivaciones_modalidad_entrevista_check,
--        drop constraint if exists derivaciones_link_entrevista_check,
--        drop column if exists modalidad_entrevista, drop column if exists link_entrevista;
