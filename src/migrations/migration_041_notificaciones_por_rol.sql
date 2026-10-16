-- ============================================================
-- Portal Municipal de Empleo — Migración 041
-- Notificaciones para postulantes, empresas y la oficina
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_040_acciones_atomicas.sql ya aplicada.
-- Re-ejecutable sin errores. No borra ni modifica datos existentes.
-- ============================================================
--
-- Amplía la tabla public.notificaciones (migration_038) con avisos para los
-- tres roles. Ver docs/decisiones/014-notificaciones.md.
--
--   Postulante  postulación derivada, entrevista coordinada o reprogramada,
--               seleccionado / no seleccionado por la empresa, no
--               seleccionado por la oficina, curso asignado.
--   Empresa     solicitud aprobada / rechazada, oferta aprobada /
--               rechazada, candidato derivado, oferta por vencer / vencida
--               (estas dos sin trigger: generar_avisos_vencimiento_empresa).
--   Oficina     empresa registrada o solicitud reenviada, oferta nueva o
--               editada para revisar, curso completado. El aviso de
--               contratación (038) mantiene su comportamiento; el BLOQUE 10
--               solo le agrega el manejo de errores.
--
-- Reglas comunes:
--   - Triggers AFTER: la fila ya pasó todas las validaciones de los BEFORE.
--     Ninguno usa "UPDATE OF <columna>": los cambios de estado que hacen los
--     triggers BEFORE (reset a revisión de 027 y 031) no figuran en el SET
--     del UPDATE y ese tipo de trigger no los vería. Filtran con WHEN.
--   - Cada función atrapa cualquier error (EXCEPTION WHEN OTHERS) y deja un
--     RAISE WARNING: un aviso que falla nunca frena la acción principal.
--   - clave: un mismo hecho genera como máximo un aviso por destinatario
--     (índice único de 038 + ON CONFLICT DO NOTHING). Los hechos que se
--     pueden repetir (reprogramar, volver a aprobar) llevan en la clave la
--     fecha que los distingue.
--   - No se avisa a quien hizo la acción (auth.uid()).
--   - Los mensajes solo usan datos que el destinatario ya ve en su panel:
--     nunca el DNI ni las notas internas (nota_oficina, nota_municipalidad,
--     nota_empresa).
--   - Sin backfill: los hechos anteriores a esta migración no generan avisos.
--   - Retirar una postulación es un DELETE de una postulación 'recibida'
--     (sin derivación): no hay trigger de DELETE y no se avisa a nadie.
-- ============================================================


-- ============================================================
-- BLOQUE 1 — Tipos de aviso
-- Reemplaza el CHECK de 038. Las filas existentes son 'contratacion'.
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
    -- Postulante
    'postulacion_derivada',
    'entrevista',
    'seleccionado',
    'no_seleccionado_empresa',
    'no_seleccionado_oficina',
    'curso_asignado',
    -- Empresa
    'solicitud_aprobada',
    'solicitud_rechazada',
    'oferta_aprobada',
    'oferta_rechazada',
    'candidato_derivado',
    'oferta_por_vencer',
    'oferta_vencida'
  ));


-- ============================================================
-- BLOQUE 2 — Funciones auxiliares
-- Solo las usan los triggers y funciones de esta migración (corren como
-- dueño). Sin EXECUTE para los roles del cliente: nadie puede fabricar
-- avisos para otro usuario.
-- ============================================================

-- Aviso para un usuario. No hace nada si el destinatario es NULL o es quien
-- hizo la acción.
CREATE OR REPLACE FUNCTION public.notificar_usuario(
  p_usuario_id uuid,
  p_tipo       text,
  p_titulo     text,
  p_mensaje    text,
  p_link       text,
  p_clave      text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF p_usuario_id IS NULL OR p_usuario_id IS NOT DISTINCT FROM auth.uid() THEN
    RETURN;
  END IF;

  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, link, clave)
  VALUES (p_usuario_id, p_tipo, p_titulo, p_mensaje, p_link, p_clave)
  ON CONFLICT (usuario_id, clave) WHERE clave IS NOT NULL DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notificar_usuario(uuid, text, text, text, text, text)
  FROM public, anon, authenticated;

-- Aviso para cada usuario de la oficina, salvo quien hizo la acción.
CREATE OR REPLACE FUNCTION public.notificar_oficina(
  p_tipo    text,
  p_titulo  text,
  p_mensaje text,
  p_link    text,
  p_clave   text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, link, clave)
  SELECT us.id, p_tipo, p_titulo, p_mensaje, p_link, p_clave
  FROM public.usuarios us
  WHERE us.rol = 'municipalidad'
    AND us.id IS DISTINCT FROM auth.uid()
  ON CONFLICT (usuario_id, clave) WHERE clave IS NOT NULL DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notificar_oficina(text, text, text, text, text)
  FROM public, anon, authenticated;

-- Marca de tiempo para las claves: milisegundos desde 1970. No depende de la
-- zona horaria de la sesión, así que el mismo hecho da siempre la misma clave.
CREATE OR REPLACE FUNCTION public.notificaciones_marca(p_momento timestamptz)
RETURNS text
LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT pg_catalog.floor(EXTRACT(EPOCH FROM p_momento) * 1000)::bigint::text;
$$;

REVOKE EXECUTE ON FUNCTION public.notificaciones_marca(timestamptz)
  FROM public, anon, authenticated;

-- Fecha (y hora) en la zona horaria de Funes, para el texto de los avisos.
CREATE OR REPLACE FUNCTION public.notificaciones_fecha(
  p_momento   timestamptz,
  p_con_hora  boolean DEFAULT false
)
RETURNS text
LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT pg_catalog.to_char(
    p_momento AT TIME ZONE 'America/Argentina/Buenos_Aires',
    CASE WHEN p_con_hora THEN 'DD/MM/YYYY "a las" HH24:MI "hs"' ELSE 'DD/MM/YYYY' END
  );
$$;

REVOKE EXECUTE ON FUNCTION public.notificaciones_fecha(timestamptz, boolean)
  FROM public, anon, authenticated;


-- ============================================================
-- BLOQUE 3 — Derivación nueva (AFTER INSERT ON derivaciones)
--   Postulante  'postulacion_derivada'  clave derivacion:<derivacion_id>
--   Empresa     'candidato_derivado'    clave derivacion:<derivacion_id>
-- La misma clave sirve para los dos porque el índice único es por usuario.
-- Una oferta cargada por la oficina sin empresa_id no tiene a quién avisar
-- del lado de la empresa.
-- ============================================================

CREATE OR REPLACE FUNCTION public.derivaciones_notificar_alta_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_oferta_id          uuid;
  v_oferta             text;
  v_empresa            text;
  v_empresa_usuario    uuid;
  v_postulante_usuario uuid;
  v_postulante         text;
BEGIN
  BEGIN
    SELECT
      o.id,
      o.titulo,
      COALESCE(NULLIF(pg_catalog.btrim(o.empresa_nombre), ''), 'la empresa'),
      e.usuario_id,
      pt.usuario_id,
      pg_catalog.btrim(u.nombre || ' ' || u.apellido)
    INTO v_oferta_id, v_oferta, v_empresa, v_empresa_usuario, v_postulante_usuario, v_postulante
    FROM public.postulaciones po
    JOIN public.ofertas o       ON o.id  = po.oferta_id
    LEFT JOIN public.empresas e ON e.id  = o.empresa_id
    JOIN public.postulantes pt  ON pt.id = po.postulante_id
    JOIN public.usuarios u      ON u.id  = pt.usuario_id
    WHERE po.id = NEW.postulacion_id;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    PERFORM public.notificar_usuario(
      v_postulante_usuario,
      'postulacion_derivada',
      'Tu postulación fue derivada',
      'La Oficina de Empleo derivó tu postulación a «' || v_oferta || '» a ' || v_empresa
        || '. Te avisamos acá cuando la empresa coordine una entrevista.',
      '/mis-postulaciones',
      'derivacion:' || NEW.id::text
    );

    PERFORM public.notificar_usuario(
      v_empresa_usuario,
      'candidato_derivado',
      'Nuevo candidato derivado',
      'La Oficina de Empleo te derivó a ' || v_postulante || ' para «' || v_oferta || '».',
      '/empresa/ofertas/' || v_oferta_id::text || '/candidatos/' || NEW.id::text,
      'derivacion:' || NEW.id::text
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'derivaciones_notificar_alta_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS derivaciones_notificar_alta ON public.derivaciones;
CREATE TRIGGER derivaciones_notificar_alta
  AFTER INSERT ON public.derivaciones
  FOR EACH ROW EXECUTE FUNCTION public.derivaciones_notificar_alta_fn();


-- ============================================================
-- BLOQUE 4 — Avisos al postulante por cambios en la derivación
-- (AFTER UPDATE ON derivaciones)
--   Entrevista coordinada o reprogramada (estado 'en_proceso' y cambia la
--   fecha o el lugar)    'entrevista'
--                        clave entrevista:<derivacion_id>:<fecha>:<md5 lugar>
--                        Una reprogramación tiene otra fecha u otro lugar y
--                        genera un aviso nuevo.
--   Contratado           'seleccionado'             clave seleccionado:<id>
--   Rechazado            'no_seleccionado_empresa'  clave no_seleccionado:<id>
-- Funciona igual si el cambio lo hace la empresa o lo corrige la oficina.
-- El motivo del rechazo (nota_empresa) no se incluye: el postulante no lo ve.
-- ============================================================

CREATE OR REPLACE FUNCTION public.derivaciones_notificar_postulante_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_oferta             text;
  v_empresa            text;
  v_postulante_usuario uuid;
  v_lugar              text;
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
       AND (NEW.fecha_entrevista IS DISTINCT FROM OLD.fecha_entrevista
            OR NEW.lugar_entrevista IS DISTINCT FROM OLD.lugar_entrevista) THEN
      v_lugar := NULLIF(pg_catalog.btrim(NEW.lugar_entrevista), '');
      v_reprogramada := OLD.estado_empresa = 'en_proceso' AND OLD.fecha_entrevista IS NOT NULL;

      PERFORM public.notificar_usuario(
        v_postulante_usuario,
        'entrevista',
        CASE WHEN v_reprogramada THEN 'Entrevista reprogramada' ELSE 'Entrevista coordinada' END,
        CASE
          WHEN v_reprogramada THEN
            v_empresa || ' reprogramó tu entrevista para «' || v_oferta || '». Nueva fecha: '
          ELSE
            v_empresa || ' coordinó una entrevista con vos para «' || v_oferta || '». Fecha: '
        END
          || public.notificaciones_fecha(NEW.fecha_entrevista, true) || '.'
          || COALESCE(' Lugar: ' || v_lugar || '.', ''),
        '/mis-postulaciones',
        'entrevista:' || NEW.id::text
          || ':' || public.notificaciones_marca(NEW.fecha_entrevista)
          || ':' || pg_catalog.md5(COALESCE(v_lugar, ''))
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
  WHEN (NEW.estado_empresa   IS DISTINCT FROM OLD.estado_empresa
        OR NEW.fecha_entrevista IS DISTINCT FROM OLD.fecha_entrevista
        OR NEW.lugar_entrevista IS DISTINCT FROM OLD.lugar_entrevista)
  EXECUTE FUNCTION public.derivaciones_notificar_postulante_fn();


-- ============================================================
-- BLOQUE 5 — La oficina marca la postulación como no seleccionada
-- (AFTER UPDATE ON postulaciones)
--   'no_seleccionado_oficina'
--   clave postulacion_no_seleccionada:<postulacion_id>:<updated_at>
-- La oficina puede volver a ponerla en revisión y descartarla otra vez;
-- updated_at (lo fija la aplicación al cambiar el estado) distingue cada vez.
-- La nota de la oficina no se incluye.
-- ============================================================

CREATE OR REPLACE FUNCTION public.postulaciones_notificar_no_seleccionada_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_oferta             text;
  v_empresa            text;
  v_postulante_usuario uuid;
BEGIN
  BEGIN
    SELECT
      o.titulo,
      NULLIF(pg_catalog.btrim(o.empresa_nombre), ''),
      pt.usuario_id
    INTO v_oferta, v_empresa, v_postulante_usuario
    FROM public.ofertas o
    JOIN public.postulantes pt ON pt.id = NEW.postulante_id
    WHERE o.id = NEW.oferta_id;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    PERFORM public.notificar_usuario(
      v_postulante_usuario,
      'no_seleccionado_oficina',
      'Postulación no seleccionada',
      'Tu postulación a «' || v_oferta || '»' || COALESCE(' (' || v_empresa || ')', '')
        || ' no fue seleccionada por la Oficina de Empleo. Podés seguir postulándote a otras ofertas del portal.',
      '/mis-postulaciones',
      'postulacion_no_seleccionada:' || NEW.id::text
        || ':' || public.notificaciones_marca(COALESCE(NEW.updated_at, now()))
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'postulaciones_notificar_no_seleccionada_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS postulaciones_notificar_no_seleccionada ON public.postulaciones;
CREATE TRIGGER postulaciones_notificar_no_seleccionada
  AFTER UPDATE ON public.postulaciones
  FOR EACH ROW
  WHEN (NEW.estado = 'rechazada_municipalidad'
        AND OLD.estado IS DISTINCT FROM 'rechazada_municipalidad')
  EXECUTE FUNCTION public.postulaciones_notificar_no_seleccionada_fn();


-- ============================================================
-- BLOQUE 6 — Cursos
--   Asignación nueva (AFTER INSERT ON asignaciones_curso)
--     Postulante  'curso_asignado'    clave curso_asignado:<asignacion_id>
--   Pasa a 'completado' (AFTER UPDATE ON asignaciones_curso)
--     Oficina     'curso_completado'  clave curso_completado:<asignacion_id>
--   Una asignación completada no vuelve atrás (038), así que el segundo
--   aviso ocurre una sola vez.
-- ============================================================

CREATE OR REPLACE FUNCTION public.asignaciones_curso_notificar_alta_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_curso              text;
  v_postulante_usuario uuid;
BEGIN
  BEGIN
    SELECT c.nombre, pt.usuario_id
    INTO v_curso, v_postulante_usuario
    FROM public.cursos c
    JOIN public.postulantes pt ON pt.id = NEW.postulante_id
    WHERE c.id = NEW.curso_id;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    PERFORM public.notificar_usuario(
      v_postulante_usuario,
      'curso_asignado',
      'Te asignaron un curso',
      'La Oficina de Empleo te asignó el curso «' || v_curso || '». Entrá para ver las indicaciones.',
      '/mis-cursos/' || NEW.id::text,
      'curso_asignado:' || NEW.id::text
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'asignaciones_curso_notificar_alta_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS asignaciones_curso_notificar_alta ON public.asignaciones_curso;
CREATE TRIGGER asignaciones_curso_notificar_alta
  AFTER INSERT ON public.asignaciones_curso
  FOR EACH ROW EXECUTE FUNCTION public.asignaciones_curso_notificar_alta_fn();

CREATE OR REPLACE FUNCTION public.asignaciones_curso_notificar_completado_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_curso      text;
  v_postulante text;
BEGIN
  BEGIN
    SELECT c.nombre, pg_catalog.btrim(u.nombre || ' ' || u.apellido)
    INTO v_curso, v_postulante
    FROM public.cursos c
    JOIN public.postulantes pt ON pt.id = NEW.postulante_id
    JOIN public.usuarios u     ON u.id  = pt.usuario_id
    WHERE c.id = NEW.curso_id;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    PERFORM public.notificar_oficina(
      'curso_completado',
      'Curso completado',
      v_postulante || ' completó el curso «' || v_curso || '».',
      '/admin/postulantes/' || NEW.postulante_id::text,
      'curso_completado:' || NEW.id::text
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'asignaciones_curso_notificar_completado_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS asignaciones_curso_notificar_completado ON public.asignaciones_curso;
CREATE TRIGGER asignaciones_curso_notificar_completado
  AFTER UPDATE ON public.asignaciones_curso
  FOR EACH ROW
  WHEN (NEW.estado = 'completado' AND OLD.estado IS DISTINCT FROM 'completado')
  EXECUTE FUNCTION public.asignaciones_curso_notificar_completado_fn();


-- ============================================================
-- BLOQUE 7 — Empresas
--   Alta pendiente (AFTER INSERT ON empresas; la inserta el registro con el
--   service role)
--     Oficina  'empresa_pendiente'  clave empresa_registrada:<empresa_id>
--   Reenvío: rechazada → pendiente (reset del trigger BEFORE de 031)
--     Oficina  'empresa_pendiente'
--              clave empresa_reenviada:<empresa_id>:<fecha del rechazo>
--              Cada reenvío responde a un rechazo distinto.
--   Decisión de la oficina: pasa a aprobada / rechazada
--     Empresa  'solicitud_aprobada' | 'solicitud_rechazada'
--              clave solicitud_aprobada|solicitud_rechazada:<empresa_id>:<fecha_decision>
-- ============================================================

CREATE OR REPLACE FUNCTION public.empresas_notificar_alta_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  BEGIN
    PERFORM public.notificar_oficina(
      'empresa_pendiente',
      'Nueva empresa para revisar',
      NEW.razon_social || ' se registró en el portal y su solicitud espera revisión.',
      '/admin/empresas?estado=pendiente',
      'empresa_registrada:' || NEW.id::text
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'empresas_notificar_alta_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS empresas_notificar_alta ON public.empresas;
CREATE TRIGGER empresas_notificar_alta
  AFTER INSERT ON public.empresas
  FOR EACH ROW
  WHEN (NEW.estado_aprobacion = 'pendiente')
  EXECUTE FUNCTION public.empresas_notificar_alta_fn();

CREATE OR REPLACE FUNCTION public.empresas_notificar_aprobacion_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_motivo text;
BEGIN
  BEGIN
    IF NEW.estado_aprobacion = 'pendiente' AND OLD.estado_aprobacion = 'rechazada' THEN
      PERFORM public.notificar_oficina(
        'empresa_pendiente',
        'Solicitud reenviada',
        NEW.razon_social || ' corrigió sus datos y reenvió la solicitud para revisión.',
        '/admin/empresas?estado=pendiente',
        'empresa_reenviada:' || NEW.id::text
          || ':' || public.notificaciones_marca(COALESCE(OLD.fecha_decision, now()))
      );

    ELSIF NEW.estado_aprobacion = 'aprobada' THEN
      PERFORM public.notificar_usuario(
        NEW.usuario_id,
        'solicitud_aprobada',
        'Tu empresa fue aprobada',
        'La Oficina de Empleo aprobó la solicitud de ' || NEW.razon_social
          || '. Ya podés publicar ofertas laborales.',
        '/empresa',
        'solicitud_aprobada:' || NEW.id::text
          || ':' || public.notificaciones_marca(COALESCE(NEW.fecha_decision, now()))
      );

    ELSIF NEW.estado_aprobacion = 'rechazada' THEN
      v_motivo := NULLIF(pg_catalog.btrim(NEW.motivo_rechazo), '');
      PERFORM public.notificar_usuario(
        NEW.usuario_id,
        'solicitud_rechazada',
        'Tu solicitud fue rechazada',
        'La Oficina de Empleo rechazó la solicitud de ' || NEW.razon_social || '.'
          || COALESCE(' Motivo: ' || v_motivo, '')
          || ' Podés corregir los datos y reenviarla.',
        '/empresa',
        'solicitud_rechazada:' || NEW.id::text
          || ':' || public.notificaciones_marca(COALESCE(NEW.fecha_decision, now()))
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'empresas_notificar_aprobacion_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS empresas_notificar_aprobacion ON public.empresas;
CREATE TRIGGER empresas_notificar_aprobacion
  AFTER UPDATE ON public.empresas
  FOR EACH ROW
  WHEN (NEW.estado_aprobacion IS DISTINCT FROM OLD.estado_aprobacion)
  EXECUTE FUNCTION public.empresas_notificar_aprobacion_fn();


-- ============================================================
-- BLOQUE 8 — Ofertas
--   Alta pendiente de revisión (AFTER INSERT ON ofertas)
--     Oficina  'oferta_pendiente'  clave oferta_nueva:<oferta_id>
--   Vuelve a revisión por una edición (AFTER UPDATE; el reset lo hace el
--   trigger BEFORE de 027)
--     Oficina  'oferta_pendiente'  clave oferta_editada:<oferta_id>:<updated_at>
--   Decisión de la oficina: pendiente_aprobacion → activa / rechazada
--     Empresa  'oferta_aprobada' | 'oferta_rechazada'
--              clave oferta_aprobada|oferta_rechazada:<oferta_id>:<revisado_en>
--   Las ofertas que carga la oficina sin empresa_id no avisan a ninguna
--   empresa.
-- ============================================================

CREATE OR REPLACE FUNCTION public.ofertas_notificar_alta_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  BEGIN
    PERFORM public.notificar_oficina(
      'oferta_pendiente',
      'Nueva oferta para revisar',
      COALESCE(NULLIF(pg_catalog.btrim(NEW.empresa_nombre), ''), 'Una empresa')
        || ' envió la oferta «' || NEW.titulo || '» para revisión.',
      '/admin/ofertas/' || NEW.id::text,
      'oferta_nueva:' || NEW.id::text
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ofertas_notificar_alta_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS ofertas_notificar_alta ON public.ofertas;
CREATE TRIGGER ofertas_notificar_alta
  AFTER INSERT ON public.ofertas
  FOR EACH ROW
  WHEN (NEW.estado = 'pendiente_aprobacion')
  EXECUTE FUNCTION public.ofertas_notificar_alta_fn();

CREATE OR REPLACE FUNCTION public.ofertas_notificar_revision_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_empresa_usuario uuid;
  v_motivo          text;
  v_marca           text;
BEGIN
  BEGIN
    IF NEW.estado = 'pendiente_aprobacion' THEN
      PERFORM public.notificar_oficina(
        'oferta_pendiente',
        'Oferta editada para revisar',
        COALESCE(NULLIF(pg_catalog.btrim(NEW.empresa_nombre), ''), 'Una empresa')
          || ' editó la oferta «' || NEW.titulo || '» y quedó pendiente de revisión.',
        '/admin/ofertas/' || NEW.id::text,
        'oferta_editada:' || NEW.id::text
          || ':' || public.notificaciones_marca(COALESCE(NEW.updated_at, now()))
      );
      RETURN NULL;
    END IF;

    IF OLD.estado IS DISTINCT FROM 'pendiente_aprobacion'
       OR NEW.estado NOT IN ('activa', 'rechazada')
       OR NEW.empresa_id IS NULL THEN
      RETURN NULL;
    END IF;

    SELECT e.usuario_id
    INTO v_empresa_usuario
    FROM public.empresas e
    WHERE e.id = NEW.empresa_id;

    v_marca := public.notificaciones_marca(COALESCE(NEW.revisado_en, now()));

    IF NEW.estado = 'activa' THEN
      PERFORM public.notificar_usuario(
        v_empresa_usuario,
        'oferta_aprobada',
        'Oferta aprobada',
        'La Oficina de Empleo aprobó tu oferta «' || NEW.titulo || '». Ya está publicada en el portal'
          || COALESCE(' hasta el ' || public.notificaciones_fecha(NEW.vence_en), '') || '.',
        '/empresa/ofertas/' || NEW.id::text,
        'oferta_aprobada:' || NEW.id::text || ':' || v_marca
      );
    ELSE
      v_motivo := NULLIF(pg_catalog.btrim(NEW.motivo_rechazo), '');
      PERFORM public.notificar_usuario(
        v_empresa_usuario,
        'oferta_rechazada',
        'Oferta rechazada',
        'La Oficina de Empleo rechazó tu oferta «' || NEW.titulo || '».'
          || COALESCE(' Motivo: ' || v_motivo, '')
          || ' Podés corregirla y enviarla de nuevo.',
        '/empresa/ofertas/' || NEW.id::text,
        'oferta_rechazada:' || NEW.id::text || ':' || v_marca
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ofertas_notificar_revision_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS ofertas_notificar_revision ON public.ofertas;
CREATE TRIGGER ofertas_notificar_revision
  AFTER UPDATE ON public.ofertas
  FOR EACH ROW
  WHEN (NEW.estado IS DISTINCT FROM OLD.estado)
  EXECUTE FUNCTION public.ofertas_notificar_revision_fn();


-- ============================================================
-- BLOQUE 9 — Avisos de vencimiento de ofertas (sin cron)
--
-- generar_avisos_vencimiento_empresa(p_dias_aviso): la aplicación la llama
-- al cargar el panel de la empresa (/empresa) con DIAS_AVISO_VENCIMIENTO
-- (src/lib/ofertas-vencimiento.ts, el mismo valor del aviso del panel).
-- Crea, para las ofertas activas de la empresa del usuario actual, los
-- avisos que falten:
--   vence_en <= now()                         'oferta_vencida'
--                                             clave oferta_vencida:<oferta_id>:<vence_en>
--   now() < vence_en <= now() + p_dias_aviso  'oferta_por_vencer'
--                                             clave oferta_por_vencer:<oferta_id>:<vence_en>
-- Al renovar (036) cambia vence_en, así que la oferta vuelve a avisar en su
-- próximo vencimiento. Si la empresa no entra al panel mientras la oferta
-- está por vencer, solo recibe el aviso de vencida.
-- Devuelve la cantidad de avisos creados.
-- ============================================================

CREATE OR REPLACE FUNCTION public.generar_avisos_vencimiento_empresa(p_dias_aviso int)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_usuario_id uuid := auth.uid();
  v_empresa_id uuid;
  v_filas      int;
  v_creados    int := 0;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'empresa' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  IF p_dias_aviso IS NULL OR p_dias_aviso NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'La cantidad de días de aviso debe estar entre 1 y 60.';
  END IF;

  SELECT e.id
  INTO   v_empresa_id
  FROM   public.empresas e
  WHERE  e.usuario_id = v_usuario_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, link, clave)
  SELECT
    v_usuario_id,
    'oferta_vencida',
    'Oferta vencida',
    'Tu oferta «' || o.titulo || '» venció el ' || public.notificaciones_fecha(o.vence_en)
      || ' y ya no se ve en el portal. Podés renovarla desde el detalle de la oferta.',
    '/empresa/ofertas/' || o.id::text,
    'oferta_vencida:' || o.id::text || ':' || public.notificaciones_marca(o.vence_en)
  FROM public.ofertas o
  WHERE o.empresa_id = v_empresa_id
    AND o.estado     = 'activa'
    AND o.vence_en  IS NOT NULL
    AND o.vence_en  <= now()
  ON CONFLICT (usuario_id, clave) WHERE clave IS NOT NULL DO NOTHING;

  GET DIAGNOSTICS v_filas = ROW_COUNT;
  v_creados := v_creados + v_filas;

  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, link, clave)
  SELECT
    v_usuario_id,
    'oferta_por_vencer',
    'Oferta por vencer',
    'Tu oferta «' || o.titulo || '» vence el ' || public.notificaciones_fecha(o.vence_en)
      || ' (en ' || r.dias::text || CASE WHEN r.dias = 1 THEN ' día' ELSE ' días' END
      || '). Cuando venza vas a poder renovarla desde el detalle de la oferta.',
    '/empresa/ofertas/' || o.id::text,
    'oferta_por_vencer:' || o.id::text || ':' || public.notificaciones_marca(o.vence_en)
  FROM public.ofertas o
  CROSS JOIN LATERAL (
    SELECT pg_catalog.ceil(EXTRACT(EPOCH FROM (o.vence_en - now())) / 86400)::int AS dias
  ) r
  WHERE o.empresa_id = v_empresa_id
    AND o.estado     = 'activa'
    AND o.vence_en   > now()
    AND o.vence_en  <= now() + pg_catalog.make_interval(days => p_dias_aviso)
  ON CONFLICT (usuario_id, clave) WHERE clave IS NOT NULL DO NOTHING;

  GET DIAGNOSTICS v_filas = ROW_COUNT;
  v_creados := v_creados + v_filas;

  RETURN v_creados;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generar_avisos_vencimiento_empresa(int) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.generar_avisos_vencimiento_empresa(int) TO authenticated;


-- ============================================================
-- BLOQUE 10 — Aviso de contratación (reemplazo de migration_038)
-- Mismo comportamiento, textos, link y clave que en 038; solo se envuelve
-- en EXCEPTION WHEN OTHERS para que un error al crear el aviso no frene la
-- contratación. No usa notificar_oficina: esa función excluye a quien hizo
-- la acción, y este aviso siempre llegó a todos los usuarios de la oficina
-- (también a quien corrige la derivación). El trigger
-- derivaciones_notificar_contratacion no cambia.
-- ============================================================

CREATE OR REPLACE FUNCTION public.derivaciones_notificar_contratacion_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_empresa        text;
  v_postulante     text;
  v_oferta         text;
  v_postulacion_id uuid;
BEGIN
  BEGIN
    SELECT
      COALESCE(NULLIF(pg_catalog.btrim(o.empresa_nombre), ''), 'Una empresa'),
      pg_catalog.btrim(u.nombre || ' ' || u.apellido),
      o.titulo,
      po.id
    INTO v_empresa, v_postulante, v_oferta, v_postulacion_id
    FROM public.postulaciones po
    JOIN public.ofertas o        ON o.id  = po.oferta_id
    JOIN public.postulantes pt   ON pt.id = po.postulante_id
    JOIN public.usuarios u       ON u.id  = pt.usuario_id
    WHERE po.id = NEW.postulacion_id;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, link, clave)
    SELECT
      us.id,
      'contratacion',
      'Nueva contratación',
      v_empresa || ' contrató a ' || v_postulante || ' para ' || v_oferta,
      '/admin/postulaciones/' || v_postulacion_id::text,
      'contratacion:' || NEW.id::text
    FROM public.usuarios us
    WHERE us.rol = 'municipalidad'
    ON CONFLICT (usuario_id, clave) WHERE clave IS NOT NULL DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'derivaciones_notificar_contratacion_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;
