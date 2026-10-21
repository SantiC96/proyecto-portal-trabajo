-- ============================================================
-- Portal Municipal de Empleo — Migración 057
-- Las invitaciones del postulante pasan a su propia pantalla: el aviso de
-- invitación apunta a /invitaciones
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_056_buscar_e_invitar_candidatos.sql ya aplicada.
-- Re-ejecutable sin errores. Solo cambia el link: los avisos 'invitacion_oferta'
-- ya creados y los emails de esos avisos que todavía no se enviaron pasan de
-- '/mis-postulaciones#invitaciones' a '/invitaciones'.
-- No cambia firmas ni tipos: no hace falta npm run db:tipos.
-- ============================================================
--
-- Ver docs/decisiones/028-buscar-e-invitar-postulantes.md (Actualización).
--
--   BLOQUE 1  invitaciones_oferta_avisos_fn(): la misma de 056 (BLOQUE 9b),
--             con el link '/invitaciones'. El trigger no cambia.
--   BLOQUE 2  Avisos y emails ya creados con el link anterior.
--
-- El email copia el link del aviso al encolarse (encolar_email, 048), así
-- que los pendientes de envío se actualizan acá. Los ya enviados quedan como
-- se mandaron; '/mis-postulaciones' sigue existiendo, así que ese link no da
-- error.


-- ============================================================
-- BLOQUE 1 — invitaciones_oferta_avisos_fn() con el link nuevo
-- ============================================================

CREATE OR REPLACE FUNCTION public.invitaciones_oferta_avisos_fn()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_usuario_id uuid;
  v_nombre     text;
  v_oferta     text;
  v_empresa    text;
  v_motivo     text;
BEGIN
  BEGIN
    SELECT
      p.usuario_id,
      COALESCE(NULLIF(pg_catalog.btrim(u.nombre || ' ' || u.apellido), ''), 'Un postulante'),
      o.titulo,
      NULLIF(pg_catalog.btrim(o.empresa_nombre), '')
    INTO v_usuario_id, v_nombre, v_oferta, v_empresa
    FROM public.postulantes p
    JOIN public.usuarios u ON u.id = p.usuario_id
    JOIN public.ofertas o  ON o.id = NEW.oferta_id
    WHERE p.id = NEW.postulante_id;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    IF TG_OP = 'INSERT' AND NEW.estado = 'pendiente' THEN
      PERFORM public.notificar_usuario(
        v_usuario_id,
        'invitacion_oferta',
        'Una oferta para vos',
        'La Oficina de Empleo te propone la oferta «' || v_oferta || '»'
          || COALESCE(' de ' || v_empresa, '')
          || '. Entrá para decirnos si te interesa.',
        '/invitaciones',
        'invitacion_oferta:' || NEW.id::text
      );

    ELSIF TG_OP = 'UPDATE'
          AND NEW.estado = 'rechazada'
          AND OLD.estado IS DISTINCT FROM 'rechazada' THEN
      v_motivo := pg_catalog.rtrim(pg_catalog.btrim(NEW.motivo_rechazo), '.');
      PERFORM public.notificar_oficina(
        'invitacion_rechazada',
        'Invitación no aceptada',
        v_nombre || ' no está interesado en la oferta «' || v_oferta || '».'
          || COALESCE(' Motivo: ' || NULLIF(v_motivo, '') || '.', ''),
        '/admin/ofertas/' || NEW.oferta_id::text || '/candidatos',
        'invitacion_rechazada:' || NEW.id::text
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'invitaciones_oferta_avisos_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.invitaciones_oferta_avisos_fn() FROM public, anon, authenticated;


-- ============================================================
-- BLOQUE 2 — Avisos y emails ya creados
-- ============================================================

UPDATE public.notificaciones
SET    link = '/invitaciones'
WHERE  tipo = 'invitacion_oferta'
  AND  link IS DISTINCT FROM '/invitaciones';

UPDATE public.emails_pendientes
SET    link = '/invitaciones'
WHERE  tipo = 'invitacion_oferta'
  AND  estado <> 'enviado'
  AND  link IS DISTINCT FROM '/invitaciones';


-- ============================================================
-- Verificación (opcional, en el SQL Editor)
-- ============================================================
-- Ningún aviso de invitación con el link anterior:
-- select link, count(*) from public.notificaciones
-- where tipo = 'invitacion_oferta' group by link;
--
-- Emails de invitación por enviar:
-- select estado, link, count(*) from public.emails_pendientes
-- where tipo = 'invitacion_oferta' group by estado, link;


-- ============================================================
-- ROLLBACK (comentado). Ejecutar a mano solo si hace falta volver atrás.
-- Vuelve a crear la función de 056 (BLOQUE 9b, link
-- '/mis-postulaciones#invitaciones') y devuelve el link anterior a los avisos
-- y emails pendientes.
-- ============================================================
--
-- -- (aquí: invitaciones_oferta_avisos_fn() de migration_056, BLOQUE 9b)
--
-- UPDATE public.notificaciones
-- SET    link = '/mis-postulaciones#invitaciones'
-- WHERE  tipo = 'invitacion_oferta'
--   AND  link = '/invitaciones';
--
-- UPDATE public.emails_pendientes
-- SET    link = '/mis-postulaciones#invitaciones'
-- WHERE  tipo = 'invitacion_oferta'
--   AND  estado <> 'enviado'
--   AND  link = '/invitaciones';
