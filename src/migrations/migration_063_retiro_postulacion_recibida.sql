-- ============================================================
-- Portal Municipal de Empleo — Migración 063
-- Retirar una postulación 'recibida' la deja retirada en lugar de borrarla
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_053_retiro_postulacion.sql ya aplicada.
-- Re-ejecutable sin errores. No cambia ninguna fila existente: las
-- postulaciones 'recibida' que ya se retiraron se borraron y no se recuperan.
-- No cambia firmas ni tipos: no hace falta npm run db:tipos.
-- ============================================================
--
-- Ver docs/decisiones/025-retiro-de-postulacion.md.
--
-- Hasta ahora, retirar una postulación 'recibida' borraba la fila (053): no
-- quedaba en el historial de nadie ni contaba en "Retiradas" (panel del
-- postulante, indicadores_postulante de 058, y el filtro de Mis
-- postulaciones). Desde esta migración queda en 'retirada_postulante' con
-- retirada_en, igual que una en revisión o derivada.
--
--   BLOQUE 1  Trigger postulaciones_notificar_retiro (053, BLOQUE 5c): no
--             avisa cuando la postulación estaba 'recibida'. Nadie la había
--             revisado, como antes (cuando se borraba, tampoco se avisaba).
--             La función postulaciones_notificar_retiro_fn no cambia: solo la
--             condición WHEN del trigger. En revisión y derivada avisan igual.
--   BLOQUE 2  retirar_postulacion(p_postulacion_id), misma firma, misma
--             seguridad (SECURITY DEFINER, search_path = '') y mismos
--             permisos. Con 'recibida' ya no hace DELETE: sigue el mismo
--             camino que 'en_revision' (marca ftl.retiro_postulacion, UPDATE
--             a 'retirada_postulante' con retirada_en y updated_at) y
--             devuelve 'retirada'. Ya no devuelve 'eliminada'.
--
-- Lo que NO cambia y por qué:
--   postulaciones_proteger_retiro_postulante (053, BLOQUE 4): con la marca
--     ftl.retiro_postulacion encendida deja pasar cualquier transición, sin
--     mirar el estado anterior. 'recibida' → 'retirada_postulante' ya está
--     permitido; después, el estado sigue sin poder cambiar.
--   Los demás triggers BEFORE UPDATE de postulaciones no miran este paso:
--     postulaciones_exigir_pre_entrevista (044) solo el paso a 'derivada';
--     postulaciones_proteger_oferta_retirada (051) solo 'oferta_retirada'.
--   Los AFTER UPDATE tampoco: postulaciones_notificar_no_seleccionada (041)
--     solo 'rechazada_municipalidad'; postulaciones_notificar_oferta_retirada
--     (051) solo 'oferta_retirada'.
--   Pre-entrevista: una 'recibida' no tiene (coordinarla la pasa a
--     'en_revision', 044); el UPDATE a 'cancelada' no afecta filas.
--   Derivación: una 'recibida' no tiene.
--   Volver a postularse: el índice único parcial postulaciones_vigente_unica
--     (053, BLOQUE 2) es WHERE retirada_en IS NULL. La retirada tiene
--     retirada_en, así que sale del índice y la postulación nueva (otra fila,
--     'recibida') entra sin conflicto. Las pantallas también usan
--     retirada_en IS NULL para "vigente".
--   La abre la oficina mientras el postulante la retira: abrirFicha y
--     marcarEnRevision actualizan con estado = 'recibida' en el WHERE.
--     retirar_postulacion bloquea la fila FOR UPDATE; el UPDATE de la oficina
--     espera, vuelve a evaluar el WHERE y no toca la retirada. Si la oficina
--     llega primero, el retiro ve 'en_revision' y avisa como siempre.
--   No es un rechazo (053): nada que cuente rechazos mira
--     'retirada_postulante'.
--   Indicadores de la oficina (047/061): el total de postulaciones cuenta
--     filas de postulaciones; las retiradas desde 'recibida' ahora quedan y
--     suman, igual que las retiradas en revisión. Las de la empresa no
--     cambian: una 'recibida' nunca llegó a la empresa.
-- ============================================================


-- ============================================================
-- BLOQUE 1 — Sin aviso al retirar una postulación 'recibida'
--
-- Misma condición que 053 más OLD.estado distinto de 'recibida'. Se compara
-- como texto, igual que en 053.
-- ============================================================

DROP TRIGGER IF EXISTS postulaciones_notificar_retiro ON public.postulaciones;
CREATE TRIGGER postulaciones_notificar_retiro
  AFTER UPDATE ON public.postulaciones
  FOR EACH ROW
  WHEN (NEW.estado::text = 'retirada_postulante'
        AND OLD.estado::text IS DISTINCT FROM 'retirada_postulante'
        AND OLD.estado::text IS DISTINCT FROM 'recibida')
  EXECUTE FUNCTION public.postulaciones_notificar_retiro_fn();


-- ============================================================
-- BLOQUE 2 — retirar_postulacion(p_postulacion_id)
--
-- Copia de 053 (BLOQUE 6) sin la rama que borraba la 'recibida'. Solo el
-- postulante dueño (rol 'postulante' y postulantes.usuario_id = auth.uid()).
-- Devuelve 'retirada' (quedó en 'retirada_postulante').
--
-- Bloqueos, en este orden (sin cambios):
--   1. la oferta FOR KEY SHARE: espera a un retirar_oferta() en curso.
--   2. la postulación FOR UPDATE.
--   3. la derivación FOR UPDATE, si estaba derivada.
--   El estado se lee después de bloquear.
--
-- La marca ftl.retiro_postulacion solo dura esta transacción y se apaga al
-- terminar los UPDATE.
-- ============================================================

CREATE OR REPLACE FUNCTION public.retirar_postulacion(p_postulacion_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_oferta_id         uuid;
  v_estado            public.estado_postulacion;
  v_derivacion_id     uuid;
  v_estado_derivacion public.estado_empresa;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'postulante' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  -- oferta_id no cambia: se puede leer antes de bloquear.
  SELECT po.oferta_id
  INTO   v_oferta_id
  FROM   public.postulaciones po
  JOIN   public.postulantes pt ON pt.id = po.postulante_id
  WHERE  po.id = p_postulacion_id
    AND  pt.usuario_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la postulación.';
  END IF;

  PERFORM 1
  FROM   public.ofertas o
  WHERE  o.id = v_oferta_id
  FOR KEY SHARE;

  SELECT po.estado
  INTO   v_estado
  FROM   public.postulaciones po
  WHERE  po.id = p_postulacion_id
  FOR UPDATE;

  -- Una 'recibida' retirada antes de 063 se borró.
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esta postulación ya fue retirada.';
  END IF;

  IF v_estado::text = 'retirada_postulante' THEN
    RAISE EXCEPTION 'Ya retiraste esta postulación.';
  END IF;

  IF v_estado::text = 'oferta_retirada' THEN
    RAISE EXCEPTION 'Esta postulación ya está cerrada porque la empresa retiró la oferta.';
  END IF;
  IF v_estado = 'rechazada_municipalidad' THEN
    RAISE EXCEPTION 'Esta postulación ya está cerrada y no se puede retirar.';
  END IF;
  IF v_estado NOT IN ('recibida', 'en_revision', 'derivada') THEN
    RAISE EXCEPTION 'Esta postulación no se puede retirar.';
  END IF;

  IF v_estado = 'derivada' THEN
    SELECT d.id, d.estado_empresa
    INTO   v_derivacion_id, v_estado_derivacion
    FROM   public.derivaciones d
    WHERE  d.postulacion_id = p_postulacion_id
    FOR UPDATE;

    IF v_estado_derivacion = 'contratado' THEN
      RAISE EXCEPTION 'Ya fuiste seleccionado para este puesto: la postulación no se puede retirar.';
    END IF;
    IF v_estado_derivacion::text = 'oferta_retirada' THEN
      RAISE EXCEPTION 'Esta postulación ya está cerrada porque la empresa retiró la oferta.';
    END IF;
    IF v_estado_derivacion IS NOT NULL
       AND v_estado_derivacion NOT IN ('pendiente', 'en_proceso') THEN
      RAISE EXCEPTION 'Esta postulación ya está cerrada y no se puede retirar.';
    END IF;
  END IF;

  PERFORM pg_catalog.set_config('ftl.retiro_postulacion', 'on', true);

  IF v_derivacion_id IS NOT NULL THEN
    UPDATE public.derivaciones d
    SET    estado_empresa = 'retirada_postulante'
    WHERE  d.id = v_derivacion_id;
  END IF;

  UPDATE public.pre_entrevistas pe
  SET    estado     = 'cancelada',
         updated_at = now()
  WHERE  pe.postulacion_id = p_postulacion_id
    AND  pe.estado = 'coordinada';

  -- El aviso a la oficina y a la empresa sale del trigger del BLOQUE 5c de
  -- 053; desde 'recibida' no avisa (BLOQUE 1).
  UPDATE public.postulaciones po
  SET    estado      = 'retirada_postulante',
         retirada_en = now(),
         updated_at  = now()
  WHERE  po.id = p_postulacion_id;

  PERFORM pg_catalog.set_config('ftl.retiro_postulacion', 'off', true);

  RETURN 'retirada';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.retirar_postulacion(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.retirar_postulacion(uuid) TO authenticated;


-- ============================================================
-- Verificación (opcional, en el SQL Editor)
-- ============================================================
-- La condición del trigger:
-- select pg_get_triggerdef(oid) from pg_trigger
-- where tgname = 'postulaciones_notificar_retiro';
--
-- La función ya no borra:
-- select position('DELETE' in prosrc) = 0 as sin_delete from pg_proc
-- where proname = 'retirar_postulacion';
--
-- Retiradas sin revisar (revisado_por NULL) desde esta migración:
-- select id, oferta_id, postulante_id, retirada_en from public.postulaciones
-- where estado = 'retirada_postulante' and revisado_por is null
-- order by retirada_en desc;


-- ============================================================
-- ROLLBACK (no se ejecuta; copiar y correr a mano si hace falta)
-- Re-ejecutar el BLOQUE 5c (solo el trigger) y el BLOQUE 6 de
-- migration_053_retiro_postulacion.sql. Las postulaciones que ya quedaron
-- retiradas desde 'recibida' siguen en el historial (no se borran).
-- ============================================================
