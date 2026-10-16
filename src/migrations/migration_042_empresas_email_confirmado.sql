-- ============================================================
-- Portal Municipal de Empleo — Migración 042
-- La revisión de empresas espera a que confirmen su email
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_041_notificaciones_por_rol.sql ya aplicada.
-- Re-ejecutable sin errores. No borra ni modifica datos existentes.
-- ============================================================
--
-- registrarEmpresa inserta la fila de empresas justo después de signUp,
-- antes de que la empresa confirme su email. Hasta ahora la oficina recibía
-- el aviso de empresa nueva y podía aprobarla o rechazarla en ese momento.
--
--   BLOQUE 1  El aviso de alta (041) solo sale si el email ya está
--             confirmado al insertar la empresa (confirmación desactivada).
--   BLOQUE 2  Trigger AFTER UPDATE sobre auth.users: cuando se confirma el
--             email, avisa a la oficina si el usuario tiene una empresa
--             pendiente. Misma clave empresa_registrada:<empresa_id>, así
--             que el aviso nunca se duplica.
--   BLOQUE 3  empresas_email_sin_confirmar(): ids de las empresas
--             pendientes cuyo usuario no confirmó el email (solo oficina).
--   BLOQUE 4  prevent_empresa_estado_change_fn: la oficina no puede aprobar
--             ni rechazar una empresa sin email confirmado (P0001). Sin rol
--             (SQL Editor, service role) sigue sin restricciones.
--
-- Sin backfill: las empresas registradas antes de esta migración no generan
-- avisos nuevos. Ver docs/decisiones/014-notificaciones.md.
-- ============================================================


-- ============================================================
-- BLOQUE 1 — Aviso de alta solo con el email confirmado
-- El trigger empresas_notificar_alta (041) sigue apuntando a esta función.
-- ============================================================

CREATE OR REPLACE FUNCTION public.empresas_notificar_alta_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  BEGIN
    -- Con la confirmación de email activada el usuario todavía no la
    -- confirmó: el aviso lo manda auth_users_notificar_email_confirmado.
    IF EXISTS (
      SELECT 1
      FROM auth.users au
      WHERE au.id = NEW.usuario_id
        AND au.email_confirmed_at IS NOT NULL
    ) THEN
      PERFORM public.notificar_oficina(
        'empresa_pendiente',
        'Nueva empresa para revisar',
        NEW.razon_social || ' se registró en el portal y su solicitud espera revisión.',
        '/admin/empresas?estado=pendiente',
        'empresa_registrada:' || NEW.id::text
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'empresas_notificar_alta_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;


-- ============================================================
-- BLOQUE 2 — Aviso al confirmar el email
-- Mismo patrón que on_auth_user_created (migration_006). El WHEN deja
-- afuera cualquier otro UPDATE de auth.users (inicios de sesión, refresh de
-- tokens, cambios de metadata). Para quien no es empresa la función hace
-- una sola búsqueda por empresas.usuario_id (UNIQUE) y no encuentra nada.
-- Cualquier error se atrapa: confirmar el email o iniciar sesión nunca
-- falla por este aviso.
-- ============================================================

CREATE OR REPLACE FUNCTION public.auth_users_notificar_email_confirmado_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_empresa_id   uuid;
  v_razon_social text;
BEGIN
  BEGIN
    SELECT e.id, e.razon_social
    INTO v_empresa_id, v_razon_social
    FROM public.empresas e
    WHERE e.usuario_id = NEW.id
      AND e.estado_aprobacion = 'pendiente';

    IF v_empresa_id IS NOT NULL THEN
      PERFORM public.notificar_oficina(
        'empresa_pendiente',
        'Nueva empresa para revisar',
        v_razon_social || ' se registró en el portal y su solicitud espera revisión.',
        '/admin/empresas?estado=pendiente',
        'empresa_registrada:' || v_empresa_id::text
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'auth_users_notificar_email_confirmado_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auth_users_notificar_email_confirmado_fn()
  FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.auth_users_notificar_email_confirmado_fn()
  TO supabase_auth_admin;

DROP TRIGGER IF EXISTS auth_users_notificar_email_confirmado ON auth.users;
CREATE TRIGGER auth_users_notificar_email_confirmado
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.auth_users_notificar_email_confirmado_fn();


-- ============================================================
-- BLOQUE 3 — Empresas pendientes con el email sin confirmar
-- La aplicación no puede leer auth.users. Mismo patrón que
-- emails_de_usuarios (migration_018): SECURITY DEFINER y vacía para
-- cualquier rol que no sea municipalidad.
-- ============================================================

CREATE OR REPLACE FUNCTION public.empresas_email_sin_confirmar()
RETURNS TABLE (empresa_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT e.id
  FROM public.empresas e
  JOIN auth.users au ON au.id = e.usuario_id
  WHERE e.estado_aprobacion = 'pendiente'
    AND au.email_confirmed_at IS NULL
    AND public.rol_actual()::text = 'municipalidad'
$$;

REVOKE EXECUTE ON FUNCTION public.empresas_email_sin_confirmar() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.empresas_email_sin_confirmar() TO authenticated;


-- ============================================================
-- BLOQUE 4 — Función del trigger prevent_empresa_estado_change
-- Reemplaza la versión de migration_031. Los pasos 1 a 4 para la empresa no
-- cambian; lo nuevo es la validación de municipalidad.
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_empresa_estado_change_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Sin rol (SQL Editor, service_role: auth.uid() es NULL): sin restricciones.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- La oficina decide solo sobre empresas que confirmaron su email.
  IF public.rol_actual()::text = 'municipalidad' THEN
    IF NEW.estado_aprobacion IS DISTINCT FROM OLD.estado_aprobacion
       AND NEW.estado_aprobacion IN ('aprobada', 'rechazada')
       AND EXISTS (
         SELECT 1
         FROM auth.users au
         WHERE au.id = NEW.usuario_id
           AND au.email_confirmed_at IS NULL
       )
    THEN
      RAISE EXCEPTION 'La empresa todavía no confirmó su email.'
        USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
  END IF;

  -- ── Paso 1: columnas de aprobación son exclusivas de municipalidad ──────────
  IF (NEW.estado_aprobacion IS DISTINCT FROM OLD.estado_aprobacion)
  OR (NEW.fecha_decision    IS DISTINCT FROM OLD.fecha_decision)
  OR (NEW.motivo_rechazo    IS DISTINCT FROM OLD.motivo_rechazo)
  THEN
    RAISE EXCEPTION 'No tenés permiso para modificar el estado de aprobación.';
  END IF;

  -- ── Paso 2: bloqueado mientras la solicitud está en revisión ────────────────
  IF OLD.estado_aprobacion = 'pendiente' THEN
    RAISE EXCEPTION 'No podés editar tu solicitud mientras está en revisión.';
  END IF;

  -- ── Paso 3: el CUIT solo se puede corregir con la solicitud rechazada ───────
  IF (NEW.cuit IS DISTINCT FROM OLD.cuit)
     AND OLD.estado_aprobacion IS DISTINCT FROM 'rechazada'
  THEN
    RAISE EXCEPTION 'El CUIT solo puede corregirse cuando la solicitud está rechazada.';
  END IF;

  -- ── Paso 4: si la solicitud está rechazada y cambió algún dato, reenviar ────
  -- La empresa no necesita tocar estado_aprobacion; el trigger lo resetea solo.
  -- Así el paso 1 no se activa en contra del propio trigger.
  IF OLD.estado_aprobacion = 'rechazada'
     AND (
       NEW.razon_social   IS DISTINCT FROM OLD.razon_social
       OR NEW.cuit        IS DISTINCT FROM OLD.cuit
       OR NEW.rubro       IS DISTINCT FROM OLD.rubro
       OR NEW.descripcion IS DISTINCT FROM OLD.descripcion
     )
  THEN
    NEW.estado_aprobacion := 'pendiente';
    NEW.fecha_decision    := NULL;
    NEW.motivo_rechazo    := NULL;
  END IF;

  RETURN NEW;
END;
$$;
