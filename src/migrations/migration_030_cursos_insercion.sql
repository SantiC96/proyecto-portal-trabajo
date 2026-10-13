-- ============================================================
-- Portal Municipal de Empleo — Migración 030
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_029_vacantes_y_mejoras.sql ya aplicada.
-- ============================================================
-- Implementa cursos de inserción laboral para postulantes con
-- 3 o más rechazos de empresas desde su última asignación de curso:
--   - Tabla cursos: catálogo de cursos gestionado por la oficina
--   - Tabla asignaciones_curso: registro de cursos asignados a postulantes
--   - Funciones SECURITY DEFINER:
--       · rechazos_desde_ultimo_curso        (conteo individual)
--       · contar_postulantes_esperando_curso (badge del inicio)
--       · postulantes_esperando_curso_ids    (filtro del listado)
--       · rechazos_por_postulantes           (etiquetas en batch)
--       · mis_cursos_asignados               (vista del postulante, sin nota)
--   - Trigger: no se puede asignar un curso inactivo
--   - RLS: municipalidad full CRUD; postulante vía función; empresa/visitante sin acceso
-- ============================================================


-- ============================================================
-- BLOQUE 1 — Tabla cursos
-- Diseñada para crecer: modalidad, estado_asignacion y otros
-- campos pueden agregarse como columnas nuevas sin rehacer nada.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cursos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       text        NOT NULL CHECK (TRIM(nombre) <> ''),
  descripcion  text,
  link         text        CHECK (link IS NULL OR link LIKE 'https://%'),
  indicaciones text,
  activo       boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- BLOQUE 2 — Tabla asignaciones_curso
-- Sin columna de estado: columnas futuras (estado, completado_en,
-- etc.) se agregan sin rehacer la tabla ni las funciones existentes.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.asignaciones_curso (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  postulante_id  uuid        NOT NULL REFERENCES public.postulantes(id) ON DELETE CASCADE,
  curso_id       uuid        NOT NULL REFERENCES public.cursos(id),
  asignado_por   uuid        REFERENCES public.usuarios(id) ON DELETE SET NULL,
  nota           text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asignaciones_curso_postulante
  ON public.asignaciones_curso (postulante_id);

CREATE INDEX IF NOT EXISTS idx_asignaciones_curso_curso
  ON public.asignaciones_curso (curso_id);


-- ============================================================
-- BLOQUE 3 — Trigger BEFORE INSERT: no asignar curso inactivo
-- ============================================================

CREATE OR REPLACE FUNCTION public.asignaciones_curso_check_activo_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.cursos
    WHERE id = NEW.curso_id AND activo = true
  ) THEN
    RAISE EXCEPTION 'El curso seleccionado no está activo y no puede asignarse.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS asignaciones_curso_check_activo ON public.asignaciones_curso;
CREATE TRIGGER asignaciones_curso_check_activo
  BEFORE INSERT ON public.asignaciones_curso
  FOR EACH ROW EXECUTE FUNCTION public.asignaciones_curso_check_activo_fn();


-- ============================================================
-- BLOQUE 4 — Funciones SECURITY DEFINER
-- Todas usan search_path = '' para no depender del search_path
-- del llamador y evitar ciclos entre policies.
-- ============================================================

-- 4a. Cuenta rechazos de empresa para un postulante desde su última
-- asignación de curso. Si nunca tuvo curso asignado, cuenta todos.
-- Usa el índice parcial idx_derivaciones_rechazado (migration_028).
CREATE OR REPLACE FUNCTION public.rechazos_desde_ultimo_curso(p_postulante_id uuid)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
DECLARE
  v_resultado bigint;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  SELECT COUNT(d.id) INTO v_resultado
  FROM public.derivaciones d
  JOIN public.postulaciones po ON po.id = d.postulacion_id
  LEFT JOIN (
    SELECT MAX(ac.created_at) AS ultima
    FROM public.asignaciones_curso ac
    WHERE ac.postulante_id = p_postulante_id
  ) uc ON true
  WHERE po.postulante_id = p_postulante_id
    AND d.estado_empresa = 'rechazado'
    AND (uc.ultima IS NULL OR d.fecha_respuesta > uc.ultima);
  RETURN v_resultado;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rechazos_desde_ultimo_curso(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.rechazos_desde_ultimo_curso(uuid) TO authenticated;


-- 4b. Cuenta cuántos postulantes tienen 3+ rechazos desde su último curso.
-- Usada en el inicio del panel para el badge del botón "Postulantes".
-- Decisión de diseño: se eligieron funciones en lugar de una vista
-- porque son SECURITY DEFINER, consistentes con el patrón existente
-- (ver funciones 028/029) y más simples de controlar que una VIEW con RLS.
CREATE OR REPLACE FUNCTION public.contar_postulantes_esperando_curso()
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
DECLARE
  v_resultado bigint;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  WITH ultimo_curso AS (
    SELECT ac.postulante_id, MAX(ac.created_at) AS ultima
    FROM public.asignaciones_curso ac
    GROUP BY ac.postulante_id
  ),
  con_suficientes_rechazos AS (
    SELECT po.postulante_id
    FROM public.derivaciones d
    JOIN public.postulaciones po ON po.id = d.postulacion_id
    LEFT JOIN ultimo_curso uc ON uc.postulante_id = po.postulante_id
    WHERE d.estado_empresa = 'rechazado'
      AND (uc.ultima IS NULL OR d.fecha_respuesta > uc.ultima)
    GROUP BY po.postulante_id
    HAVING COUNT(d.id) >= 3
  )
  SELECT COUNT(*) INTO v_resultado FROM con_suficientes_rechazos;
  RETURN v_resultado;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.contar_postulantes_esperando_curso() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.contar_postulantes_esperando_curso() TO authenticated;


-- 4c. Devuelve los postulante_id con 3+ rechazos desde su último curso.
-- Usada para el filtro "Esperando curso" en el listado de postulantes.
CREATE OR REPLACE FUNCTION public.postulantes_esperando_curso_ids()
RETURNS TABLE (postulante_id uuid)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  RETURN QUERY
  WITH ultimo_curso AS (
    SELECT ac.postulante_id, MAX(ac.created_at) AS ultima
    FROM public.asignaciones_curso ac
    GROUP BY ac.postulante_id
  )
  SELECT po.postulante_id
  FROM public.derivaciones d
  JOIN public.postulaciones po ON po.id = d.postulacion_id
  LEFT JOIN ultimo_curso uc ON uc.postulante_id = po.postulante_id
  WHERE d.estado_empresa = 'rechazado'
    AND (uc.ultima IS NULL OR d.fecha_respuesta > uc.ultima)
  GROUP BY po.postulante_id
  HAVING COUNT(d.id) >= 3;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.postulantes_esperando_curso_ids() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.postulantes_esperando_curso_ids() TO authenticated;


-- 4d. Devuelve (postulante_id, rechazos) para un lote de postulantes.
-- Usada para las etiquetas "Necesita curso · N rechazos" en el listado.
-- Devuelve solo postulantes con al menos 1 rechazo contable; los demás
-- no aparecen (la UI trata los ausentes como 0).
CREATE OR REPLACE FUNCTION public.rechazos_por_postulantes(p_postulante_ids uuid[])
RETURNS TABLE (postulante_id uuid, rechazos bigint)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  RETURN QUERY
  WITH ultimo_curso AS (
    SELECT ac.postulante_id, MAX(ac.created_at) AS ultima
    FROM public.asignaciones_curso ac
    WHERE ac.postulante_id = ANY(p_postulante_ids)
    GROUP BY ac.postulante_id
  )
  SELECT
    po.postulante_id,
    COUNT(d.id) AS rechazos
  FROM public.derivaciones d
  JOIN public.postulaciones po ON po.id = d.postulacion_id
  LEFT JOIN ultimo_curso uc ON uc.postulante_id = po.postulante_id
  WHERE po.postulante_id = ANY(p_postulante_ids)
    AND d.estado_empresa = 'rechazado'
    AND (uc.ultima IS NULL OR d.fecha_respuesta > uc.ultima)
  GROUP BY po.postulante_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rechazos_por_postulantes(uuid[]) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.rechazos_por_postulantes(uuid[]) TO authenticated;


-- 4e. Vista del postulante sobre sus cursos asignados.
-- Excluye la columna `nota` (interna de la oficina).
-- El postulante nunca accede a cursos ni a asignaciones_curso
-- directamente — siempre usa esta función.
CREATE OR REPLACE FUNCTION public.mis_cursos_asignados()
RETURNS TABLE (
  asignacion_id  uuid,
  curso_id       uuid,
  asignado_en    timestamptz,
  nombre         text,
  descripcion    text,
  link           text,
  indicaciones   text
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT
    ac.id          AS asignacion_id,
    ac.curso_id,
    ac.created_at  AS asignado_en,
    c.nombre,
    c.descripcion,
    c.link,
    c.indicaciones
  FROM public.asignaciones_curso ac
  JOIN public.cursos c          ON c.id = ac.curso_id
  JOIN public.postulantes p     ON p.id = ac.postulante_id
  WHERE p.usuario_id = auth.uid()
  ORDER BY ac.created_at DESC
$$;

REVOKE EXECUTE ON FUNCTION public.mis_cursos_asignados() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.mis_cursos_asignados() TO authenticated;


-- ============================================================
-- BLOQUE 5 — RLS en cursos
-- Municipalidad: full CRUD.
-- Postulante: accede vía mis_cursos_asignados(), sin política directa.
-- Empresa y visitantes: ningún acceso.
-- ============================================================

ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cursos: ver (municipalidad)"      ON public.cursos;
DROP POLICY IF EXISTS "cursos: insertar (municipalidad)" ON public.cursos;
DROP POLICY IF EXISTS "cursos: actualizar (municipalidad)" ON public.cursos;
DROP POLICY IF EXISTS "cursos: eliminar (municipalidad)" ON public.cursos;

CREATE POLICY "cursos: ver (municipalidad)"
  ON public.cursos FOR SELECT
  USING (public.rol_actual()::text = 'municipalidad');

CREATE POLICY "cursos: insertar (municipalidad)"
  ON public.cursos FOR INSERT
  WITH CHECK (public.rol_actual()::text = 'municipalidad');

CREATE POLICY "cursos: actualizar (municipalidad)"
  ON public.cursos FOR UPDATE
  USING  (public.rol_actual()::text = 'municipalidad')
  WITH CHECK (public.rol_actual()::text = 'municipalidad');

CREATE POLICY "cursos: eliminar (municipalidad)"
  ON public.cursos FOR DELETE
  USING (public.rol_actual()::text = 'municipalidad');

-- Grants por columna: cliente solo puede insertar/actualizar campos de contenido;
-- id, created_at y updated_at (en INSERT) los gestiona el servidor.
REVOKE INSERT, UPDATE ON public.cursos FROM authenticated;
GRANT  INSERT (nombre, descripcion, link, indicaciones, activo)          ON public.cursos TO authenticated;
GRANT  UPDATE (nombre, descripcion, link, indicaciones, activo, updated_at) ON public.cursos TO authenticated;


-- ============================================================
-- BLOQUE 6 — RLS en asignaciones_curso
-- Municipalidad: full CRUD.
-- Postulante: accede vía mis_cursos_asignados(), sin política directa.
-- Empresa y visitantes: ningún acceso.
-- ============================================================

ALTER TABLE public.asignaciones_curso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "asignaciones_curso: ver (municipalidad)"       ON public.asignaciones_curso;
DROP POLICY IF EXISTS "asignaciones_curso: insertar (municipalidad)"  ON public.asignaciones_curso;
DROP POLICY IF EXISTS "asignaciones_curso: actualizar (municipalidad)" ON public.asignaciones_curso;
DROP POLICY IF EXISTS "asignaciones_curso: eliminar (municipalidad)"  ON public.asignaciones_curso;

CREATE POLICY "asignaciones_curso: ver (municipalidad)"
  ON public.asignaciones_curso FOR SELECT
  USING (public.rol_actual()::text = 'municipalidad');

CREATE POLICY "asignaciones_curso: insertar (municipalidad)"
  ON public.asignaciones_curso FOR INSERT
  WITH CHECK (public.rol_actual()::text = 'municipalidad');

CREATE POLICY "asignaciones_curso: actualizar (municipalidad)"
  ON public.asignaciones_curso FOR UPDATE
  USING  (public.rol_actual()::text = 'municipalidad')
  WITH CHECK (public.rol_actual()::text = 'municipalidad');

CREATE POLICY "asignaciones_curso: eliminar (municipalidad)"
  ON public.asignaciones_curso FOR DELETE
  USING (public.rol_actual()::text = 'municipalidad');

-- Grants por columna: cliente no puede forzar id ni created_at.
REVOKE INSERT ON public.asignaciones_curso FROM authenticated;
GRANT  INSERT (postulante_id, curso_id, asignado_por, nota) ON public.asignaciones_curso TO authenticated;
