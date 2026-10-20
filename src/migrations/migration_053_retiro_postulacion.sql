-- ============================================================
-- Portal Municipal de Empleo — Migración 053
-- El postulante retira su postulación en cualquier momento (salvo si ya fue
-- seleccionado) y puede volver a postularse
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_052_retirar_oferta_rechazada.sql ya aplicada.
-- Re-ejecutable sin errores. No cambia el estado de ninguna fila existente:
-- la columna nueva queda en NULL y la restricción única se reemplaza por un
-- índice equivalente para todas las filas actuales.
-- Después de aplicarla: npm run db:tipos
-- ============================================================
--
-- Ver docs/decisiones/025-retiro-de-postulacion.md.
--
--   BLOQUE 1  Estado 'retirada_postulante' en estado_postulacion y
--             estado_empresa. NO es un rechazo.
--   BLOQUE 2  postulaciones.retirada_en y la restricción única: una sola
--             postulación vigente (no retirada) por oferta y postulante. La
--             retirada queda en el historial y volver a postularse es una
--             fila nueva.
--   BLOQUE 3  Pre-entrevista 'cancelada': la que estaba coordinada cuando el
--             postulante se retiró.
--   BLOQUE 4  Protección del estado nuevo (marca de transacción
--             ftl.retiro_postulacion, solo la fija retirar_postulacion()):
--             postulaciones (trigger nuevo) y derivaciones
--             (derivaciones_empresa_update_fn de 051, misma firma).
--   BLOQUE 5  Avisos: tipos nuevos en el CHECK, email a la empresa y el
--             trigger que avisa a la empresa y a la oficina.
--   BLOQUE 6  retirar_postulacion(p_postulacion_id).
--
-- Reglas del retiro (BLOQUE 6):
--   recibida                        se borra la fila, como antes (nadie la
--                                   revisó todavía; no se avisa a nadie).
--   en_revision                     la postulación pasa a
--                                   'retirada_postulante' con retirada_en;
--                                   la pre-entrevista coordinada se cancela.
--                                   Aviso a la oficina.
--   derivada, derivación abierta    igual, y la derivación ('pendiente' o
--   ('pendiente' / 'en_proceso')    'en_proceso', con o sin entrevista
--                                   coordinada) pasa a 'retirada_postulante'.
--                                   Aviso a la oficina y a la empresa (con
--                                   email).
--   derivada, contratado            no se puede ('Ya fuiste seleccionado').
--   rechazada_municipalidad,        no se puede: el proceso ya está cerrado.
--   derivada + rechazado,
--   oferta_retirada (postulación o
--   derivación), retirada_postulante
--
-- No cuenta como rechazo, sin tocar ninguna función: todas las que cuentan
-- rechazos filtran por 'rechazado' / 'rechazada_municipalidad' y
-- 'retirada_postulante' es un valor propio, igual que 'oferta_retirada' (051):
--   estado_cursos_calculo (046)          regla de 3 rechazos en 90 días:
--                                        derivaciones 'rechazado'. La usan
--                                        estado_cursos_postulantes,
--                                        rechazos_desde_ultimo_curso,
--                                        rechazos_por_postulantes,
--                                        contar_postulantes_esperando_curso,
--                                        postulantes_esperando_curso_ids y
--                                        los triggers de cursos (043/046).
--   postulaciones_no_seleccionadas (038) 'rechazada_municipalidad' o
--                                        derivación 'rechazado'.
--   indicadores_portal (047)             rechazos de empresas 'rechazado';
--                                        no seleccionados de la oficina
--                                        'rechazada_municipalidad'.
--   indicadores_empresa e                no_seleccionados 'rechazado';
--   indicadores_por_oferta_empresa       seleccionados y cobertura
--   (049/051)                            'contratado'.
-- Volver a postularse no cuenta dos veces una oferta: para tener dos
-- postulaciones a la misma oferta la primera tiene que estar retirada, y una
-- retirada nunca está en 'rechazado' (el retiro solo sale de un proceso
-- abierto y después el estado no cambia, BLOQUE 4). Como mucho la nueva
-- cuenta una vez.
-- Los indicadores no se rompen con dos postulaciones a una oferta: cuentan
-- filas de postulaciones y derivaciones (cada postulación y cada derivación
-- es un hecho distinto) y ninguno asume una por postulante.
--
-- Funciones existentes que se reemplazan (CREATE OR REPLACE, misma firma):
-- pre_entrevistas_transicion_fn (044), derivaciones_empresa_update_fn (051),
-- email_tipo_con_envio (051).
-- Funciones que NO cambian y por qué:
--   derivar_postulacion (045)    con la postulación retirada, el UPDATE a
--                                'derivada' lo rechaza el trigger del
--                                BLOQUE 4 y la transacción se revierte.
--   coordinar/reprogramar/       solo aceptan postulaciones 'recibida' o
--   registrar_resultado_         'en_revision' (bloquear_pre_entrevista,
--   pre_entrevista (044)         044).
--   procesos_abiertos_de_oferta  filtra 'recibida' / 'en_revision' /
--   y retirar_oferta (051/052)   'derivada' y derivaciones abiertas: una
--                                retirada no se vuelve a cerrar.
--   oferta_acepta_postulaciones, la política de INSERT y el trigger
--   postulaciones_oferta_vigente_fn (036): volver a postularse pasa por las
--                                mismas reglas que la primera vez.
--   postulaciones_notificar_alta_fn (043) y postulaciones_encolar_email_fn
--   (048): la postulación nueva es otra fila, con otra clave de aviso.
--   oferta_sin_postulaciones (024): una retirada sigue siendo una
--                                postulación, así que la oferta no se puede
--                                eliminar (se retira), como antes.
--
-- Los valores nuevos de los enums se agregan en la misma transacción en que
-- se usan (igual que 051): solo aparecen dentro de funciones plpgsql y en
-- comparaciones como texto (::text), nunca en un CHECK, un índice, un WHEN
-- con el literal del enum ni una función LANGUAGE sql.
--
-- Errores (igual que 051):
--   42501  rol incorrecto ('No autorizado').
--   P0001  el estado no permite la acción; el mensaje es para el usuario.
-- ============================================================


-- ============================================================
-- BLOQUE 1 — Estado 'retirada_postulante'
--
--   estado_postulacion  el postulante retiró una postulación que la oficina
--                       ya estaba revisando o que ya estaba derivada.
--   estado_empresa      la derivación abierta de esa postulación ('pendiente'
--                       o 'en_proceso') quedó cerrada por el retiro.
-- A diferencia de 'oferta_retirada', la postulación derivada también cambia
-- de estado: así "retirada" se lee de la postulación sin mirar la derivación.
-- Solo lo escribe retirar_postulacion() (BLOQUE 6).
-- ============================================================

ALTER TYPE public.estado_postulacion ADD VALUE IF NOT EXISTS 'retirada_postulante';
ALTER TYPE public.estado_empresa     ADD VALUE IF NOT EXISTS 'retirada_postulante';


-- ============================================================
-- BLOQUE 2 — retirada_en y una sola postulación vigente
--
-- retirada_en: cuándo el postulante retiró la postulación (NULL = vigente).
-- Va junto con estado 'retirada_postulante' (las dos las escribe
-- retirar_postulacion); el índice usa la columna y no el literal del enum,
-- que no se puede usar en la misma transacción en que se agrega.
-- No está en ningún grant: authenticated solo inserta (oferta_id,
-- postulante_id) y actualiza (estado, nota_oficina, revisado_por,
-- updated_at) (018).
--
-- La restricción UNIQUE (oferta_id, postulante_id) de 001 se reemplaza por un
-- índice único parcial WHERE retirada_en IS NULL: puede haber varias
-- retiradas y una sola vigente. Hoy todas las filas tienen retirada_en NULL,
-- así que el índice nuevo exige exactamente lo mismo que la restricción. El
-- bloque verifica antes que no haya duplicados (no puede haberlos con la
-- restricción vigente; si los hubiera, la migración se aborta sin cambiar
-- nada). Nada usa la restricción en un ON CONFLICT ni en una FK.
--
-- postulaciones_oferta_idx: la restricción también servía para buscar por
-- oferta_id (procesos_abiertos_de_oferta, oferta_sin_postulaciones, conteos
-- por oferta); el índice parcial no sirve para consultas que incluyen las
-- retiradas.
-- ============================================================

ALTER TABLE public.postulaciones
  ADD COLUMN IF NOT EXISTS retirada_en timestamptz;

DO $$
DECLARE
  v_duplicados int;
  v_restriccion text;
BEGIN
  SELECT pg_catalog.count(*)::int INTO v_duplicados
  FROM (
    SELECT po.oferta_id, po.postulante_id
    FROM public.postulaciones po
    WHERE po.retirada_en IS NULL
    GROUP BY po.oferta_id, po.postulante_id
    HAVING pg_catalog.count(*) > 1
  ) d;

  IF v_duplicados > 0 THEN
    RAISE EXCEPTION
      'Hay % par(es) oferta/postulante con más de una postulación vigente. No se cambió nada. Consulta: '
      'SELECT oferta_id, postulante_id, count(*) FROM public.postulaciones WHERE retirada_en IS NULL '
      'GROUP BY 1, 2 HAVING count(*) > 1;',
      v_duplicados;
  END IF;

  CREATE UNIQUE INDEX IF NOT EXISTS postulaciones_vigente_unica
    ON public.postulaciones (oferta_id, postulante_id)
    WHERE retirada_en IS NULL;

  -- Nombre de la restricción de 001 (por defecto
  -- postulaciones_oferta_id_postulante_id_key): se busca por columnas.
  FOR v_restriccion IN
    SELECT c.conname
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.postulaciones'::regclass
      AND c.contype  = 'u'
      AND (
        SELECT pg_catalog.array_agg(a.attname::text ORDER BY a.attname)
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum   = ANY (c.conkey)
      ) = ARRAY['oferta_id', 'postulante_id']
  LOOP
    EXECUTE pg_catalog.format('ALTER TABLE public.postulaciones DROP CONSTRAINT %I', v_restriccion);
  END LOOP;
END;
$$;

CREATE INDEX IF NOT EXISTS postulaciones_oferta_idx
  ON public.postulaciones (oferta_id);


-- ============================================================
-- BLOQUE 3 — Pre-entrevista 'cancelada'
--
-- Hoy una pre-entrevista es 'coordinada', 'realizada' o 'no_asistio' (044) y
-- solo se gestiona con la postulación en 'recibida' o 'en_revision'. Si el
-- postulante se retira con una pre-entrevista coordinada (con la fecha por
-- venir o con la fecha pasada sin resultado cargado), la oficina ya no podría
-- registrar el resultado ni reprogramarla y seguiría viéndola "coordinada".
-- Pasa a 'cancelada': un estado final que solo pone retirar_postulacion().
-- Las realizadas y las de "no asistió" quedan como están (ya tienen
-- resultado). No se avisa al postulante (fue su acción).
--
-- La columna es text con CHECK (no un enum): el valor nuevo se usa en esta
-- misma migración sin problema. pre_entrevistas_transicion_fn (044), misma
-- firma: copia de 044 con las reglas de 'cancelada' al principio.
--   coordinada → cancelada  solo con la marca ftl.retiro_postulacion (o sin
--                           rol, desde el SQL Editor).
--   cancelada → otro        nunca (como 'realizada', aplica a todos).
-- Los avisos de pre-entrevista (044) solo disparan con estado 'coordinada'.
-- ============================================================

ALTER TABLE public.pre_entrevistas DROP CONSTRAINT IF EXISTS pre_entrevistas_estado_check;
ALTER TABLE public.pre_entrevistas
  ADD CONSTRAINT pre_entrevistas_estado_check
  CHECK (estado IN ('coordinada', 'realizada', 'no_asistio', 'cancelada'));

CREATE OR REPLACE FUNCTION public.pre_entrevistas_transicion_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF NEW.postulacion_id IS DISTINCT FROM OLD.postulacion_id THEN
    RAISE EXCEPTION 'No se puede cambiar la postulación de una pre-entrevista.';
  END IF;

  -- ── Cancelada por el retiro de la postulación (migration_053) ──────────────
  IF OLD.estado = 'cancelada' THEN
    IF NEW.estado IS DISTINCT FROM OLD.estado
       OR NEW.fecha_hora IS DISTINCT FROM OLD.fecha_hora
       OR NEW.lugar IS DISTINCT FROM OLD.lugar THEN
      RAISE EXCEPTION 'La pre-entrevista quedó cancelada porque el postulante retiró la postulación.';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.estado = 'cancelada' THEN
    IF OLD.estado IS DISTINCT FROM 'coordinada' THEN
      RAISE EXCEPTION 'Solo se cancela una pre-entrevista coordinada.';
    END IF;
    IF public.rol_actual() IS NOT NULL
       AND pg_catalog.current_setting('ftl.retiro_postulacion', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'Una pre-entrevista se cancela solo cuando el postulante retira la postulación.';
    END IF;
    IF NEW.fecha_hora IS DISTINCT FROM OLD.fecha_hora OR NEW.lugar IS DISTINCT FROM OLD.lugar THEN
      RAISE EXCEPTION 'Al cancelar una pre-entrevista no se cambia la fecha ni el lugar.';
    END IF;
    RETURN NEW;
  END IF;

  -- ── Resto: igual que 044 ───────────────────────────────────────────────────
  IF NEW.estado = OLD.estado THEN
    IF NEW.estado <> 'coordinada'
       AND (NEW.fecha_hora IS DISTINCT FROM OLD.fecha_hora
            OR NEW.lugar IS DISTINCT FROM OLD.lugar) THEN
      RAISE EXCEPTION 'Solo se puede cambiar la fecha o el lugar de una pre-entrevista coordinada.';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.estado = 'realizada' THEN
    RAISE EXCEPTION 'La pre-entrevista ya se realizó y no se puede modificar.';
  END IF;

  IF NOT (
       (OLD.estado = 'coordinada' AND NEW.estado IN ('realizada', 'no_asistio'))
    OR (OLD.estado = 'no_asistio' AND NEW.estado = 'coordinada')
  ) THEN
    RAISE EXCEPTION 'La pre-entrevista no puede pasar de «%» a «%».', OLD.estado, NEW.estado;
  END IF;

  RETURN NEW;
END;
$$;


-- ============================================================
-- BLOQUE 4 — Protección del estado nuevo
--
-- Solo retirar_postulacion() (BLOQUE 6) pasa una postulación o una derivación
-- a 'retirada_postulante' (marca de transacción ftl.retiro_postulacion, que
-- solo fija esa función) y ese estado no cambia después: ni la oficina
-- (derivar, descartar, reconsiderar, corregir el estado de la empresa) ni la
-- empresa (coordinar, seleccionar, rechazar) pueden tocarlo. Sin rol (SQL
-- Editor) se permite, para correcciones manuales. Mismo patrón que
-- 'oferta_retirada' (051, BLOQUE 10c).
--
-- postulaciones: trigger nuevo postulaciones_proteger_retiro_postulante.
--   También protege retirada_en (ningún grant la incluye; esto cubre a las
--   funciones SECURITY DEFINER que corren con el rol del usuario).
-- derivaciones: derivaciones_empresa_update_fn (051), misma firma, con una
--   rama para 'retirada_postulante' igual a la de 'oferta_retirada'. El resto
--   es copia de 051.
-- ============================================================

CREATE OR REPLACE FUNCTION public.postulaciones_proteger_retiro_postulante_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF public.rol_actual() IS NULL
     OR pg_catalog.current_setting('ftl.retiro_postulacion', true) IS NOT DISTINCT FROM 'on' THEN
    RETURN NEW;
  END IF;

  IF OLD.estado::text = 'retirada_postulante' THEN
    RAISE EXCEPTION 'El postulante retiró esta postulación y ya no se puede modificar.';
  END IF;

  IF NEW.estado::text = 'retirada_postulante' THEN
    RAISE EXCEPTION 'Una postulación pasa a «Retirada» solo cuando el postulante la retira.';
  END IF;

  IF NEW.retirada_en IS DISTINCT FROM OLD.retirada_en THEN
    RAISE EXCEPTION 'La fecha de retiro la registra el sistema.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.postulaciones_proteger_retiro_postulante_fn()
  FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS postulaciones_proteger_retiro_postulante ON public.postulaciones;
CREATE TRIGGER postulaciones_proteger_retiro_postulante
  BEFORE UPDATE ON public.postulaciones
  FOR EACH ROW
  WHEN (NEW.estado IS DISTINCT FROM OLD.estado
        OR NEW.retirada_en IS DISTINCT FROM OLD.retirada_en)
  EXECUTE FUNCTION public.postulaciones_proteger_retiro_postulante_fn();

-- derivaciones: copia de 051 con la rama de 'retirada_postulante' al principio.
CREATE OR REPLACE FUNCTION public.derivaciones_empresa_update_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_rol            text    := public.rol_actual()::text;
  v_retiro         boolean := pg_catalog.current_setting('ftl.retiro_oferta', true) IS NOT DISTINCT FROM 'on';
  v_retiro_postul  boolean := pg_catalog.current_setting('ftl.retiro_postulacion', true) IS NOT DISTINCT FROM 'on';
BEGIN
  -- ── Cierre porque el postulante se retiró (migration_053) ───────────────────
  IF OLD.estado_empresa::text = 'retirada_postulante' OR NEW.estado_empresa::text = 'retirada_postulante' THEN
    IF NEW.estado_empresa IS DISTINCT FROM OLD.estado_empresa THEN
      IF v_rol IS NOT NULL AND NOT v_retiro_postul THEN
        IF OLD.estado_empresa::text = 'retirada_postulante' THEN
          RAISE EXCEPTION 'El candidato retiró su postulación y el proceso quedó cerrado.';
        END IF;
        RAISE EXCEPTION 'Un proceso se cierra por retiro solo cuando el postulante retira su postulación.';
      END IF;
      IF NEW.estado_empresa::text = 'retirada_postulante' THEN
        IF OLD.estado_empresa::text NOT IN ('pendiente', 'en_proceso') THEN
          RAISE EXCEPTION 'Este proceso ya tiene un estado final y no puede modificarse.';
        END IF;
        NEW.fecha_respuesta := now();
      END IF;
    ELSIF v_rol IS NOT NULL THEN
      RAISE EXCEPTION 'El candidato retiró su postulación y el proceso quedó cerrado.';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- ── Cierre por oferta retirada (migration_051) ──────────────────────────────
  IF OLD.estado_empresa::text = 'oferta_retirada' OR NEW.estado_empresa::text = 'oferta_retirada' THEN
    IF NEW.estado_empresa IS DISTINCT FROM OLD.estado_empresa THEN
      IF v_rol IS NOT NULL AND NOT v_retiro THEN
        IF OLD.estado_empresa::text = 'oferta_retirada' THEN
          RAISE EXCEPTION 'Este proceso quedó cerrado porque la empresa retiró la oferta.';
        END IF;
        RAISE EXCEPTION 'Un proceso se cierra por oferta retirada solo cuando la empresa retira la oferta.';
      END IF;
      IF NEW.estado_empresa::text = 'oferta_retirada' THEN
        IF OLD.estado_empresa IN ('contratado', 'rechazado') THEN
          RAISE EXCEPTION 'Este proceso ya tiene un estado final y no puede modificarse.';
        END IF;
        NEW.fecha_respuesta := now();
      END IF;
    ELSIF v_rol = 'empresa' THEN
      RAISE EXCEPTION 'Este proceso quedó cerrado porque retiraste la oferta.';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

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


-- ============================================================
-- BLOQUE 5 — Avisos
--
-- 5a. CHECK de tipos: el vigente de 051 más
--       Oficina  'postulacion_retirada'  el postulante retiró una postulación
--                                        que ya estaba en revisión o derivada.
--                                        Link a la ficha de la postulación.
--       Empresa  'candidato_retirado'    un candidato derivado retiró su
--                                        postulación. Link a la oferta.
--     Todas las filas existentes usan tipos de 051.
-- 5b. email_tipo_con_envio (051): suma 'candidato_retirado'. El aviso a la
--     oficina queda solo en el portal (como 'postulacion_nueva'). Al
--     postulante no se le avisa: fue su propia acción.
-- 5c. Trigger AFTER UPDATE postulaciones_notificar_retiro (cuando la
--     postulación pasa a 'retirada_postulante'):
--       oficina  siempre    clave postulacion_retirada:<postulacion_id>
--       empresa  si estaba  clave candidato_retirado:<derivacion_id>
--                derivada
--     El aviso nunca hace fallar el retiro (EXCEPTION WHEN OTHERS + WARNING).
--     Volver a postularse avisa como cualquier postulación nueva
--     (postulacion_nueva de 043 y el email postulacion_recibida de 048,
--     ambos por id de la fila nueva).
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
    'oferta_retirada',
    'postulacion_retirada',
    -- Postulante
    'postulacion_derivada',
    'entrevista',
    'seleccionado',
    'no_seleccionado_empresa',
    'no_seleccionado_oficina',
    'curso_asignado',
    'pre_entrevista_coordinada',
    'pre_entrevista_reprogramada',
    'postulacion_cerrada',
    -- Empresa
    'solicitud_aprobada',
    'solicitud_rechazada',
    'oferta_aprobada',
    'oferta_rechazada',
    'candidato_derivado',
    'oferta_por_vencer',
    'oferta_vencida',
    'candidato_retirado'
  ));

CREATE OR REPLACE FUNCTION public.email_tipo_con_envio(p_tipo text)
RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT p_tipo IN (
    -- Postulante
    'postulacion_derivada',
    'entrevista',
    'seleccionado',
    'no_seleccionado_empresa',
    'no_seleccionado_oficina',
    'curso_asignado',
    'pre_entrevista_coordinada',
    'pre_entrevista_reprogramada',
    'postulacion_cerrada',
    -- Empresa
    'solicitud_aprobada',
    'solicitud_rechazada',
    'oferta_aprobada',
    'oferta_rechazada',
    'candidato_derivado',
    'oferta_por_vencer',
    'oferta_vencida',
    'candidato_retirado',
    -- Oficina
    'empresa_pendiente',
    'oferta_pendiente',
    'contratacion'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.email_tipo_con_envio(text)
  FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.postulaciones_notificar_retiro_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_postulante      text;
  v_oferta          text;
  v_empresa         text;
  v_empresa_usuario uuid;
  v_derivacion_id   uuid;
  v_pre_fecha       timestamptz;
BEGIN
  BEGIN
    SELECT
      COALESCE(NULLIF(pg_catalog.btrim(u.nombre || ' ' || u.apellido), ''), 'Un postulante'),
      o.titulo,
      NULLIF(pg_catalog.btrim(o.empresa_nombre), ''),
      e.usuario_id
    INTO v_postulante, v_oferta, v_empresa, v_empresa_usuario
    FROM public.ofertas o
    LEFT JOIN public.empresas e ON e.id  = o.empresa_id
    JOIN public.postulantes pt  ON pt.id = NEW.postulante_id
    JOIN public.usuarios u      ON u.id  = pt.usuario_id
    WHERE o.id = NEW.oferta_id;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    SELECT pe.fecha_hora
    INTO   v_pre_fecha
    FROM   public.pre_entrevistas pe
    WHERE  pe.postulacion_id = NEW.id
      AND  pe.estado = 'cancelada';

    IF OLD.estado::text = 'derivada' THEN
      SELECT d.id
      INTO   v_derivacion_id
      FROM   public.derivaciones d
      WHERE  d.postulacion_id = NEW.id
        AND  d.estado_empresa::text = 'retirada_postulante';
    END IF;

    PERFORM public.notificar_oficina(
      'postulacion_retirada',
      'Postulación retirada',
      v_postulante || ' retiró su postulación a «' || v_oferta || '»'
        || COALESCE(' de ' || v_empresa, '') || '.'
        || CASE
             WHEN v_derivacion_id IS NOT NULL THEN ' Ya estaba derivada: le avisamos a la empresa.'
             ELSE ''
           END
        || CASE
             WHEN v_pre_fecha IS NOT NULL THEN
               ' Se canceló la pre-entrevista del ' || public.notificaciones_fecha(v_pre_fecha, true) || '.'
             ELSE ''
           END,
      '/admin/postulaciones/' || NEW.id::text,
      'postulacion_retirada:' || NEW.id::text
    );

    IF v_derivacion_id IS NOT NULL THEN
      PERFORM public.notificar_usuario(
        v_empresa_usuario,
        'candidato_retirado',
        'Un candidato retiró su postulación',
        v_postulante || ' retiró su postulación a «' || v_oferta || '».',
        '/empresa/ofertas/' || NEW.oferta_id::text,
        'candidato_retirado:' || v_derivacion_id::text
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'postulaciones_notificar_retiro_fn: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.postulaciones_notificar_retiro_fn()
  FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS postulaciones_notificar_retiro ON public.postulaciones;
CREATE TRIGGER postulaciones_notificar_retiro
  AFTER UPDATE ON public.postulaciones
  FOR EACH ROW
  WHEN (NEW.estado::text = 'retirada_postulante'
        AND OLD.estado::text IS DISTINCT FROM 'retirada_postulante')
  EXECUTE FUNCTION public.postulaciones_notificar_retiro_fn();


-- ============================================================
-- BLOQUE 6 — retirar_postulacion(p_postulacion_id)
--
-- Solo el postulante dueño (rol 'postulante' y postulantes.usuario_id =
-- auth.uid()). Devuelve 'eliminada' (estaba 'recibida': se borró la fila) o
-- 'retirada' (quedó en 'retirada_postulante').
--
-- Bloqueos, en este orden:
--   1. la oferta FOR KEY SHARE: espera a un retirar_oferta() en curso (que
--      la toma FOR UPDATE) y después ve sus cambios. No choca con el cierre
--      automático ni con el control de vacantes (029/040), que toman la
--      oferta FOR NO KEY UPDATE mientras tienen la derivación.
--   2. la postulación FOR UPDATE (el mismo bloqueo que derivar_postulacion y
--      las funciones de pre-entrevista: de a una por postulación).
--   3. la derivación FOR UPDATE: si la empresa estaba seleccionándolo o
--      rechazándolo, se espera y se ve el resultado.
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

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esta postulación ya fue retirada.';
  END IF;

  IF v_estado::text = 'retirada_postulante' THEN
    RAISE EXCEPTION 'Ya retiraste esta postulación.';
  END IF;

  IF v_estado = 'recibida' THEN
    DELETE FROM public.postulaciones po
    WHERE  po.id = p_postulacion_id;
    RETURN 'eliminada';
  END IF;

  IF v_estado::text = 'oferta_retirada' THEN
    RAISE EXCEPTION 'Esta postulación ya está cerrada porque la empresa retiró la oferta.';
  END IF;
  IF v_estado = 'rechazada_municipalidad' THEN
    RAISE EXCEPTION 'Esta postulación ya está cerrada y no se puede retirar.';
  END IF;
  IF v_estado NOT IN ('en_revision', 'derivada') THEN
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

  -- El aviso a la oficina y a la empresa sale del trigger del BLOQUE 5c.
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
-- Valores nuevos de los enums:
-- select enum_range(null::public.estado_postulacion), enum_range(null::public.estado_empresa);
--
-- La restricción vieja ya no está y el índice nuevo sí:
-- select conname from pg_constraint
-- where conrelid = 'public.postulaciones'::regclass and contype = 'u';
-- select indexname, indexdef from pg_indexes
-- where tablename = 'postulaciones' and indexname in ('postulaciones_vigente_unica', 'postulaciones_oferta_idx');
--
-- Postulaciones retiradas:
-- select id, oferta_id, postulante_id, retirada_en from public.postulaciones
-- where retirada_en is not null order by retirada_en desc;


-- ============================================================
-- ROLLBACK (no se ejecuta; copiar y correr a mano si hace falta)
-- Los valores 'retirada_postulante' de los enums no se pueden quitar sin
-- recrear los tipos. La restricción única vieja solo se puede volver a crear
-- si no hay dos postulaciones a la misma oferta del mismo postulante: con
-- postulaciones retiradas y vueltas a hacer, hay que decidir antes qué hacer
-- con las retiradas. Las funciones reemplazadas vuelven a su versión
-- anterior re-ejecutando: pre_entrevistas_transicion_fn (BLOQUE 2 de 044),
-- derivaciones_empresa_update_fn y email_tipo_con_envio (BLOQUES 10c y 9b de
-- 051). El CHECK de notificaciones vuelve con el BLOQUE 9a de 051 (solo si no
-- hay avisos de los tipos nuevos) y el de pre_entrevistas con el de 044 (solo
-- si no hay pre-entrevistas canceladas).
--
-- DROP FUNCTION IF EXISTS public.retirar_postulacion(uuid);
-- DROP TRIGGER IF EXISTS postulaciones_notificar_retiro ON public.postulaciones;
-- DROP FUNCTION IF EXISTS public.postulaciones_notificar_retiro_fn();
-- DROP TRIGGER IF EXISTS postulaciones_proteger_retiro_postulante ON public.postulaciones;
-- DROP FUNCTION IF EXISTS public.postulaciones_proteger_retiro_postulante_fn();
-- DROP INDEX IF EXISTS public.postulaciones_oferta_idx;
-- ALTER TABLE public.postulaciones
--   ADD CONSTRAINT postulaciones_oferta_id_postulante_id_key UNIQUE (oferta_id, postulante_id);
-- DROP INDEX IF EXISTS public.postulaciones_vigente_unica;
-- ALTER TABLE public.postulaciones DROP COLUMN IF EXISTS retirada_en;
-- ============================================================
