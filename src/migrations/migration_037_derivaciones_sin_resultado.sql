-- ============================================================
-- Portal Municipal de Empleo — Migración 037
-- Recordatorio de contratación: derivaciones sin resultado
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_036_vencimiento_ofertas.sql ya aplicada.
-- Re-ejecutable sin errores. No modifica tablas, datos ni políticas.
-- ============================================================
--
-- Una derivación queda "sin resultado" cuando su entrevista pasó hace más
-- de N días y estado_empresa sigue en 'pendiente' o 'en_proceso'. N es la
-- constante DIAS_SIN_RESULTADO de src/lib/derivacion-estados.ts (3) y llega
-- como parámetro, para que el número viva en un solo lugar.
--
--   - derivaciones_sin_resultado_empresa(p_dias): la empresa necesita esta
--     función porque no puede leer postulaciones (decisión 007) y por lo
--     tanto no puede saber a qué oferta pertenece cada derivación. Devuelve
--     solo derivaciones de SUS ofertas, con el nombre y apellido del
--     candidato (los mismos datos que ya ve con candidato_para_empresa).
--     Nunca nota_municipalidad, DNI ni domicilio.
--   - La oficina lee derivaciones directamente (RLS de migration_018), así
--     que su contador y su filtro no necesitan funciones nuevas.
--   - Índice parcial para las dos consultas.
-- ============================================================


CREATE OR REPLACE FUNCTION public.derivaciones_sin_resultado_empresa(p_dias int)
RETURNS TABLE (
  derivacion_id    uuid,
  oferta_id        uuid,
  oferta_titulo    text,
  postulante_id    uuid,
  nombre           text,
  apellido         text,
  estado_empresa   public.estado_empresa,
  fecha_entrevista timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT
    d.id               AS derivacion_id,
    o.id               AS oferta_id,
    o.titulo           AS oferta_titulo,
    po.postulante_id,
    u.nombre,
    u.apellido,
    d.estado_empresa,
    d.fecha_entrevista
  FROM public.derivaciones d
  JOIN public.postulaciones po ON po.id = d.postulacion_id
  JOIN public.ofertas o        ON o.id  = po.oferta_id
  JOIN public.empresas e       ON e.id  = o.empresa_id
  JOIN public.postulantes pt   ON pt.id = po.postulante_id
  JOIN public.usuarios u       ON u.id  = pt.usuario_id
  WHERE e.usuario_id = auth.uid()
    AND public.rol_actual()::text = 'empresa'
    AND d.estado_empresa IN ('pendiente', 'en_proceso')
    AND d.fecha_entrevista IS NOT NULL
    AND d.fecha_entrevista < now() - pg_catalog.make_interval(days => GREATEST(COALESCE(p_dias, 0), 0))
  ORDER BY d.fecha_entrevista ASC, d.id ASC
$$;

REVOKE EXECUTE ON FUNCTION public.derivaciones_sin_resultado_empresa(int) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.derivaciones_sin_resultado_empresa(int) TO authenticated;


CREATE INDEX IF NOT EXISTS idx_derivaciones_abiertas_fecha_entrevista
  ON public.derivaciones (fecha_entrevista)
  WHERE estado_empresa IN ('pendiente', 'en_proceso');
