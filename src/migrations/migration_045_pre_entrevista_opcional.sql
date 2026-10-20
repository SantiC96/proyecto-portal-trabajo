-- ============================================================
-- Portal Municipal de Empleo — Migración 045
-- La pre-entrevista de la Oficina de Empleo pasa a ser opcional
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_044_pre_entrevistas.sql ya aplicada.
-- Re-ejecutable sin errores. No borra ni modifica datos existentes.
-- ============================================================
--
--   BLOQUE 1  derivar_postulacion (044), misma firma: ya no exige la
--             pre-entrevista realizada.
--   BLOQUE 2  Sin los triggers que la exigían en las escrituras directas
--             (postulaciones_exigir_pre_entrevista,
--             derivaciones_exigir_pre_entrevista) ni su función.
--   BLOQUE 3  Sin postulacion_tiene_pre_entrevista_realizada(): solo la
--             usaban derivar_postulacion y la función del BLOQUE 2.
--
-- Todo lo demás de 044 queda igual: la tabla pre_entrevistas, coordinar,
-- reprogramar, registrar el resultado, mis_pre_entrevistas() y los avisos al
-- postulante. Se puede derivar con o sin pre-entrevista, también con una
-- coordinada pendiente. Después de derivar, la pre-entrevista queda como está:
-- bloquear_pre_entrevista (044) solo deja gestionarla con la postulación en
-- 'recibida' o 'en_revision'.
--
-- Errores (igual que 040):
--   42501  rol incorrecto ('No autorizado').
--   P0001  el estado no permite la acción; el mensaje es para el usuario.
-- ============================================================


-- ============================================================
-- BLOQUE 1 — derivar_postulacion (reemplazo de 044, misma firma y retorno)
-- Igual que 044 sin el control de la pre-entrevista: bloqueo FOR UPDATE de la
-- postulación, controles de estado de la postulación y de la oferta, y la
-- derivación a medias de 040 (si ya existe la fila en derivaciones, solo se
-- completa el estado de la postulación).
-- ============================================================

CREATE OR REPLACE FUNCTION public.derivar_postulacion(
  p_postulacion_id uuid,
  p_nota           text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_usuario_id    uuid := auth.uid();
  v_estado        public.estado_postulacion;
  v_oferta_id     uuid;
  v_estado_oferta public.estado_oferta;
  v_derivacion_id uuid;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT po.estado, po.oferta_id
  INTO   v_estado, v_oferta_id
  FROM   public.postulaciones po
  WHERE  po.id = p_postulacion_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la postulación.';
  END IF;

  IF v_estado = 'derivada' THEN
    RAISE EXCEPTION 'Esta postulación ya fue derivada.';
  END IF;
  IF v_estado = 'rechazada_municipalidad' THEN
    RAISE EXCEPTION 'Esta postulación está marcada como «No seleccionado» y no se puede derivar.';
  END IF;

  SELECT o.estado
  INTO   v_estado_oferta
  FROM   public.ofertas o
  WHERE  o.id = v_oferta_id
  FOR SHARE;

  IF v_estado_oferta IS DISTINCT FROM 'activa' THEN
    RAISE EXCEPTION 'La oferta ya no está activa y no puede recibir derivaciones.';
  END IF;

  SELECT d.id
  INTO   v_derivacion_id
  FROM   public.derivaciones d
  WHERE  d.postulacion_id = p_postulacion_id;

  IF v_derivacion_id IS NULL THEN
    INSERT INTO public.derivaciones (postulacion_id, municipalidad_usuario_id, nota_municipalidad)
    VALUES (p_postulacion_id, v_usuario_id, NULLIF(pg_catalog.btrim(p_nota), ''))
    RETURNING id INTO v_derivacion_id;
  END IF;

  UPDATE public.postulaciones po
  SET    estado       = 'derivada',
         revisado_por = v_usuario_id,
         updated_at   = now()
  WHERE  po.id = p_postulacion_id;

  RETURN v_derivacion_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.derivar_postulacion(uuid, text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.derivar_postulacion(uuid, text) TO authenticated;


-- ============================================================
-- BLOQUE 2 — Sin la regla en las escrituras directas
-- Los triggers primero: la función no se puede borrar mientras un trigger la
-- use.
-- ============================================================

DROP TRIGGER IF EXISTS postulaciones_exigir_pre_entrevista ON public.postulaciones;
DROP TRIGGER IF EXISTS derivaciones_exigir_pre_entrevista ON public.derivaciones;

DROP FUNCTION IF EXISTS public.exigir_pre_entrevista_al_derivar_fn();


-- ============================================================
-- BLOQUE 3 — Sin postulacion_tiene_pre_entrevista_realizada()
-- Ya nada la llama: derivar_postulacion (BLOQUE 1) no la usa y la función del
-- BLOQUE 2 no existe más.
-- ============================================================

DROP FUNCTION IF EXISTS public.postulacion_tiene_pre_entrevista_realizada(uuid);
