-- ============================================================
-- Portal Municipal de Empleo — Migración 043
-- Avisos nuevos para la oficina y link del aviso de oferta rechazada
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_042_empresas_email_confirmado.sql ya aplicada.
-- Re-ejecutable sin errores. No borra datos; el BLOQUE 3 solo corrige la
-- columna link de los avisos 'oferta_rechazada' ya creados.
-- ============================================================
--
--   BLOQUE 1  CHECK de tipos: suma 'postulacion_nueva' y 'necesita_curso'.
--   BLOQUE 2  ofertas_notificar_revision_fn (041): el aviso 'oferta_rechazada'
--             lleva a /empresa/ofertas/<id>/editar, donde la empresa corrige
--             y reenvía la oferta. Nada más cambia.
--   BLOQUE 3  Avisos 'oferta_rechazada' ya creados: mismo cambio de link.
--   BLOQUE 4  Aviso a la oficina por cada postulación nueva (AFTER INSERT ON
--             postulaciones). Retirar una postulación sigue sin avisar.
--   BLOQUE 5  estado_cursos_calculo(): la regla de "necesita curso" sin
--             control de rol, solo para uso interno. estado_cursos_postulantes
--             (035) pasa a reutilizarla con la misma firma y el mismo control
--             de rol, así la regla vive en un solo lugar.
--   BLOQUE 6  Aviso a la oficina cuando un rechazo deja al postulante
--             necesitando curso (AFTER UPDATE ON derivaciones).
--
-- Mismas reglas que 041: triggers AFTER filtrados con WHEN, cada función
-- atrapa sus errores (EXCEPTION WHEN OTHERS + RAISE WARNING) y usa clave
-- para no duplicar (notificar_oficina). Sin backfill de avisos.
-- Ver docs/decisiones/014-notificaciones.md.
-- ============================================================


-- ============================================================
-- BLOQUE 1 — Tipos de aviso
-- Reemplaza el CHECK de 041. Todas las filas existentes usan tipos de 041.
-- ============================================================

ALTER TABLE public.notificaciones DROP CONSTRAINT IF EXISTS notificaciones_tipo_check;
ALTER TABLE public.notificaciones
  ADD CONSTRAINT notificaciones_tipo_check
  CHECK (tipo IN (
    -- Oficina
    'contratacion',
    'empresa_pendiente',
    'oferta_pendiente',
    'curso_completado',
    'postulacion_nueva',
    'necesita_curso',
    -- Postulante
    'postulacion_derivada',
    'entrevista',
    'seleccionado',
    'no_seleccionado_empresa',
    'no_seleccionado_oficina',
    'curso_asignado',
    -- Empresa
    'solicitud_aprobada',
    'solicitud_rechazada',
    'oferta_aprobada',
    'oferta_rechazada',
    'candidato_derivado',
    'oferta_por_vencer',
    'oferta_vencida'
  ));


-- ============================================================
-- BLOQUE 2 — Link del aviso de oferta rechazada
-- Copia de la versión de 041; el único cambio es el link de 'oferta_rechazada'
-- (antes /empresa/ofertas/<id>, el detalle con los candidatos). El trigger
-- ofertas_notificar_revision (041) sigue apuntando a esta función.
-- ============================================================

CREATE OR REPLACE FUNCTION public.ofertas_notificar_revision_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_empresa_usuario uuid;
  v_motivo          text;
  v_marca           text;
BEGIN
  BEGIN
    IF NEW.estado = 'pendiente_aprobacion' THEN
      PERFORM public.notificar_oficina(
        'oferta_pendiente',
        'Oferta editada para revisar',
        COALESCE(NULLIF(pg_catalog.btrim(NEW.empresa_nombre), ''), 'Una empresa')
          || ' editó la oferta «' || NEW.titulo || '» y quedó pendiente de revisión.',
        '/admin/ofertas/' || NEW.id::text,
        'oferta_editada:' || NEW.id::text
          || ':' || public.notificaciones_marca(COALESCE(NEW.updated_at, now()))
      );
      RETURN NULL;
    END IF;

    IF OLD.estado IS DISTINCT FROM 'pendiente_aprobacion'
       OR NEW.estado NOT IN ('activa', 'rechazada')
       OR NEW.empresa_id IS NULL THEN
      RETURN NULL;
    END IF;

    SELECT e.usuario_id
    INTO v_empresa_usuario
    FROM public.empresas e
    WHERE e.id = NEW.empresa_id;

    v_marca := public.notificaciones_marca(COALESCE(NEW.revisado_en, now()));

    IF NEW.estado = 'activa' THEN
      PERFORM public.notificar_usuario(
        v_empresa_usuario,
        'oferta_aprobada',
        'Oferta aprobada',
        'La Oficina de Empleo aprobó tu oferta «' || NEW.titulo || '». Ya está publicada en el portal'
          || COALESCE(' hasta el ' || public.notificaciones_fecha(NEW.vence_en), '') || '.',
        '/empresa/ofertas/' || NEW.id::text,
        'oferta_aprobada:' || NEW.id::text || ':' || v_marca
      );
    ELSE
      v_motivo := NULLIF(pg_catalog.btrim(NEW.motivo_rechazo), '');
      PERFORM public.notificar_usuario(
        v_empresa_usuario,
        'oferta_rechazada',
        'Oferta rechazada',
        'La Oficina de Empleo rechazó tu oferta «' || NEW.titulo || '».'
          || COALESCE(' Motivo: ' || v_motivo, '')
          || ' Podés corregirla y enviarla de nuevo.',
        '/empresa/ofertas/' || NEW.id::text || '/editar',
        'oferta_rechazada:' || NEW.id::text || ':' || v_marca
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ofertas_notificar_revision_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;


-- ============================================================
-- BLOQUE 3 — Avisos 'oferta_rechazada' ya creados
-- Corrección de datos, no un cambio de esquema: solo se actualiza la columna
-- link, y solo en los avisos 'oferta_rechazada' que todavía tienen el link
-- viejo exacto (/empresa/ofertas/<uuid>). No toca título, mensaje, clave,
-- leida_en ni ningún otro tipo de aviso, y no borra filas. Re-ejecutarlo no
-- cambia nada: los links ya corregidos terminan en /editar y no coinciden con
-- el patrón. El nuevo link respeta notificaciones_link_check (038).
-- ============================================================

UPDATE public.notificaciones n
SET link = n.link || '/editar'
WHERE n.tipo = 'oferta_rechazada'
  AND n.link ~ '^/empresa/ofertas/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';


-- ============================================================
-- BLOQUE 4 — Postulación nueva (AFTER INSERT ON postulaciones)
--   Oficina  'postulacion_nueva'  clave postulacion_nueva:<postulacion_id>
-- La inserta el postulante; el BEFORE INSERT de 036 ya validó que la oferta
-- esté vigente. Retirar una postulación es un DELETE: no hay trigger de
-- DELETE y no se avisa a nadie.
-- ============================================================

CREATE OR REPLACE FUNCTION public.postulaciones_notificar_alta_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_postulante text;
  v_oferta     text;
  v_empresa    text;
BEGIN
  BEGIN
    SELECT
      pg_catalog.btrim(u.nombre || ' ' || u.apellido),
      o.titulo,
      NULLIF(pg_catalog.btrim(o.empresa_nombre), '')
    INTO v_postulante, v_oferta, v_empresa
    FROM public.ofertas o
    JOIN public.postulantes pt ON pt.id = NEW.postulante_id
    JOIN public.usuarios u     ON u.id  = pt.usuario_id
    WHERE o.id = NEW.oferta_id;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    PERFORM public.notificar_oficina(
      'postulacion_nueva',
      'Nueva postulación',
      v_postulante || ' se postuló a «' || v_oferta || '»'
        || COALESCE(' de ' || v_empresa, '') || '.',
      '/admin/postulaciones/' || NEW.id::text,
      'postulacion_nueva:' || NEW.id::text
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'postulaciones_notificar_alta_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS postulaciones_notificar_alta ON public.postulaciones;
CREATE TRIGGER postulaciones_notificar_alta
  AFTER INSERT ON public.postulaciones
  FOR EACH ROW EXECUTE FUNCTION public.postulaciones_notificar_alta_fn();


-- ============================================================
-- BLOQUE 5 — Regla de cursos en un solo lugar
--
-- estado_cursos_calculo(): el cálculo de estado_cursos_postulantes (035),
-- sin el control de rol, para que lo usen los triggers (que no corren con el
-- rol de la oficina). Mismo cuerpo que 035: necesita curso con umbral o más
-- rechazos (parametros_cursos) en los últimos ventana_dias días, posteriores
-- al último curso completado, y sin asignación activa.
-- Sin EXECUTE para los roles del cliente: solo la llaman funciones SECURITY
-- DEFINER (corren como dueño).
--
-- estado_cursos_postulantes(): misma firma, mismo retorno y mismo control de
-- rol; ahora devuelve lo que calcula estado_cursos_calculo(). Las funciones
-- de 035 y 039 que la usan no cambian.
-- ============================================================

CREATE OR REPLACE FUNCTION public.estado_cursos_calculo(p_postulante_ids uuid[])
RETURNS TABLE (
  postulante_id            uuid,
  rechazos_ventana         bigint,
  rechazos_totales         bigint,
  necesita_curso           boolean,
  asignacion_activa_id     uuid,
  asignacion_activa_estado text,
  ultima_asignacion_estado text,
  ultimo_completado_en     timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  WITH parametros AS (
    SELECT pc.umbral_rechazos, pc.ventana_dias
    FROM public.parametros_cursos() pc
  ),
  base AS (
    SELECT p.id AS pid
    FROM public.postulantes p
    WHERE p_postulante_ids IS NULL OR p.id = ANY (p_postulante_ids)
  ),
  completados AS (
    SELECT ac.postulante_id AS pid, MAX(ac.completado_en) AS ultimo
    FROM public.asignaciones_curso ac
    JOIN base b ON b.pid = ac.postulante_id
    WHERE ac.estado = 'completado'
    GROUP BY ac.postulante_id
  ),
  activas AS (
    SELECT ac.postulante_id AS pid, ac.id AS asignacion_id, ac.estado AS estado
    FROM public.asignaciones_curso ac
    JOIN base b ON b.pid = ac.postulante_id
    WHERE ac.estado IN ('asignado', 'en_curso')
  ),
  ultimas AS (
    SELECT DISTINCT ON (ac.postulante_id)
      ac.postulante_id AS pid, ac.estado AS estado
    FROM public.asignaciones_curso ac
    JOIN base b ON b.pid = ac.postulante_id
    ORDER BY ac.postulante_id, ac.created_at DESC, ac.id DESC
  ),
  rechazos AS (
    SELECT
      po.postulante_id AS pid,
      COALESCE(d.fecha_respuesta, d.updated_at) AS fecha
    FROM public.derivaciones d
    JOIN public.postulaciones po ON po.id = d.postulacion_id
    JOIN base b ON b.pid = po.postulante_id
    WHERE d.estado_empresa = 'rechazado'
  ),
  conteos AS (
    SELECT
      r.pid,
      COUNT(*) AS totales,
      COUNT(*) FILTER (
        WHERE r.fecha >= now() - pg_catalog.make_interval(days => par.ventana_dias)
          AND (c.ultimo IS NULL OR r.fecha > c.ultimo)
      ) AS en_ventana
    FROM rechazos r
    CROSS JOIN parametros par
    LEFT JOIN completados c ON c.pid = r.pid
    GROUP BY r.pid
  )
  SELECT
    b.pid                                       AS postulante_id,
    COALESCE(ct.en_ventana, 0)::bigint          AS rechazos_ventana,
    COALESCE(ct.totales, 0)::bigint             AS rechazos_totales,
    (COALESCE(ct.en_ventana, 0) >= par.umbral_rechazos AND a.asignacion_id IS NULL)
                                                AS necesita_curso,
    a.asignacion_id                             AS asignacion_activa_id,
    a.estado                                    AS asignacion_activa_estado,
    u.estado                                    AS ultima_asignacion_estado,
    c.ultimo                                    AS ultimo_completado_en
  FROM base b
  CROSS JOIN parametros par
  LEFT JOIN conteos ct    ON ct.pid = b.pid
  LEFT JOIN activas a     ON a.pid  = b.pid
  LEFT JOIN ultimas u     ON u.pid  = b.pid
  LEFT JOIN completados c ON c.pid  = b.pid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.estado_cursos_calculo(uuid[])
  FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.estado_cursos_postulantes(p_postulante_ids uuid[] DEFAULT NULL)
RETURNS TABLE (
  postulante_id            uuid,
  rechazos_ventana         bigint,
  rechazos_totales         bigint,
  necesita_curso           boolean,
  asignacion_activa_id     uuid,
  asignacion_activa_estado text,
  ultima_asignacion_estado text,
  ultimo_completado_en     timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'municipalidad' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    e.postulante_id,
    e.rechazos_ventana,
    e.rechazos_totales,
    e.necesita_curso,
    e.asignacion_activa_id,
    e.asignacion_activa_estado,
    e.ultima_asignacion_estado,
    e.ultimo_completado_en
  FROM public.estado_cursos_calculo(p_postulante_ids) e;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.estado_cursos_postulantes(uuid[]) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.estado_cursos_postulantes(uuid[]) TO authenticated;


-- ============================================================
-- BLOQUE 6 — Postulante que necesita curso (AFTER UPDATE ON derivaciones)
--   Oficina  'necesita_curso'
--            clave necesita_curso:<postulante_id>:<último curso completado>
--            (marca en milisegundos de ultimo_completado_en, o 0 si nunca
--            completó uno).
-- Se evalúa cada vez que una derivación pasa a 'rechazado' (lo marque la
-- empresa o lo corrija la oficina). Si después de ese rechazo el postulante
-- necesita curso, se avisa. La clave hace que haya un solo aviso por ciclo:
-- el 4.º o 5.º rechazo dan la misma clave y no avisan de nuevo; cuando
-- completa un curso cambia la marca y el próximo ciclo vuelve a avisar.
-- Un postulante que ya necesitaba curso antes de esta migración recibe su
-- aviso con el próximo rechazo (sin backfill).
-- ============================================================

CREATE OR REPLACE FUNCTION public.derivaciones_notificar_necesita_curso_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_postulante_id uuid;
  v_postulante    text;
  v_necesita      boolean;
  v_rechazos      bigint;
  v_ultimo        timestamptz;
BEGIN
  BEGIN
    SELECT po.postulante_id, pg_catalog.btrim(u.nombre || ' ' || u.apellido)
    INTO v_postulante_id, v_postulante
    FROM public.postulaciones po
    JOIN public.postulantes pt ON pt.id = po.postulante_id
    JOIN public.usuarios u     ON u.id  = pt.usuario_id
    WHERE po.id = NEW.postulacion_id;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    SELECT e.necesita_curso, e.rechazos_ventana, e.ultimo_completado_en
    INTO v_necesita, v_rechazos, v_ultimo
    FROM public.estado_cursos_calculo(ARRAY[v_postulante_id]) e;

    IF v_necesita IS DISTINCT FROM true THEN
      RETURN NULL;
    END IF;

    PERFORM public.notificar_oficina(
      'necesita_curso',
      'Postulante necesita curso',
      v_postulante || ' tiene ' || v_rechazos::text || ' rechazos recientes y necesita un curso.',
      '/admin/postulantes/' || v_postulante_id::text,
      'necesita_curso:' || v_postulante_id::text
        || ':' || COALESCE(public.notificaciones_marca(v_ultimo), '0')
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'derivaciones_notificar_necesita_curso_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS derivaciones_notificar_necesita_curso ON public.derivaciones;
CREATE TRIGGER derivaciones_notificar_necesita_curso
  AFTER UPDATE ON public.derivaciones
  FOR EACH ROW
  WHEN (NEW.estado_empresa = 'rechazado'
        AND OLD.estado_empresa IS DISTINCT FROM 'rechazado')
  EXECUTE FUNCTION public.derivaciones_notificar_necesita_curso_fn();
