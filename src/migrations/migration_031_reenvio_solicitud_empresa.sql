-- ============================================================
-- Portal Municipal de Empleo — Migración 031
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_030_cursos_insercion.sql ya aplicada.
-- ============================================================
-- Implementa el flujo de reenvío de solicitud de empresa rechazada:
--   - Extiende el grant UPDATE en empresas para incluir la columna cuit.
--   - Reemplaza prevent_empresa_estado_change_fn con lógica ampliada:
--       · Sigue bloqueando cambios en columnas de aprobación.
--       · Bloquea edición mientras la solicitud está pendiente.
--       · Bloquea cambio de CUIT cuando la solicitud no está rechazada.
--       · Resetea estado a 'pendiente' cuando la empresa rechazada corrige
--         sus datos (mismo patrón que migration_027 para ofertas).
--   - Tabla historial_aprobacion_empresa: registra cada aprobación,
--     rechazo y reenvío con fecha y responsable.
--   - Trigger AFTER UPDATE en empresas para llenar el historial
--     automáticamente cuando cambia estado_aprobacion.
--   - RLS del historial: municipalidad lee todo; empresa solo el suyo.
--   - Seed de decisiones previas para que no arranque vacío.
-- ============================================================


-- ============================================================
-- BLOQUE 1 — Grant UPDATE para incluir la columna cuit
--
-- La migration_018 dejó el grant sin cuit. Lo agregamos ahora para
-- que la empresa pueda corregirlo cuando su solicitud está rechazada.
-- El trigger de la 011 (reemplazado abajo) bloquea el cambio de CUIT
-- en cualquier otro estado.
-- ============================================================
REVOKE UPDATE ON public.empresas FROM authenticated;
GRANT UPDATE (razon_social, cuit, descripcion, rubro,
              estado_aprobacion, fecha_decision, motivo_rechazo)
  ON public.empresas TO authenticated;


-- ============================================================
-- BLOQUE 2 — Función del trigger prevent_empresa_estado_change
--
-- CREATE OR REPLACE reemplaza la versión de la migration_011.
-- El trigger prevent_empresa_estado_change que ya existe en la tabla
-- sigue apuntando a esta función; no se necesita DROP/CREATE TRIGGER.
--
-- Lógica para roles distintos de municipalidad/service_role:
--   1. Si se intentan cambiar columnas de aprobación → error.
--   2. Si la solicitud está pendiente → no se puede editar nada.
--   3. Si cambia el CUIT y la solicitud no está rechazada → error.
--   4. Si la solicitud está rechazada y cambia algún dato de contenido
--      → resetear estado_aprobacion / fecha_decision / motivo_rechazo
--      (el trigger hace el reset en NEW; la empresa no toca esas columnas).
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_empresa_estado_change_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- service_role (auth.uid() es NULL) y municipalidad: sin restricciones.
  IF auth.uid() IS NULL
     OR public.rol_actual()::text = 'municipalidad'
  THEN
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


-- ============================================================
-- BLOQUE 3 — Tabla historial_aprobacion_empresa
-- ============================================================
CREATE TABLE IF NOT EXISTS public.historial_aprobacion_empresa (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  uuid        NOT NULL
                REFERENCES public.empresas(id) ON DELETE CASCADE,
  evento      text        NOT NULL
                CHECK (evento IN ('aprobada', 'rechazada', 'reenviada')),
  motivo      text,
  usuario_id  uuid
                REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- BLOQUE 4 — RLS del historial
-- ============================================================
ALTER TABLE public.historial_aprobacion_empresa ENABLE ROW LEVEL SECURITY;

-- Municipalidad: acceso de lectura total.
DROP POLICY IF EXISTS "historial_empresa: municipalidad lee todo" ON public.historial_aprobacion_empresa;
CREATE POLICY "historial_empresa: municipalidad lee todo"
  ON public.historial_aprobacion_empresa
  FOR SELECT
  USING (public.rol_actual() = 'municipalidad');

-- Empresa: solo puede leer el historial de su propia empresa.
DROP POLICY IF EXISTS "historial_empresa: empresa lee el suyo" ON public.historial_aprobacion_empresa;
CREATE POLICY "historial_empresa: empresa lee el suyo"
  ON public.historial_aprobacion_empresa
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.empresas e
      WHERE e.id = empresa_id
        AND e.usuario_id = auth.uid()
    )
  );

-- No se crean políticas de INSERT / UPDATE / DELETE para clientes:
-- con RLS habilitado y sin policy, la operación queda bloqueada.


-- ============================================================
-- BLOQUE 5 — Trigger AFTER UPDATE en empresas → llena el historial
--
-- Registra un evento cada vez que cambia estado_aprobacion:
--   pendiente → aprobada  : 'aprobada'
--   pendiente → rechazada : 'rechazada' (con motivo)
--   rechazada → pendiente : 'reenviada' (el trigger BEFORE ya hizo el reset)
--
-- SECURITY DEFINER permite el INSERT sin política de escritura activa.
-- auth.uid() sigue leyendo del JWT de la sesión llamante incluso con
-- SECURITY DEFINER, de modo que usuario_id queda bien registrado.
-- ============================================================
CREATE OR REPLACE FUNCTION public.registrar_historial_empresa_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- No actúa si estado_aprobacion no cambió.
  IF NEW.estado_aprobacion IS NOT DISTINCT FROM OLD.estado_aprobacion THEN
    RETURN NEW;
  END IF;

  IF NEW.estado_aprobacion = 'aprobada' THEN
    INSERT INTO public.historial_aprobacion_empresa
      (empresa_id, evento, motivo, usuario_id)
    VALUES (NEW.id, 'aprobada', NULL, auth.uid());

  ELSIF NEW.estado_aprobacion = 'rechazada' THEN
    INSERT INTO public.historial_aprobacion_empresa
      (empresa_id, evento, motivo, usuario_id)
    VALUES (NEW.id, 'rechazada', NEW.motivo_rechazo, auth.uid());

  ELSIF NEW.estado_aprobacion = 'pendiente'
    AND OLD.estado_aprobacion = 'rechazada'
  THEN
    -- La empresa reenvia su solicitud corregida.
    INSERT INTO public.historial_aprobacion_empresa
      (empresa_id, evento, motivo, usuario_id)
    VALUES (NEW.id, 'reenviada', NULL, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS registrar_historial_empresa ON public.empresas;
CREATE TRIGGER registrar_historial_empresa
  AFTER UPDATE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_historial_empresa_fn();


-- ============================================================
-- BLOQUE 6 — Seed: cargar decisiones existentes en el historial
--
-- Solo empresas aprobadas o rechazadas con fecha_decision registrada.
-- usuario_id queda NULL porque no tenemos quién lo hizo antes.
-- ============================================================
INSERT INTO public.historial_aprobacion_empresa
  (empresa_id, evento, motivo, usuario_id, created_at)
SELECT
  e.id,
  e.estado_aprobacion                                                  AS evento,
  CASE WHEN e.estado_aprobacion = 'rechazada' THEN e.motivo_rechazo
       ELSE NULL
  END                                                                  AS motivo,
  NULL                                                                 AS usuario_id,
  e.fecha_decision                                                     AS created_at
FROM public.empresas e
WHERE e.estado_aprobacion IN ('aprobada', 'rechazada')
  AND e.fecha_decision IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.historial_aprobacion_empresa h
    WHERE h.empresa_id = e.id
  );
