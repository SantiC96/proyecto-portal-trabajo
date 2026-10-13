-- ============================================================
-- Portal Municipal de Empleo — Migración 028
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_027_reenvio_oferta_rechazada.sql ya aplicada.
-- ============================================================
-- Habilita la gestión de derivaciones por parte de la empresa:
--   - Columnas de entrevista y respuesta en derivaciones
--   - Políticas RLS y grants de columna para empresa en derivaciones
--   - Trigger de protección y validación BEFORE UPDATE en derivaciones
--   - Funciones SECURITY DEFINER que evitan ciclos entre policies:
--       · empresa_propietaria_de_derivacion  (RLS de derivaciones)
--       · mi_empresa_id                      (RLS de candidatos_guardados)
--       · postulante_fue_derivado_a_empresa  (INSERT de candidatos_guardados)
--       · derivaciones_de_oferta_empresa     (listado de candidatos para la empresa)
--       · candidato_para_empresa             (datos limitados del candidato)
--       · estado_derivacion_postulante       (estado de entrevista para el postulante)
--       · empresa_puede_ver_cv               (storage policy del bucket cvs)
--       · ofertas_con_candidatos_pendientes  (indicador en listado de ofertas)
--   - Tabla candidatos_guardados con RLS y grants de columna
--   - Storage policy: empresa lee CVs de candidatos derivados o guardados
--   - Índice parcial para conteo futuro de rechazos por postulante
-- ============================================================


-- ============================================================
-- BLOQUE 1 — Columnas nuevas en derivaciones
-- ============================================================

ALTER TABLE public.derivaciones
  ADD COLUMN IF NOT EXISTS fecha_entrevista  timestamptz,
  ADD COLUMN IF NOT EXISTS lugar_entrevista  text,
  ADD COLUMN IF NOT EXISTS fecha_respuesta   timestamptz;


-- ============================================================
-- BLOQUE 2 — Tabla candidatos_guardados (sin RLS aún)
-- Se crea antes que las funciones para que las referencias sean válidas.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.candidatos_guardados (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       uuid        NOT NULL REFERENCES public.empresas(id)    ON DELETE CASCADE,
  postulante_id    uuid        NOT NULL REFERENCES public.postulantes(id) ON DELETE CASCADE,
  oferta_origen_id uuid                 REFERENCES public.ofertas(id)     ON DELETE SET NULL,
  nota             text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, postulante_id)
);

-- Trigger: auto-setea empresa_id desde la sesión antes de insertar,
-- para que el cliente nunca envíe ese valor.
CREATE OR REPLACE FUNCTION public.candidatos_guardados_set_empresa_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  SELECT id INTO NEW.empresa_id
  FROM public.empresas
  WHERE usuario_id = auth.uid();

  IF NEW.empresa_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró una empresa activa para el usuario actual.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS candidatos_guardados_set_empresa ON public.candidatos_guardados;
CREATE TRIGGER candidatos_guardados_set_empresa
  BEFORE INSERT ON public.candidatos_guardados
  FOR EACH ROW EXECUTE FUNCTION public.candidatos_guardados_set_empresa_fn();


-- ============================================================
-- BLOQUE 3 — Funciones SECURITY DEFINER auxiliares
-- Todas usan search_path = '' para evitar ciclos entre policies
-- y para no depender del search_path del llamador.
-- ============================================================

-- 3a. Verifica si la derivación pertenece a la empresa del usuario actual.
-- Recorre derivacion → postulacion → oferta → empresa sin pasar por el RLS
-- de esas tablas (la empresa no tiene SELECT en postulaciones).
CREATE OR REPLACE FUNCTION public.empresa_propietaria_de_derivacion(p_derivacion_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.derivaciones d
    JOIN public.postulaciones po ON po.id = d.postulacion_id
    JOIN public.ofertas o        ON o.id  = po.oferta_id
    JOIN public.empresas e       ON e.id  = o.empresa_id
    WHERE d.id          = p_derivacion_id
      AND e.usuario_id  = auth.uid()
  )
$$;

REVOKE EXECUTE ON FUNCTION public.empresa_propietaria_de_derivacion(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.empresa_propietaria_de_derivacion(uuid) TO authenticated;

-- 3b. Devuelve el id de la empresa del usuario actual.
-- Evita subconsultas directas a public.empresas en políticas que ya evalúan
-- el RLS de esa tabla y podrían producir ciclos.
CREATE OR REPLACE FUNCTION public.mi_empresa_id()
RETURNS uuid
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT id FROM public.empresas WHERE usuario_id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.mi_empresa_id() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.mi_empresa_id() TO authenticated;

-- 3c. Verifica si el postulante fue derivado alguna vez a la empresa indicada.
-- Usada como guardia de inserción en candidatos_guardados.
CREATE OR REPLACE FUNCTION public.postulante_fue_derivado_a_empresa(
  p_postulante_id uuid,
  p_empresa_id    uuid
)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.postulaciones po
    JOIN public.derivaciones d ON d.postulacion_id = po.id
    JOIN public.ofertas o      ON o.id = po.oferta_id
    WHERE po.postulante_id = p_postulante_id
      AND o.empresa_id     = p_empresa_id
  )
$$;

REVOKE EXECUTE ON FUNCTION public.postulante_fue_derivado_a_empresa(uuid, uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.postulante_fue_derivado_a_empresa(uuid, uuid) TO authenticated;

-- 3d. Devuelve las derivaciones de una oferta para la empresa que llama.
-- Incluye postulante_id (de postulaciones) sin abrir SELECT en postulaciones.
CREATE OR REPLACE FUNCTION public.derivaciones_de_oferta_empresa(p_oferta_id uuid)
RETURNS TABLE (
  derivacion_id    uuid,
  postulante_id    uuid,
  estado_empresa   public.estado_empresa,
  nota_municipalidad text,
  fecha_entrevista timestamptz,
  lugar_entrevista text,
  fecha_respuesta  timestamptz,
  derivacion_created_at timestamptz,
  derivacion_updated_at timestamptz
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
    d.updated_at       AS derivacion_updated_at
  FROM public.derivaciones d
  JOIN public.postulaciones po ON po.id = d.postulacion_id
  JOIN public.ofertas o        ON o.id  = po.oferta_id
  JOIN public.empresas e       ON e.id  = o.empresa_id
  WHERE po.oferta_id  = p_oferta_id
    AND e.usuario_id  = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.derivaciones_de_oferta_empresa(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.derivaciones_de_oferta_empresa(uuid) TO authenticated;

-- 3e. Datos del candidato visibles para la empresa: solo nombre, apellido, email,
-- teléfono y ruta del CV activo. Solo si el postulante fue derivado a esta empresa
-- o está guardado por ella. Nunca expone DNI, domicilio ni notas internas.
CREATE OR REPLACE FUNCTION public.candidato_para_empresa(p_postulante_id uuid)
RETURNS TABLE (
  nombre   text,
  apellido text,
  email    text,
  telefono text,
  cv_ruta  text
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT
    u.nombre,
    u.apellido,
    au.email::text  AS email,
    u.telefono,
    a.ruta          AS cv_ruta
  FROM public.postulantes p
  JOIN public.usuarios u ON u.id = p.usuario_id
  JOIN auth.users au     ON au.id = u.id
  LEFT JOIN (
    SELECT ruta, usuario_id
    FROM public.archivos_usuario
    WHERE tipo = 'cv' AND activo = true
  ) a ON a.usuario_id = u.id
  WHERE p.id = p_postulante_id
    AND (
      -- Derivado alguna vez a esta empresa
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
      -- Guardado por esta empresa
      EXISTS (
        SELECT 1
        FROM public.candidatos_guardados cg
        JOIN public.empresas e ON e.id = cg.empresa_id
        WHERE cg.postulante_id = p_postulante_id
          AND e.usuario_id     = auth.uid()
      )
    )
$$;

REVOKE EXECUTE ON FUNCTION public.candidato_para_empresa(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.candidato_para_empresa(uuid) TO authenticated;

-- 3f. Estado de derivación para el postulante: solo estado, fecha y lugar.
-- El postulante no puede leer derivaciones directamente; esta función filtra
-- por las postulaciones propias y nunca devuelve nota_empresa ni nota_municipalidad.
CREATE OR REPLACE FUNCTION public.estado_derivacion_postulante(p_postulacion_id uuid)
RETURNS TABLE (
  estado_empresa   public.estado_empresa,
  fecha_entrevista timestamptz,
  lugar_entrevista text
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT
    d.estado_empresa,
    d.fecha_entrevista,
    d.lugar_entrevista
  FROM public.derivaciones d
  JOIN public.postulaciones po ON po.id = d.postulacion_id
  JOIN public.postulantes pt   ON pt.id = po.postulante_id
  WHERE d.postulacion_id = p_postulacion_id
    AND pt.usuario_id    = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.estado_derivacion_postulante(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.estado_derivacion_postulante(uuid) TO authenticated;

-- 3g. Verifica si la empresa puede acceder a un CV por su ruta de storage.
-- Usada en la policy del bucket "cvs" para que la empresa no necesite supabaseAdmin.
CREATE OR REPLACE FUNCTION public.empresa_puede_ver_cv(p_ruta text)
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
    WHERE ar.ruta = p_ruta
      AND ar.tipo = 'cv'
      AND ar.activo = true
      AND e.usuario_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.archivos_usuario ar
    JOIN public.postulantes pt ON pt.usuario_id = ar.usuario_id
    JOIN public.candidatos_guardados cg ON cg.postulante_id = pt.id
    JOIN public.empresas e ON e.id = cg.empresa_id
    WHERE ar.ruta = p_ruta
      AND ar.tipo = 'cv'
      AND ar.activo = true
      AND e.usuario_id = auth.uid()
  )
$$;

REVOKE EXECUTE ON FUNCTION public.empresa_puede_ver_cv(text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.empresa_puede_ver_cv(text) TO authenticated;

-- 3h. Devuelve los oferta_id que tienen al menos una derivación pendiente para
-- la empresa actual. Usada en el listado de ofertas para mostrar el indicador
-- de candidatos "Por contactar" sin exponer la cantidad.
CREATE OR REPLACE FUNCTION public.ofertas_con_candidatos_pendientes()
RETURNS TABLE (oferta_id uuid)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT DISTINCT po.oferta_id
  FROM public.derivaciones d
  JOIN public.postulaciones po ON po.id = d.postulacion_id
  JOIN public.ofertas o        ON o.id  = po.oferta_id
  JOIN public.empresas e       ON e.id  = o.empresa_id
  WHERE d.estado_empresa = 'pendiente'
    AND e.usuario_id     = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.ofertas_con_candidatos_pendientes() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.ofertas_con_candidatos_pendientes() TO authenticated;


-- ============================================================
-- BLOQUE 4 — RLS en derivaciones para empresa
-- ============================================================

-- SELECT: empresa ve sus propias derivaciones
DROP POLICY IF EXISTS "derivaciones: ver (empresa propia)" ON public.derivaciones;
CREATE POLICY "derivaciones: ver (empresa propia)"
  ON public.derivaciones FOR SELECT
  USING (
    public.rol_actual() = 'empresa'
    AND public.empresa_propietaria_de_derivacion(id)
  );

-- UPDATE: empresa (sus derivaciones) y municipalidad (cualquiera, para corregir)
DROP POLICY IF EXISTS "derivaciones: actualizar (empresa propia)" ON public.derivaciones;
CREATE POLICY "derivaciones: actualizar (empresa propia)"
  ON public.derivaciones FOR UPDATE
  USING (
    (public.rol_actual()::text = 'empresa' AND public.empresa_propietaria_de_derivacion(id))
    OR public.rol_actual()::text = 'municipalidad'
  )
  WITH CHECK (
    (public.rol_actual()::text = 'empresa' AND public.empresa_propietaria_de_derivacion(id))
    OR public.rol_actual()::text = 'municipalidad'
  );

-- Permisos por columna:
--   empresa y municipalidad → estado_empresa, nota_empresa, fecha_entrevista,
--                              lugar_entrevista, updated_at, fecha_respuesta
--   solo municipalidad      → nota_municipalidad (el trigger la protege de empresa)
-- El trigger BEFORE UPDATE valida qué puede hacer cada rol en tiempo de ejecución.
REVOKE UPDATE ON public.derivaciones FROM authenticated;
GRANT UPDATE (
  estado_empresa,
  nota_empresa,
  fecha_entrevista,
  lugar_entrevista,
  nota_municipalidad,
  updated_at,
  fecha_respuesta
) ON public.derivaciones TO authenticated;


-- ============================================================
-- BLOQUE 5 — Trigger BEFORE UPDATE en derivaciones
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
    -- Auto-set fecha_respuesta al entrar en estado final por primera vez
    IF NEW.estado_empresa IN ('contratado', 'rechazado')
       AND OLD.estado_empresa NOT IN ('contratado', 'rechazado') THEN
      NEW.fecha_respuesta := now();
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- ── Empresa: protección de columnas reservadas ──────────────────────────────
  -- Cualquier cambio en estas columnas lanza error inmediatamente.
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
  -- pendiente  → en_proceso | contratado | rechazado
  -- en_proceso → en_proceso (reprogramar) | contratado | rechazado
  IF NOT (
    (OLD.estado_empresa = 'pendiente'  AND NEW.estado_empresa IN ('en_proceso', 'contratado', 'rechazado'))
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

  -- ── Empresa: fecha nueva debe ser futura ─────────────────────────────────────
  -- Solo valida cuando la fecha CAMBIA; una fecha ya guardada en el pasado
  -- no bloquea los cambios de estado posteriores (contratado/rechazado).
  IF NEW.fecha_entrevista IS DISTINCT FROM OLD.fecha_entrevista
     AND NEW.fecha_entrevista IS NOT NULL THEN
    IF NEW.fecha_entrevista <= now() THEN
      RAISE EXCEPTION 'La fecha y hora de la entrevista debe ser posterior al momento actual.';
    END IF;
    -- Cambio de fecha solo está permitido cuando el estado destino es en_proceso
    IF NEW.estado_empresa != 'en_proceso' THEN
      RAISE EXCEPTION 'Solo podés establecer la fecha de entrevista al coordinar o reprogramar.';
    END IF;
  END IF;

  -- ── Empresa: cambio de lugar solo en en_proceso ──────────────────────────────
  IF NEW.lugar_entrevista IS DISTINCT FROM OLD.lugar_entrevista
     AND NEW.estado_empresa != 'en_proceso' THEN
    RAISE EXCEPTION 'Solo podés modificar el lugar de entrevista cuando el estado es "Entrevista coordinada".';
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

DROP TRIGGER IF EXISTS derivaciones_empresa_update ON public.derivaciones;
CREATE TRIGGER derivaciones_empresa_update
  BEFORE UPDATE ON public.derivaciones
  FOR EACH ROW EXECUTE FUNCTION public.derivaciones_empresa_update_fn();


-- ============================================================
-- BLOQUE 6 — RLS y grants para candidatos_guardados
-- ============================================================

ALTER TABLE public.candidatos_guardados ENABLE ROW LEVEL SECURITY;

-- SELECT: empresa ve sus propios registros
DROP POLICY IF EXISTS "candidatos_guardados: ver (empresa propia)" ON public.candidatos_guardados;
CREATE POLICY "candidatos_guardados: ver (empresa propia)"
  ON public.candidatos_guardados FOR SELECT
  USING (
    public.rol_actual()::text = 'empresa'
    AND empresa_id = public.mi_empresa_id()
  );

-- SELECT: municipalidad lee todo
DROP POLICY IF EXISTS "candidatos_guardados: ver (municipalidad)" ON public.candidatos_guardados;
CREATE POLICY "candidatos_guardados: ver (municipalidad)"
  ON public.candidatos_guardados FOR SELECT
  USING (public.rol_actual()::text = 'municipalidad');

-- INSERT: empresa, solo postulantes que le hayan derivado alguna vez
-- empresa_id lo setea el trigger BEFORE INSERT; el WITH CHECK lo verifica.
DROP POLICY IF EXISTS "candidatos_guardados: insertar (empresa derivado)" ON public.candidatos_guardados;
CREATE POLICY "candidatos_guardados: insertar (empresa derivado)"
  ON public.candidatos_guardados FOR INSERT
  WITH CHECK (
    public.rol_actual()::text = 'empresa'
    AND public.postulante_fue_derivado_a_empresa(postulante_id, empresa_id)
  );

-- UPDATE: empresa solo edita la nota de sus propios registros
DROP POLICY IF EXISTS "candidatos_guardados: actualizar nota (empresa propia)" ON public.candidatos_guardados;
CREATE POLICY "candidatos_guardados: actualizar nota (empresa propia)"
  ON public.candidatos_guardados FOR UPDATE
  USING (
    public.rol_actual()::text = 'empresa'
    AND empresa_id = public.mi_empresa_id()
  )
  WITH CHECK (
    public.rol_actual()::text = 'empresa'
    AND empresa_id = public.mi_empresa_id()
  );

-- DELETE: empresa elimina sus propios registros
DROP POLICY IF EXISTS "candidatos_guardados: eliminar (empresa propia)" ON public.candidatos_guardados;
CREATE POLICY "candidatos_guardados: eliminar (empresa propia)"
  ON public.candidatos_guardados FOR DELETE
  USING (
    public.rol_actual()::text = 'empresa'
    AND empresa_id = public.mi_empresa_id()
  );

-- Grants por columna:
--   INSERT → cliente solo envía postulante_id, oferta_origen_id, nota
--             empresa_id lo pone el trigger BEFORE INSERT desde auth.uid()
--   UPDATE → solo nota
--   SELECT y DELETE → a nivel de tabla (RLS filtra por empresa)
REVOKE INSERT ON public.candidatos_guardados FROM authenticated;
GRANT  INSERT (postulante_id, oferta_origen_id, nota) ON public.candidatos_guardados TO authenticated;
REVOKE UPDATE ON public.candidatos_guardados FROM authenticated;
GRANT  UPDATE (nota) ON public.candidatos_guardados TO authenticated;


-- ============================================================
-- BLOQUE 7 — Storage policy: empresa accede a CVs de candidatos derivados
-- ============================================================
-- Se usa createSupabaseServerClient() (no supabaseAdmin) para generar URLs
-- firmadas porque esta policy habilita el SELECT sobre el objeto en el bucket.
-- La función empresa_puede_ver_cv verifica la autorización a nivel DB antes
-- de que Supabase genere la URL; no se necesita service role.
-- (Decisión 007 documenta el razonamiento completo.)

DROP POLICY IF EXISTS "cvs: empresa lee candidatos derivados o guardados" ON storage.objects;
CREATE POLICY "cvs: empresa lee candidatos derivados o guardados"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'cvs'
    AND public.rol_actual()::text = 'empresa'
    AND public.empresa_puede_ver_cv(name)
  );


-- ============================================================
-- BLOQUE 8 — Índice para conteo futuro de rechazos por postulante
-- ============================================================
-- Próxima etapa: cuando un postulante acumule 3+ derivaciones con
-- estado_empresa = 'rechazado', la oficina verá un aviso y podrá
-- asignarle un curso de inserción laboral.
-- Este índice parcial permite filtrar eficientemente y luego contar
-- por postulante_id via join a postulaciones.
CREATE INDEX IF NOT EXISTS idx_derivaciones_rechazado
  ON public.derivaciones (estado_empresa)
  WHERE estado_empresa = 'rechazado';

-- ── Consulta de referencia para la futura feature ───────────────────────────
-- SELECT po.postulante_id, COUNT(*) AS rechazos
-- FROM public.derivaciones d
-- JOIN public.postulaciones po ON po.id = d.postulacion_id
-- WHERE d.estado_empresa = 'rechazado'
-- GROUP BY po.postulante_id
-- HAVING COUNT(*) >= 3;
