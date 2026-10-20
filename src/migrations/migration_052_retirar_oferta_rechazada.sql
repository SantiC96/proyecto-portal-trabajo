-- ============================================================
-- Portal Municipal de Empleo — Migración 052
-- Retirar una oferta rechazada que tiene postulaciones
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_051_borradores_retiro_y_eliminacion_de_ofertas.sql ya
-- aplicada.
-- Re-ejecutable sin errores. No cambia datos ni la firma de ninguna función:
-- no hace falta correr npm run db:tipos.
-- ============================================================
--
-- Ver docs/decisiones/024-borradores-retiro-y-eliminacion-de-ofertas.md.
--
-- Caso: una oferta publicada con postulaciones que la empresa edita vuelve a
-- 'pendiente_aprobacion' (027) y, si la oficina la rechaza, queda
-- 'rechazada' con procesos abiertos. eliminar_oferta (051) no la acepta
-- porque tiene postulaciones, y retirar_oferta (051) no aceptaba ninguna
-- rechazada: esos candidatos quedaban sin cierre.
--
-- retirar_oferta: misma firma y mismo cuerpo que en la 051, salvo la regla
-- de 'rechazada':
--   rechazada con postulaciones   se retira como una pendiente o una activa
--                                 (oferta 'cerrada', procesos abiertos a
--                                 'oferta_retirada', avisos).
--   rechazada sin postulaciones   sigue sin retirarse: se elimina
--                                 (eliminar_oferta).
-- "Tiene postulaciones" es oferta_sin_postulaciones() (024), la misma
-- condición que usa eliminar_oferta: para cada rechazada vale exactamente
-- una de las dos bajas.
--
-- Pasar de 'rechazada' a 'cerrada' no dispara nada más en ofertas: el
-- UPDATE solo cambia estado y updated_at, así que el reset a revisión de
-- prevent_empresa_oferta_campos_fn (027) no corre (mira el contenido),
-- ofertas_notificar_revision_fn (043) no avisa al pasar a 'cerrada' y el
-- CHECK de eliminada_en (051) no aplica (la oferta no está eliminada).
-- procesos_abiertos_de_oferta y procesos_abiertos_ofertas_empresa (051) no
-- filtran por el estado de la oferta: el conteo del diálogo y lo que se
-- cierra son los mismos que para una activa. No cambian.
--
-- Errores (igual que 051):
--   42501  rol incorrecto ('No autorizado').
--   P0001  el estado no permite la acción; el mensaje es para el usuario.
-- ============================================================

CREATE OR REPLACE FUNCTION public.retirar_oferta(p_oferta_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_estado        public.estado_oferta;
  v_eliminada     timestamptz;
  v_titulo        text;
  v_empresa       text;
  v_derivaciones  int := 0;
  v_postulaciones int := 0;
  v_total         int;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'empresa' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT o.estado, o.eliminada_en, o.titulo, o.empresa_nombre
  INTO   v_estado, v_eliminada, v_titulo, v_empresa
  FROM   public.ofertas o
  JOIN   public.empresas e ON e.id = o.empresa_id
  WHERE  o.id = p_oferta_id
    AND  e.usuario_id = auth.uid()
  FOR UPDATE OF o;

  IF NOT FOUND OR v_eliminada IS NOT NULL THEN
    RAISE EXCEPTION 'No se encontró la oferta o no tenés permiso para retirarla.';
  END IF;

  IF v_estado = 'cerrada' THEN
    RAISE EXCEPTION 'La oferta ya está cerrada.';
  END IF;
  IF v_estado = 'borrador' THEN
    RAISE EXCEPTION 'Un borrador no está publicado: si no lo vas a usar, eliminalo.';
  END IF;
  IF v_estado = 'rechazada' AND public.oferta_sin_postulaciones(p_oferta_id) THEN
    RAISE EXCEPTION 'Una oferta rechazada sin postulaciones no se retira: podés corregirla o eliminarla.';
  END IF;
  IF v_estado NOT IN ('pendiente_aprobacion', 'activa', 'rechazada') THEN
    RAISE EXCEPTION 'No se puede retirar esta oferta.';
  END IF;

  -- Solo dura esta transacción: habilita el estado 'oferta_retirada' en los
  -- triggers de postulaciones y derivaciones (051, 10c).
  PERFORM pg_catalog.set_config('ftl.retiro_oferta', 'on', true);

  UPDATE public.ofertas o
  SET    estado     = 'cerrada',
         updated_at = now()
  WHERE  o.id = p_oferta_id;

  UPDATE public.derivaciones d
  SET    estado_empresa = 'oferta_retirada'
  WHERE  d.id IN (
    SELECT a.derivacion_id
    FROM public.procesos_abiertos_de_oferta(p_oferta_id) a
    WHERE a.derivacion_id IS NOT NULL
  );
  GET DIAGNOSTICS v_derivaciones = ROW_COUNT;

  UPDATE public.postulaciones po
  SET    estado     = 'oferta_retirada',
         updated_at = now()
  WHERE  po.id IN (
    SELECT a.postulacion_id
    FROM public.procesos_abiertos_de_oferta(p_oferta_id) a
    WHERE a.derivacion_id IS NULL
  );
  GET DIAGNOSTICS v_postulaciones = ROW_COUNT;

  PERFORM pg_catalog.set_config('ftl.retiro_oferta', 'off', true);

  v_total := v_derivaciones + v_postulaciones;

  BEGIN
    PERFORM public.notificar_oficina(
      'oferta_retirada',
      'Oferta retirada',
      COALESCE(NULLIF(pg_catalog.btrim(v_empresa), ''), 'Una empresa')
        || ' retiró la oferta «' || v_titulo || '».'
        || CASE
             WHEN v_total = 0 THEN ' No tenía procesos en curso.'
             WHEN v_total = 1 THEN ' Se cerró 1 proceso en curso.'
             ELSE ' Se cerraron ' || v_total::text || ' procesos en curso.'
           END,
      '/admin/ofertas/' || p_oferta_id::text,
      'oferta_retirada:' || p_oferta_id::text
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'retirar_oferta (aviso a la oficina): % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN v_total;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.retirar_oferta(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.retirar_oferta(uuid) TO authenticated;


-- ============================================================
-- ROLLBACK (comentado)
-- Vuelve a la regla de la 051: ninguna oferta rechazada se retira. Reemplazar
-- en la función de arriba estas dos condiciones y volver a ejecutar el
-- CREATE OR REPLACE con el REVOKE y el GRANT:
--
--   IF v_estado = 'rechazada' THEN
--     RAISE EXCEPTION 'Una oferta rechazada no está publicada: podés corregirla o eliminarla.';
--   END IF;
--   IF v_estado NOT IN ('pendiente_aprobacion', 'activa') THEN
--     RAISE EXCEPTION 'No se puede retirar esta oferta.';
--   END IF;
--
-- O directamente volver a ejecutar el CREATE OR REPLACE de retirar_oferta
-- del BLOQUE 10 (10e) de migration_051. Las ofertas rechazadas que ya se
-- retiraron quedan 'cerradas' con sus procesos en 'oferta_retirada': ese
-- estado no se revierte.
-- ============================================================
