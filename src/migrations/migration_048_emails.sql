-- ============================================================
-- Portal Municipal de Empleo — Migración 048
-- Notificaciones por email (cola de salida / outbox)
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_047_indicadores_portal.sql ya aplicada.
-- Re-ejecutable sin errores. No borra ni modifica datos existentes.
-- Después de aplicarla: npm run db:tipos
-- ============================================================
--
--   BLOQUE 1  Tabla emails_pendientes: la cola. Solo la service role accede.
--   BLOQUE 2  email_tipo_con_envio(): qué tipos de aviso mandan email. Es el
--             único lugar donde se edita la lista.
--   BLOQUE 3  encolar_email(): arma la fila con el email confirmado del
--             usuario (auth.users). Uso interno.
--   BLOQUE 4  Trigger AFTER INSERT ON notificaciones: encola el email de los
--             tipos del BLOQUE 2.
--   BLOQUE 5  Trigger AFTER INSERT ON postulaciones: email de confirmación al
--             postulante ('postulacion_recibida', solo email, sin aviso).
--   BLOQUE 6  reclamar_emails_pendientes(): la aplicación toma un lote para
--             enviar (service role).
--
-- El envío lo hace la aplicación por SMTP (src/lib/emails): después de cada
-- acción con after() y una vez por día con el cron de respaldo
-- (/api/emails/procesar). Ver docs/decisiones/020-notificaciones-por-email.md.
--
-- Reglas comunes (mismas que 041):
--   - Los triggers nunca hacen fallar la inserción del aviso ni la
--     postulación: EXCEPTION WHEN OTHERS + RAISE WARNING.
--   - Solo se encola si el usuario tiene el email confirmado
--     (auth.users.email_confirmed_at). Sin email válido no hay fila.
--   - Un aviso genera como máximo un email (UNIQUE notificacion_id + ON
--     CONFLICT DO NOTHING).
--   - Sin backfill: los avisos y postulaciones anteriores a esta migración no
--     generan emails.
-- ============================================================


-- ============================================================
-- BLOQUE 1 — Tabla emails_pendientes
--
--   notificacion_id  aviso que originó el email. NULL en los emails sin aviso
--                    ('postulacion_recibida'). Si el aviso se borra, el email
--                    queda (ON DELETE SET NULL).
--   usuario_id       destinatario en el portal. Si se borra el usuario, la
--                    fila queda sin vínculo (ON DELETE SET NULL).
--   destinatario     dirección copiada de auth.users al encolar.
--   estado           'pendiente' → 'enviando' → 'enviado' | 'fallido'.
--                    'fallido' se reintenta mientras intentos < 5.
--   intentos         envíos intentados (lo suma reclamar_emails_pendientes).
--   ultimo_error     error del último intento, recortado y sin direcciones.
--   proximo_intento  no se reclama antes de esta fecha (espera entre
--                    reintentos, la fija la aplicación).
--   bloqueado_hasta  mientras está 'enviando', ningún otro proceso la toma
--                    hasta esta fecha. Si el proceso se corta, vuelve a la
--                    cola al vencer.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.emails_pendientes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  notificacion_id uuid        REFERENCES public.notificaciones(id) ON DELETE SET NULL,
  usuario_id      uuid        REFERENCES public.usuarios(id) ON DELETE SET NULL,
  destinatario    text        NOT NULL,
  tipo            text        NOT NULL,
  asunto          text        NOT NULL,
  mensaje         text        NOT NULL,
  link            text,
  estado          text        NOT NULL DEFAULT 'pendiente',
  intentos        int         NOT NULL DEFAULT 0,
  ultimo_error    text,
  proximo_intento timestamptz NOT NULL DEFAULT now(),
  bloqueado_hasta timestamptz,
  enviado_en      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT emails_pendientes_notificacion_unica UNIQUE (notificacion_id),
  CONSTRAINT emails_pendientes_estado_check
    CHECK (estado IN ('pendiente', 'enviando', 'enviado', 'fallido'))
);

-- Lo que recorre reclamar_emails_pendientes(). Los enviados no entran.
CREATE INDEX IF NOT EXISTS emails_pendientes_por_enviar_idx
  ON public.emails_pendientes (proximo_intento)
  WHERE estado IN ('pendiente', 'enviando', 'fallido');

-- Sin políticas: con RLS activado, anon y authenticated no ven ninguna fila.
-- Además se les quitan los permisos. Solo la service role (que ignora RLS)
-- lee y escribe.
ALTER TABLE public.emails_pendientes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.emails_pendientes FROM public, anon, authenticated;
GRANT  ALL ON public.emails_pendientes TO service_role;


-- ============================================================
-- BLOQUE 2 — Tipos de aviso que mandan email
-- Único lugar donde se decide. Para sumar o quitar un tipo, reemplazar esta
-- función con una migración nueva. Cualquier tipo que no esté acá (hoy
-- 'postulacion_nueva', 'necesita_curso', 'curso_completado') queda solo como
-- aviso en el portal.
-- ============================================================

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
    -- Empresa
    'solicitud_aprobada',
    'solicitud_rechazada',
    'oferta_aprobada',
    'oferta_rechazada',
    'candidato_derivado',
    'oferta_por_vencer',
    'oferta_vencida',
    -- Oficina
    'empresa_pendiente',
    'oferta_pendiente',
    'contratacion'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.email_tipo_con_envio(text)
  FROM public, anon, authenticated;


-- ============================================================
-- BLOQUE 3 — Encolar un email
-- El destinatario sale de auth.users, solo con el email confirmado y con
-- forma de dirección. Si no hay, no inserta nada. Sin EXECUTE para los roles
-- del cliente: solo la llaman los triggers de esta migración.
-- ============================================================

CREATE OR REPLACE FUNCTION public.encolar_email(
  p_usuario_id      uuid,
  p_notificacion_id uuid,
  p_tipo            text,
  p_asunto          text,
  p_mensaje         text,
  p_link            text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF p_usuario_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.emails_pendientes
    (notificacion_id, usuario_id, destinatario, tipo, asunto, mensaje, link)
  SELECT
    p_notificacion_id,
    p_usuario_id,
    pg_catalog.btrim(au.email),
    p_tipo,
    p_asunto,
    p_mensaje,
    p_link
  FROM auth.users au
  WHERE au.id = p_usuario_id
    AND au.email_confirmed_at IS NOT NULL
    AND pg_catalog.btrim(au.email) ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ON CONFLICT (notificacion_id) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.encolar_email(uuid, uuid, text, text, text, text)
  FROM public, anon, authenticated;


-- ============================================================
-- BLOQUE 4 — Email por aviso (AFTER INSERT ON notificaciones)
-- Asunto = título del aviso; mensaje y link se copian. No cambia nada de los
-- avisos dentro del portal.
-- ============================================================

CREATE OR REPLACE FUNCTION public.notificaciones_encolar_email_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  BEGIN
    IF NOT public.email_tipo_con_envio(NEW.tipo) THEN
      RETURN NULL;
    END IF;

    PERFORM public.encolar_email(
      NEW.usuario_id,
      NEW.id,
      NEW.tipo,
      NEW.titulo,
      NEW.mensaje,
      NEW.link
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notificaciones_encolar_email_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS notificaciones_encolar_email ON public.notificaciones;
CREATE TRIGGER notificaciones_encolar_email
  AFTER INSERT ON public.notificaciones
  FOR EACH ROW EXECUTE FUNCTION public.notificaciones_encolar_email_fn();


-- ============================================================
-- BLOQUE 5 — Confirmación de postulación (AFTER INSERT ON postulaciones)
--   Postulante  'postulacion_recibida'  solo email, sin aviso en el portal
--               (no está en el CHECK de notificaciones).
-- La postulación la inserta el propio postulante: a diferencia de
-- notificar_usuario(), acá sí se le escribe a quien hizo la acción. Volver a
-- postularse después de retirar la postulación es una fila nueva y manda
-- otro email.
-- ============================================================

CREATE OR REPLACE FUNCTION public.postulaciones_encolar_email_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_usuario_id uuid;
  v_oferta     text;
  v_empresa    text;
BEGIN
  BEGIN
    SELECT
      pt.usuario_id,
      o.titulo,
      NULLIF(pg_catalog.btrim(o.empresa_nombre), '')
    INTO v_usuario_id, v_oferta, v_empresa
    FROM public.ofertas o
    JOIN public.postulantes pt ON pt.id = NEW.postulante_id
    WHERE o.id = NEW.oferta_id;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    PERFORM public.encolar_email(
      v_usuario_id,
      NULL,
      'postulacion_recibida',
      'Recibimos tu postulación a «' || v_oferta || '»',
      'La Oficina de Empleo recibió tu postulación a «' || v_oferta || '»'
        || COALESCE(' de ' || v_empresa, '')
        || '. Te vamos a avisar cuando haya novedades. Podés seguir el estado en Mis postulaciones.',
      '/mis-postulaciones'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'postulaciones_encolar_email_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS postulaciones_encolar_email ON public.postulaciones;
CREATE TRIGGER postulaciones_encolar_email
  AFTER INSERT ON public.postulaciones
  FOR EACH ROW EXECUTE FUNCTION public.postulaciones_encolar_email_fn();


-- ============================================================
-- BLOQUE 6 — Reclamar un lote para enviar (service role)
-- Toma hasta p_limite filas (entre 0 y 100) con proximo_intento vencido que
-- estén:
--   'pendiente'
--   'fallido'  con intentos < 5
--   'enviando' con bloqueado_hasta vencido (el proceso anterior se cortó) e
--              intentos < 5: una fila que corta el proceso cada vez no se
--              reintenta sin fin.
-- FOR UPDATE SKIP LOCKED: dos procesos a la vez (after() y el cron) no toman
-- la misma fila. Las pasa a 'enviando', suma un intento y las bloquea 5
-- minutos. Después la aplicación las marca 'enviado' o 'fallido'.
-- ============================================================

CREATE OR REPLACE FUNCTION public.reclamar_emails_pendientes(p_limite int)
RETURNS TABLE (
  id           uuid,
  destinatario text,
  tipo         text,
  asunto       text,
  mensaje      text,
  link         text,
  intentos     int
)
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  WITH lote AS (
    SELECT ep.id
    FROM public.emails_pendientes ep
    WHERE ep.proximo_intento <= now()
      AND (
           ep.estado = 'pendiente'
        OR (ep.estado = 'fallido' AND ep.intentos < 5)
        OR (ep.estado = 'enviando'
            AND ep.intentos < 5
            AND (ep.bloqueado_hasta IS NULL OR ep.bloqueado_hasta <= now()))
      )
    ORDER BY ep.proximo_intento, ep.created_at
    LIMIT GREATEST(LEAST(COALESCE(p_limite, 0), 100), 0)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.emails_pendientes ep
  SET estado          = 'enviando',
      intentos        = ep.intentos + 1,
      bloqueado_hasta = now() + interval '5 minutes'
  FROM lote
  WHERE ep.id = lote.id
  RETURNING ep.id, ep.destinatario, ep.tipo, ep.asunto, ep.mensaje, ep.link, ep.intentos;
$$;

REVOKE EXECUTE ON FUNCTION public.reclamar_emails_pendientes(int)
  FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.reclamar_emails_pendientes(int) TO service_role;


-- ============================================================
-- ROLLBACK (no se ejecuta; copiar y correr a mano si hace falta)
-- Borra la cola con los emails que tenga. Los avisos del portal no cambian.
--
-- DROP TRIGGER IF EXISTS notificaciones_encolar_email ON public.notificaciones;
-- DROP TRIGGER IF EXISTS postulaciones_encolar_email ON public.postulaciones;
-- DROP FUNCTION IF EXISTS public.notificaciones_encolar_email_fn();
-- DROP FUNCTION IF EXISTS public.postulaciones_encolar_email_fn();
-- DROP FUNCTION IF EXISTS public.reclamar_emails_pendientes(int);
-- DROP FUNCTION IF EXISTS public.encolar_email(uuid, uuid, text, text, text, text);
-- DROP FUNCTION IF EXISTS public.email_tipo_con_envio(text);
-- DROP TABLE IF EXISTS public.emails_pendientes;
-- ============================================================
