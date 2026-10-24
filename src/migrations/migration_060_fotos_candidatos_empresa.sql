-- ============================================================
-- Portal Municipal de Empleo — Migración 060
-- Fotos de los candidatos para la empresa
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_059_titulos_mis_postulaciones.sql ya aplicada.
-- Re-ejecutable sin errores. No cambia ninguna fila, tabla ni política: solo
-- crea una función de lectura.
-- Después de aplicarla: npm run db:tipos
-- ============================================================
--
-- Ver docs/decisiones/007-acceso-candidatos-empresa.md y 011-imagenes.md.
--
--   BLOQUE 1  avatares_de_candidatos_para_empresa(p_postulante_ids) (empresa).
--
-- La empresa no lee archivos_usuario (RLS) y candidato_para_empresa no
-- devuelve la foto, así que el panel, el detalle de la oferta y la ficha del
-- candidato mostraban iniciales. Esta función devuelve, en una sola llamada,
-- la ruta y el ajuste de la foto activa de los candidatos que la empresa ya
-- puede ver. La URL firmada la genera la propia sesión de la empresa: la
-- política "avatares: empresa lee candidatos derivados o guardados" (029) ya
-- lo permite para esas mismas fotos. No se crean políticas de storage.
--
-- Ningún otro dato del postulante.
--
-- Errores:
--   42501  sin permiso ('No autorizado').
--   P0001  más de 100 ids.
-- ============================================================


-- ============================================================
-- BLOQUE 1 — avatares_de_candidatos_para_empresa(p_postulante_ids)
--
-- Para los postulantes de la lista que fueron derivados alguna vez a una
-- oferta de la empresa de la sesión (auth.uid()) o que esa empresa guardó
-- (el mismo criterio que candidato_para_empresa): postulante_id, ruta y el
-- ajuste (x, y, zoom) de su foto activa. Los demás ids, y los postulantes sin
-- foto, no devuelven fila y no dan error.
-- Hasta 100 ids por llamada (cada pantalla pide como mucho una página).
-- ============================================================

CREATE OR REPLACE FUNCTION public.avatares_de_candidatos_para_empresa(p_postulante_ids uuid[])
RETURNS TABLE (
  postulante_id  uuid,
  ruta           text,
  ajuste_x       numeric,
  ajuste_y       numeric,
  ajuste_zoom    numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_empresa_id uuid;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'empresa' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(pg_catalog.cardinality(p_postulante_ids), 0) > 100 THEN
    RAISE EXCEPTION 'Se pueden pedir hasta 100 candidatos por vez.';
  END IF;

  SELECT e.id INTO v_empresa_id
  FROM public.empresas e
  WHERE e.usuario_id = auth.uid();

  IF v_empresa_id IS NULL OR p_postulante_ids IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    a.ruta,
    a.ajuste_x,
    a.ajuste_y,
    a.ajuste_zoom
  FROM public.postulantes p
  JOIN public.archivos_usuario a
    ON a.usuario_id = p.usuario_id
   AND a.tipo   = 'avatar'
   AND a.activo = true
  WHERE p.id = ANY (p_postulante_ids)
    AND (
      -- Derivado alguna vez a esta empresa
      EXISTS (
        SELECT 1
        FROM public.postulaciones po
        JOIN public.derivaciones d ON d.postulacion_id = po.id
        JOIN public.ofertas o      ON o.id = po.oferta_id
        WHERE po.postulante_id = p.id
          AND o.empresa_id     = v_empresa_id
      )
      OR
      -- Guardado por esta empresa
      EXISTS (
        SELECT 1
        FROM public.candidatos_guardados cg
        WHERE cg.postulante_id = p.id
          AND cg.empresa_id    = v_empresa_id
      )
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.avatares_de_candidatos_para_empresa(uuid[]) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.avatares_de_candidatos_para_empresa(uuid[]) TO authenticated;


-- ============================================================
-- Verificación (opcional, en el SQL Editor)
-- ============================================================
-- Sin sesión de empresa falla con 42501:
-- select * from public.avatares_de_candidatos_para_empresa(array[]::uuid[]);


-- ============================================================
-- ROLLBACK (comentado). Ejecutar a mano solo si hace falta volver atrás.
-- No hay datos que restaurar. Antes, volver a la versión anterior de las
-- pantallas de la empresa (solo iniciales), que no llama a esta función.
-- ============================================================
--
-- DROP FUNCTION IF EXISTS public.avatares_de_candidatos_para_empresa(uuid[]);
