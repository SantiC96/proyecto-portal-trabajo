-- ============================================================
-- Portal Municipal de Empleo — Migración 050
-- Cuentas de la Oficina de Empleo: activar y desactivar
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_049_indicadores_empresa.sql ya aplicada.
-- Re-ejecutable sin errores. No borra ni modifica datos existentes
-- (todas las cuentas quedan activas).
-- Después de aplicarla: npm run db:tipos
-- ============================================================
--
-- Ver docs/decisiones/023-cuentas-de-la-oficina.md.
--
--   BLOQUE 1  usuarios.activo: desactivar una cuenta de la oficina no
--             borra nada; el historial (aprobaciones, cursos, derivaciones,
--             etc.) queda intacto. Solo las cuentas de la oficina pueden
--             estar desactivadas.
--   BLOQUE 2  rol_actual() devuelve NULL para una cuenta desactivada: pierde
--             todas las políticas y funciones de la oficina. Postulantes y
--             empresas siempre están activos, así que no cambia nada para
--             ellos.
--   BLOQUE 3  Trigger en usuarios: siempre queda al menos una cuenta activa
--             de la oficina (desactivar, cambiar el rol o borrar, también
--             cuando se borra el usuario de auth.users) y nadie se
--             desactiva a sí mismo. Vale también desde el SQL Editor.
--   BLOQUE 4  listar_cuentas_oficina(), desactivar_cuenta_oficina() y
--             reactivar_cuenta_oficina(): solo para la oficina activa.
--             email_registrado(): solo para la service role, antes de
--             invitar una cuenta nueva.
--   BLOQUE 5  Una cuenta desactivada no recibe avisos (ni los emails que
--             generan).
--
-- El bloqueo del ingreso (ban en Supabase Auth) y el cierre de la sesión
-- abierta los hace la aplicación (src/app/admin/cuentas/actions.ts y
-- src/lib/auth.ts).
-- ============================================================


-- ============================================================
-- BLOQUE 1 — usuarios.activo
-- ============================================================

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;

-- Solo una cuenta de la oficina puede estar desactivada.
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_activo_solo_oficina;
ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_activo_solo_oficina
  CHECK (activo OR rol = 'municipalidad');

-- activo no se agrega a los permisos por columna de authenticated (018: solo
-- nombre, apellido y telefono): desde el navegador nadie puede cambiarlo.


-- ============================================================
-- BLOQUE 2 — rol_actual() ignora las cuentas desactivadas
--
-- Todas las políticas y funciones de la oficina preguntan
-- rol_actual() = 'municipalidad'. Con NULL, una cuenta desactivada queda
-- igual que un usuario sin rol: no ve ni modifica nada de la oficina.
--
-- Los triggers que tratan rol_actual() IS NULL como "sistema" (040, 044 y
-- 046) solo corren después de que una política dejó pasar la escritura, y
-- esas políticas exigen rol_actual() = 'municipalidad' o ser dueño de un
-- postulante o una empresa: una cuenta desactivada de la oficina no llega.
-- ============================================================

CREATE OR REPLACE FUNCTION public.rol_actual()
RETURNS public.rol_usuario
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT u.rol
  FROM public.usuarios u
  WHERE u.id = auth.uid()
    AND u.activo
$$;


-- ============================================================
-- BLOQUE 3 — Al menos una cuenta activa de la oficina
--
-- BEFORE UPDATE OR DELETE: si la fila es una cuenta activa de la oficina y
-- deja de serlo (se desactiva, cambia de rol o se borra), tiene que quedar
-- otra activa. Borrar el usuario en auth.users borra la fila de usuarios en
-- cascada (019), así que este trigger también lo frena.
--
-- El advisory lock ordena dos desactivaciones simultáneas (A desactiva a B
-- mientras B desactiva a A): la segunda espera a la primera y cuenta con su
-- resultado. En un UPDATE de varias filas, cada fila ve las anteriores ya
-- cambiadas, así que tampoco se puede desactivar a todas de una vez.
--
-- auth.uid() es NULL en el SQL Editor y con la service role: ahí la regla
-- de "uno mismo" no aplica, la del mínimo sí.
-- ============================================================

CREATE OR REPLACE FUNCTION public.usuarios_proteger_oficina_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.activo
     AND NOT NEW.activo
     AND OLD.id = auth.uid() THEN
    RAISE EXCEPTION 'No podés desactivar tu propia cuenta.'
      USING ERRCODE = 'P0001';
  END IF;

  IF OLD.rol = 'municipalidad'
     AND OLD.activo
     AND (TG_OP = 'DELETE'
          OR NEW.rol IS DISTINCT FROM 'municipalidad'
          OR NOT NEW.activo) THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtext('usuarios_proteger_oficina'));

    IF NOT EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.rol = 'municipalidad'
        AND u.activo
        AND u.id <> OLD.id
    ) THEN
      RAISE EXCEPTION 'Tiene que quedar al menos una cuenta activa de la Oficina de Empleo.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.usuarios_proteger_oficina_fn()
  FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS usuarios_proteger_oficina ON public.usuarios;
CREATE TRIGGER usuarios_proteger_oficina
  BEFORE UPDATE OF activo, rol OR DELETE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.usuarios_proteger_oficina_fn();


-- ============================================================
-- BLOQUE 4 — Funciones para la pantalla /admin/cuentas
--
-- rol_actual() ya es NULL para una cuenta desactivada: el control de rol
-- cubre también "quien llama está activo".
-- ============================================================

-- Cuentas de la oficina: activas primero, después por apellido y nombre.
-- ultimo_ingreso es NULL si la persona todavía no aceptó la invitación.
CREATE OR REPLACE FUNCTION public.listar_cuentas_oficina()
RETURNS TABLE (
  id             uuid,
  nombre         text,
  apellido       text,
  email          text,
  activo         boolean,
  creado_en      timestamptz,
  ultimo_ingreso timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.nombre,
    u.apellido,
    au.email::text,
    u.activo,
    u.created_at,
    au.last_sign_in_at
  FROM public.usuarios u
  JOIN auth.users au ON au.id = u.id
  WHERE u.rol = 'municipalidad'
  ORDER BY u.activo DESC, pg_catalog.lower(u.apellido), pg_catalog.lower(u.nombre), u.id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.listar_cuentas_oficina() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.listar_cuentas_oficina() TO authenticated;

-- Devuelve true si la cuenta cambió y false si ya estaba desactivada (un
-- reintento no falla). El mínimo de una cuenta activa lo controla el
-- trigger del BLOQUE 3.
CREATE OR REPLACE FUNCTION public.desactivar_cuenta_oficina(p_usuario_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_rol    public.rol_usuario;
  v_activo boolean;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  IF p_usuario_id = auth.uid() THEN
    RAISE EXCEPTION 'No podés desactivar tu propia cuenta.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT u.rol, u.activo INTO v_rol, v_activo
  FROM public.usuarios u
  WHERE u.id = p_usuario_id
  FOR UPDATE;

  IF NOT FOUND OR v_rol IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'La cuenta no existe o no es de la Oficina de Empleo.'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT v_activo THEN
    RETURN false;
  END IF;

  UPDATE public.usuarios SET activo = false WHERE id = p_usuario_id;
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.desactivar_cuenta_oficina(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.desactivar_cuenta_oficina(uuid) TO authenticated;

-- Devuelve true si la cuenta cambió y false si ya estaba activa.
CREATE OR REPLACE FUNCTION public.reactivar_cuenta_oficina(p_usuario_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_rol    public.rol_usuario;
  v_activo boolean;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT u.rol, u.activo INTO v_rol, v_activo
  FROM public.usuarios u
  WHERE u.id = p_usuario_id
  FOR UPDATE;

  IF NOT FOUND OR v_rol IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'La cuenta no existe o no es de la Oficina de Empleo.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_activo THEN
    RETURN false;
  END IF;

  UPDATE public.usuarios SET activo = true WHERE id = p_usuario_id;
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reactivar_cuenta_oficina(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.reactivar_cuenta_oficina(uuid) TO authenticated;

-- Antes de invitar: inviteUserByEmail reutiliza un usuario que existe pero
-- no confirmó su email (un postulante o una empresa a medio registrar) y la
-- invitación lo convertiría en cuenta de la oficina. La acción de invitar
-- (service role) lo consulta primero. No se expone a los usuarios: diría
-- qué emails tienen cuenta.
CREATE OR REPLACE FUNCTION public.email_registrado(p_email text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users au
    WHERE pg_catalog.lower(au.email) = pg_catalog.lower(pg_catalog.btrim(p_email))
  )
$$;

REVOKE EXECUTE ON FUNCTION public.email_registrado(text) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.email_registrado(text) TO service_role;


-- ============================================================
-- BLOQUE 5 — Sin avisos para cuentas desactivadas
--
-- Los avisos a la oficina se reparten a todas las cuentas con rol
-- municipalidad (041). Este trigger descarta en silencio el aviso de una
-- cuenta desactivada: como no se inserta, tampoco se encola su email (048).
-- Nunca hace fallar la inserción.
-- ============================================================

CREATE OR REPLACE FUNCTION public.notificaciones_omitir_inactivos_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.id = NEW.usuario_id
      AND NOT u.activo
  ) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notificaciones_omitir_inactivos_fn()
  FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS notificaciones_omitir_inactivos ON public.notificaciones;
CREATE TRIGGER notificaciones_omitir_inactivos
  BEFORE INSERT ON public.notificaciones
  FOR EACH ROW EXECUTE FUNCTION public.notificaciones_omitir_inactivos_fn();


-- ============================================================
-- Verificación (opcional)
-- ============================================================
-- Cuentas de la oficina y su estado:
-- select u.id, u.nombre, u.apellido, u.activo, au.email
-- from public.usuarios u join auth.users au on au.id = u.id
-- where u.rol = 'municipalidad';
--
-- Tiene que fallar con "Tiene que quedar al menos una cuenta activa…":
-- update public.usuarios set activo = false where rol = 'municipalidad';


-- ============================================================
-- ROLLBACK (no se ejecuta; copiar y correr a mano si hace falta)
-- Las cuentas desactivadas vuelven a tener acceso de oficina en la base.
-- Sacarles el ban en Supabase Auth (Authentication → Users) si corresponde.
--
-- DROP TRIGGER IF EXISTS notificaciones_omitir_inactivos ON public.notificaciones;
-- DROP FUNCTION IF EXISTS public.notificaciones_omitir_inactivos_fn();
-- DROP FUNCTION IF EXISTS public.email_registrado(text);
-- DROP FUNCTION IF EXISTS public.reactivar_cuenta_oficina(uuid);
-- DROP FUNCTION IF EXISTS public.desactivar_cuenta_oficina(uuid);
-- DROP FUNCTION IF EXISTS public.listar_cuentas_oficina();
-- DROP TRIGGER IF EXISTS usuarios_proteger_oficina ON public.usuarios;
-- DROP FUNCTION IF EXISTS public.usuarios_proteger_oficina_fn();
-- CREATE OR REPLACE FUNCTION public.rol_actual()
-- RETURNS public.rol_usuario
-- LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
-- AS $$ select rol from public.usuarios where id = auth.uid() $$;
-- ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_activo_solo_oficina;
-- ALTER TABLE public.usuarios DROP COLUMN IF EXISTS activo;
-- ============================================================
