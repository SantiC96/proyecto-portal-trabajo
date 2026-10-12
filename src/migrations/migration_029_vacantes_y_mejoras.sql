-- ============================================================
-- Portal Municipal de Empleo — Migración 029
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_028_derivaciones_empresa.sql ya aplicada.
-- ============================================================
-- Mejoras a la gestión de derivaciones por empresa:
--   - Reemplaza trigger derivaciones_empresa_update_fn:
--       · Empresa no puede pasar pendiente → contratado
--       · Seleccionar requiere fecha_entrevista pasada
--       · lugar_entrevista obligatorio al coordinar o reprogramar
--   - Tabla oferta_vacantes: cantidad de personas a contratar
--       (visible solo para empresa dueña y municipalidad)
--   - Trigger AFTER UPDATE en derivaciones para cierre automático
--       de la oferta cuando se completan las vacantes
--   - Función candidato_para_empresa_completo: extiende
--       candidato_para_empresa con foto y rubros de interés
--   - Función derivaciones_de_postulante_empresa: historial del
--       postulante en todas las ofertas de esta empresa
--   - Storage policy: empresa lee avatares de candidatos derivados
-- ============================================================


-- ============================================================
-- BLOQUE 0 — Datos existentes: normalizar lugar_entrevista vacío
-- Antes de agregar la validación obligatoria, se actualiza
-- cualquier fila en en_proceso con lugar vacío para evitar que
-- el nuevo trigger bloquee futuros cambios en esas derivaciones.
-- ============================================================

UPDATE public.derivaciones
SET lugar_entrevista = 'Sin especificar'
WHERE estado_empresa = 'en_proceso'
  AND (lugar_entrevista IS NULL OR TRIM(lugar_entrevista) = '');


-- ============================================================
-- BLOQUE 1 — Trigger BEFORE UPDATE en derivaciones (reemplazo)
-- Cambios respecto a migration_028:
--   1. Empresa: pendiente → contratado ya no es una transición válida.
--   2. Empresa: contratado desde en_proceso requiere fecha_entrevista pasada.
--   3. Empresa: en_proceso exige lugar_entrevista no vacío.
-- ============================================================

CREATE OR REPLACE FUNCTION public.derivaciones_empresa_update_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_rol text := public.rol_actual()::text;
BEGIN
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

  -- ── Empresa: transiciones válidas ────────────────────────────────────────────
  -- pendiente  → en_proceso | rechazado
  -- en_proceso → en_proceso (reprogramar) | contratado | rechazado
  IF NOT (
    (OLD.estado_empresa = 'pendiente'  AND NEW.estado_empresa IN ('en_proceso', 'rechazado'))
    OR
    (OLD.estado_empresa = 'en_proceso' AND NEW.estado_empresa IN ('en_proceso', 'contratado', 'rechazado'))
  ) THEN
    RAISE EXCEPTION 'Transición de estado no permitida: % → %',
      OLD.estado_empresa::text, NEW.estado_empresa::text;
  END IF;

  -- ── Empresa: en_proceso exige fecha_entrevista ───────────────────────────────
  IF NEW.estado_empresa = 'en_proceso' AND NEW.fecha_entrevista IS NULL THEN
    RAISE EXCEPTION 'Debés indicar la fecha y hora de la entrevista para coordinarla.';
  END IF;

  -- ── Empresa: en_proceso exige lugar_entrevista no vacío ──────────────────────
  IF NEW.estado_empresa = 'en_proceso'
     AND (NEW.lugar_entrevista IS NULL OR TRIM(NEW.lugar_entrevista) = '') THEN
    RAISE EXCEPTION 'Debés indicar el lugar o las indicaciones para la entrevista.';
  END IF;

  -- ── Empresa: fecha nueva debe ser futura ─────────────────────────────────────
  IF NEW.fecha_entrevista IS DISTINCT FROM OLD.fecha_entrevista
     AND NEW.fecha_entrevista IS NOT NULL THEN
    IF NEW.fecha_entrevista <= now() THEN
      RAISE EXCEPTION 'La fecha y hora de la entrevista debe ser posterior al momento actual.';
    END IF;
    IF NEW.estado_empresa != 'en_proceso' THEN
      RAISE EXCEPTION 'Solo podés establecer la fecha de entrevista al coordinar o reprogramar.';
    END IF;
  END IF;

  -- ── Empresa: cambio de lugar solo en en_proceso ──────────────────────────────
  IF NEW.lugar_entrevista IS DISTINCT FROM OLD.lugar_entrevista
     AND NEW.estado_empresa != 'en_proceso' THEN
    RAISE EXCEPTION 'Solo podés modificar el lugar de entrevista cuando el estado es "Entrevista coordinada".';
  END IF;

  -- ── Empresa: contratado requiere que la entrevista ya haya pasado ─────────────
  IF NEW.estado_empresa = 'contratado' THEN
    IF NEW.fecha_entrevista IS NULL OR NEW.fecha_entrevista > now() THEN
      RAISE EXCEPTION 'Solo podés seleccionar a un candidato después de que haya pasado la fecha de la entrevista.';
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

-- El trigger ya existe desde migration_028; al reemplazar solo la función,
-- el trigger usa automáticamente la versión actualizada.


-- ============================================================
-- BLOQUE 2 — Tabla oferta_vacantes
-- Almacena la cantidad de personas a contratar por oferta.
-- Separada de ofertas para no exponer el dato a postulantes.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.oferta_vacantes (
  oferta_id  uuid    PRIMARY KEY REFERENCES public.ofertas(id) ON DELETE CASCADE,
  cantidad   int     NOT NULL CHECK (cantidad >= 1),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed: 1 vacante para todas las ofertas existentes que no tengan registro
INSERT INTO public.oferta_vacantes (oferta_id, cantidad)
SELECT id, 1 FROM public.ofertas
ON CONFLICT (oferta_id) DO NOTHING;


-- ============================================================
-- BLOQUE 3 — Helper SECURITY DEFINER para RLS de oferta_vacantes
-- Verifica que la oferta pertenece a la empresa del usuario actual.
-- ============================================================

CREATE OR REPLACE FUNCTION public.empresa_es_duena_de_oferta(p_oferta_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ofertas o
    JOIN public.empresas e ON e.id = o.empresa_id
    WHERE o.id        = p_oferta_id
      AND e.usuario_id = auth.uid()
  )
$$;

REVOKE EXECUTE ON FUNCTION public.empresa_es_duena_de_oferta(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.empresa_es_duena_de_oferta(uuid) TO authenticated;


-- ============================================================
-- BLOQUE 4 — RLS en oferta_vacantes
-- Empresa dueña: SELECT + UPDATE
-- Municipalidad: SELECT
-- Postulantes y visitantes: ningún acceso
-- ============================================================

ALTER TABLE public.oferta_vacantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "oferta_vacantes: ver (empresa propietaria)" ON public.oferta_vacantes;
CREATE POLICY "oferta_vacantes: ver (empresa propietaria)"
  ON public.oferta_vacantes FOR SELECT
  USING (
    public.rol_actual()::text = 'empresa'
    AND public.empresa_es_duena_de_oferta(oferta_id)
  );

DROP POLICY IF EXISTS "oferta_vacantes: ver (municipalidad)" ON public.oferta_vacantes;
CREATE POLICY "oferta_vacantes: ver (municipalidad)"
  ON public.oferta_vacantes FOR SELECT
  USING (public.rol_actual()::text = 'municipalidad');

DROP POLICY IF EXISTS "oferta_vacantes: actualizar (empresa propietaria)" ON public.oferta_vacantes;
CREATE POLICY "oferta_vacantes: actualizar (empresa propietaria)"
  ON public.oferta_vacantes FOR UPDATE
  USING (
    public.rol_actual()::text = 'empresa'
    AND public.empresa_es_duena_de_oferta(oferta_id)
  )
  WITH CHECK (
    public.rol_actual()::text = 'empresa'
    AND public.empresa_es_duena_de_oferta(oferta_id)
  );

DROP POLICY IF EXISTS "oferta_vacantes: insertar (empresa propietaria)" ON public.oferta_vacantes;
CREATE POLICY "oferta_vacantes: insertar (empresa propietaria)"
  ON public.oferta_vacantes FOR INSERT
  WITH CHECK (
    public.rol_actual()::text = 'empresa'
    AND public.empresa_es_duena_de_oferta(oferta_id)
  );

-- Grants por columna: empresa solo puede actualizar cantidad
REVOKE INSERT, UPDATE ON public.oferta_vacantes FROM authenticated;
GRANT  INSERT (oferta_id, cantidad) ON public.oferta_vacantes TO authenticated;
GRANT  UPDATE (cantidad, updated_at) ON public.oferta_vacantes TO authenticated;


-- ============================================================
-- BLOQUE 5 — Función para contar seleccionados de una oferta
-- Usada en el trigger de cierre automático.
-- No expone derivaciones al rol empresa.
-- ============================================================

CREATE OR REPLACE FUNCTION public.contratados_en_oferta(p_oferta_id uuid)
RETURNS int
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT COUNT(*)::int
  FROM public.derivaciones d
  JOIN public.postulaciones po ON po.id = d.postulacion_id
  WHERE po.oferta_id      = p_oferta_id
    AND d.estado_empresa  = 'contratado'
$$;

REVOKE EXECUTE ON FUNCTION public.contratados_en_oferta(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.contratados_en_oferta(uuid) TO authenticated;


-- ============================================================
-- BLOQUE 6 — Trigger AFTER UPDATE en derivaciones: cierre automático
-- Cuando el número de derivaciones en contratado alcanza la cantidad
-- de vacantes, la oferta pasa a cerrada.
-- El SECURITY DEFINER permite ejecutar el UPDATE en ofertas
-- sin depender de las policies del rol que disparó la derivación.
-- ============================================================

CREATE OR REPLACE FUNCTION public.derivaciones_auto_cerrar_oferta_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_oferta_id  uuid;
  v_vacantes   int;
  v_contratados int;
BEGIN
  -- Solo actúa al pasar a contratado
  IF NEW.estado_empresa <> 'contratado' OR OLD.estado_empresa = 'contratado' THEN
    RETURN NEW;
  END IF;

  SELECT po.oferta_id INTO v_oferta_id
  FROM public.postulaciones po
  WHERE po.id = NEW.postulacion_id;

  IF v_oferta_id IS NULL THEN RETURN NEW; END IF;

  SELECT ov.cantidad INTO v_vacantes
  FROM public.oferta_vacantes ov
  WHERE ov.oferta_id = v_oferta_id;

  IF v_vacantes IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*)::int INTO v_contratados
  FROM public.derivaciones d
  JOIN public.postulaciones po ON po.id = d.postulacion_id
  WHERE po.oferta_id    = v_oferta_id
    AND d.estado_empresa = 'contratado';

  IF v_contratados >= v_vacantes THEN
    -- SECURITY DEFINER: bypass RLS y grants de columna.
    -- El trigger prevent_empresa_oferta_campos_fn no bloquea estado='cerrada'.
    -- El trigger prevent_empresa_editar_pendiente no aplica (old.estado='activa').
    UPDATE public.ofertas
    SET    estado     = 'cerrada',
           updated_at = now()
    WHERE  id     = v_oferta_id
      AND  estado = 'activa';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS derivaciones_auto_cerrar_oferta ON public.derivaciones;
CREATE TRIGGER derivaciones_auto_cerrar_oferta
  AFTER UPDATE ON public.derivaciones
  FOR EACH ROW EXECUTE FUNCTION public.derivaciones_auto_cerrar_oferta_fn();


-- ============================================================
-- BLOQUE 7 — candidato_para_empresa_completo
-- Extiende candidato_para_empresa con foto y rubros.
-- Se crea como función nueva (firma distinta por más columnas de retorno).
-- candidato_para_empresa (028) queda para compatibilidad con el listado.
-- ============================================================

CREATE OR REPLACE FUNCTION public.candidato_para_empresa_completo(p_postulante_id uuid)
RETURNS TABLE (
  nombre           text,
  apellido         text,
  email            text,
  telefono         text,
  cv_ruta          text,
  foto_ruta        text,
  rubros_interes   text[]
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT
    u.nombre,
    u.apellido,
    au.email::text  AS email,
    u.telefono,
    (SELECT ar.ruta FROM public.archivos_usuario ar
     WHERE ar.usuario_id = u.id AND ar.tipo = 'cv' AND ar.activo = true
     LIMIT 1)       AS cv_ruta,
    (SELECT ar.ruta FROM public.archivos_usuario ar
     WHERE ar.usuario_id = u.id AND ar.tipo = 'avatar' AND ar.activo = true
     LIMIT 1)       AS foto_ruta,
    COALESCE(
      (SELECT ARRAY_AGG(c.nombre ORDER BY c.nombre)
       FROM public.postulante_categorias pc
       JOIN public.categorias c ON c.id = pc.categoria_id
       WHERE pc.postulante_id = p.id),
      ARRAY[]::text[]
    )               AS rubros_interes
  FROM public.postulantes p
  JOIN public.usuarios u ON u.id = p.usuario_id
  JOIN auth.users au     ON au.id = u.id
  WHERE p.id = p_postulante_id
    AND (
      EXISTS (
        SELECT 1
        FROM public.postulaciones po
        JOIN public.derivaciones d ON d.postulacion_id = po.id
        JOIN public.ofertas o      ON o.id  = po.oferta_id
        JOIN public.empresas e     ON e.id  = o.empresa_id
        WHERE po.postulante_id = p_postulante_id
          AND e.usuario_id     = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1
        FROM public.candidatos_guardados cg
        JOIN public.empresas e ON e.id = cg.empresa_id
        WHERE cg.postulante_id = p_postulante_id
          AND e.usuario_id     = auth.uid()
      )
    )
$$;

REVOKE EXECUTE ON FUNCTION public.candidato_para_empresa_completo(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.candidato_para_empresa_completo(uuid) TO authenticated;


-- ============================================================
-- BLOQUE 8 — derivaciones_de_postulante_empresa
-- Devuelve el historial de derivaciones de un postulante en
-- todas las ofertas de la empresa que llama.
-- Necesario para la página de perfil de candidato.
-- ============================================================

CREATE OR REPLACE FUNCTION public.derivaciones_de_postulante_empresa(p_postulante_id uuid)
RETURNS TABLE (
  derivacion_id  uuid,
  oferta_id      uuid,
  oferta_titulo  text,
  estado_empresa public.estado_empresa,
  fecha_respuesta timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT
    d.id            AS derivacion_id,
    o.id            AS oferta_id,
    o.titulo        AS oferta_titulo,
    d.estado_empresa,
    d.fecha_respuesta
  FROM public.derivaciones d
  JOIN public.postulaciones po ON po.id = d.postulacion_id
  JOIN public.ofertas o        ON o.id  = po.oferta_id
  JOIN public.empresas e       ON e.id  = o.empresa_id
  WHERE po.postulante_id = p_postulante_id
    AND e.usuario_id     = auth.uid()
  ORDER BY d.created_at DESC
$$;

REVOKE EXECUTE ON FUNCTION public.derivaciones_de_postulante_empresa(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.derivaciones_de_postulante_empresa(uuid) TO authenticated;


-- ============================================================
-- BLOQUE 9 — Storage policy: empresa lee avatares de candidatos
-- Sigue el mismo patrón que "cvs: empresa lee candidatos derivados
-- o guardados" de migration_028, adaptado al bucket "avatares".
-- ============================================================

CREATE OR REPLACE FUNCTION public.empresa_puede_ver_avatar(p_ruta text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.archivos_usuario ar
    JOIN public.postulantes pt ON pt.usuario_id = ar.usuario_id
    JOIN public.postulaciones po ON po.postulante_id = pt.id
    JOIN public.derivaciones d ON d.postulacion_id = po.id
    JOIN public.ofertas o ON o.id = po.oferta_id
    JOIN public.empresas e ON e.id = o.empresa_id
    WHERE ar.ruta     = p_ruta
      AND ar.tipo     = 'avatar'
      AND ar.activo   = true
      AND e.usuario_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.archivos_usuario ar
    JOIN public.postulantes pt ON pt.usuario_id = ar.usuario_id
    JOIN public.candidatos_guardados cg ON cg.postulante_id = pt.id
    JOIN public.empresas e ON e.id = cg.empresa_id
    WHERE ar.ruta     = p_ruta
      AND ar.tipo     = 'avatar'
      AND ar.activo   = true
      AND e.usuario_id = auth.uid()
  )
$$;

REVOKE EXECUTE ON FUNCTION public.empresa_puede_ver_avatar(text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.empresa_puede_ver_avatar(text) TO authenticated;

DROP POLICY IF EXISTS "avatares: empresa lee candidatos derivados o guardados" ON storage.objects;
CREATE POLICY "avatares: empresa lee candidatos derivados o guardados"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatares'
    AND public.rol_actual()::text = 'empresa'
    AND public.empresa_puede_ver_avatar(name)
  );
