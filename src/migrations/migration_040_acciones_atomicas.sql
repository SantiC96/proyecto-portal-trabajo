-- ============================================================
-- Portal Municipal de Empleo — Migración 040
-- Acciones atómicas y protección contra envíos duplicados
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_039_asignar_curso_solo_si_necesita.sql ya aplicada.
-- Re-ejecutable sin errores. No borra ni modifica datos existentes.
-- ============================================================
--
-- Las acciones que escribían en más de una tabla con varias llamadas desde
-- la aplicación pasan a funciones de la base: todo se hace en una sola
-- transacción y la función verifica rol, propiedad y estado (con FOR UPDATE
-- para evitar carreras entre pestañas o reintentos). Ver
-- docs/decisiones/016-acciones-atomicas.md.
--
--   derivar_postulacion             derivación + estado de la postulación
--   crear_oferta_empresa            oferta + categorías + vacantes
--   editar_oferta_empresa           oferta + categorías + vacantes
--   actualizar_mi_perfil_postulante usuarios + postulantes
--   reemplazar_mis_rubros           borrar + insertar postulante_categorias
--   reenviar_solicitud_empresa      usuarios + empresas
--   activar_archivo_usuario         (existente, misma firma) se serializa por
--                                   usuario para que dos subidas simultáneas
--                                   no choquen
--
-- Además, el trigger derivaciones_limite_vacantes (BLOQUE 11) impide
-- seleccionar más candidatos que vacantes.
--
-- Errores:
--   42501  rol incorrecto ('No autorizado'), igual que renovar_oferta (036).
--   P0001  el estado no permite la acción; el mensaje es para el usuario.
--   23505  duplicado (índices únicos); la aplicación lo traduce a CONFLICTO.
--
-- Las funciones son SECURITY DEFINER, así que no pasan por RLS ni por los
-- grants de columna: cada una escribe solo las columnas que la aplicación
-- ya podía escribir. auth.uid() sigue siendo el del usuario que llama, de
-- modo que los triggers existentes (que usan rol_actual()) se comportan igual
-- que con las escrituras directas y no se duplica su lógica:
--   ofertas      prevent_empresa_editar_pendiente (024), reset a revisión de
--                prevent_empresa_oferta_campos (027), contenido_editado_en
--                (022), requisito mínimo (032), vence_en (036).
--   empresas     reset a 'pendiente' (031) e historial (031).
--   derivaciones sin triggers de INSERT; los de UPDATE no intervienen.
--
-- Protección contra duplicados nueva:
--   ofertas.clave_envio + índice único (empresa_id, clave_envio): el
--     formulario manda una clave por envío; reenviarla no crea otra oferta.
--   índice único sobre el nombre de los cursos (si los datos lo permiten,
--     ver BLOQUE 9).
-- ============================================================


-- ============================================================
-- BLOQUE 0 — Diagnóstico (solo lectura)
-- Postulaciones con derivación cuyo estado no es 'derivada': las deja el
-- error de derivarPostulacion que corrige esta migración. No se corrigen
-- solas; derivar_postulacion las completa cuando la oficina las vuelve a
-- derivar desde la ficha.
-- ============================================================

DO $$
DECLARE
  v_cantidad int;
BEGIN
  SELECT pg_catalog.count(*)::int INTO v_cantidad
  FROM public.derivaciones d
  JOIN public.postulaciones po ON po.id = d.postulacion_id
  WHERE po.estado <> 'derivada';

  IF v_cantidad > 0 THEN
    RAISE NOTICE
      '% postulación(es) tienen derivación pero su estado no es «derivada». '
      'Consulta: SELECT po.id, po.estado FROM public.derivaciones d '
      'JOIN public.postulaciones po ON po.id = d.postulacion_id WHERE po.estado <> ''derivada'';',
      v_cantidad;
  END IF;
END;
$$;


-- ============================================================
-- BLOQUE 1 — derivar_postulacion
-- Inserta la derivación y pasa la postulación a 'derivada' en la misma
-- transacción. La postulación se bloquea con FOR UPDATE: un segundo envío
-- (otra pestaña, reintento) espera, ve el estado nuevo y recibe P0001.
-- La oferta se bloquea con FOR SHARE para que no pase a revisión en el medio.
--
-- Si la postulación ya tiene derivación pero sigue en 'recibida' o
-- 'en_revision' (dato a medias del error anterior), se completa: se conserva
-- la derivación existente y se actualiza el estado.
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
-- BLOQUE 2 — Clave de envío de ofertas
-- La genera el formulario al abrirse y viaja con cada envío. Un doble envío
-- (doble click, reintento de red, volver atrás y enviar de nuevo) llega con
-- la misma clave y el índice único lo rechaza (23505). Las ofertas
-- existentes quedan con clave_envio NULL, que el índice parcial no cuenta.
-- No está en el grant de UPDATE de ofertas: solo la escribe
-- crear_oferta_empresa.
-- ============================================================

ALTER TABLE public.ofertas
  ADD COLUMN IF NOT EXISTS clave_envio uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.ofertas o
    WHERE o.clave_envio IS NOT NULL
    GROUP BY o.empresa_id, o.clave_envio
    HAVING pg_catalog.count(*) > 1
  ) THEN
    RAISE NOTICE
      'No se creó ofertas_empresa_clave_envio_idx: hay ofertas de una misma empresa '
      'con la misma clave_envio. No se borró nada; revisar con: '
      'SELECT empresa_id, clave_envio, count(*) FROM public.ofertas '
      'WHERE clave_envio IS NOT NULL GROUP BY 1, 2 HAVING count(*) > 1;';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS ofertas_empresa_clave_envio_idx
      ON public.ofertas (empresa_id, clave_envio)
      WHERE clave_envio IS NOT NULL;
  END IF;
END;
$$;


-- ============================================================
-- BLOQUE 3 — Helper: categorías de una oferta
-- Devuelve los ids sin repetir y rechaza la lista si no tiene entre 1 y 5
-- categorías o si alguna no existe. Solo la usan las funciones de ofertas
-- (corren como dueño), así que nadie más puede ejecutarla.
-- ============================================================

CREATE OR REPLACE FUNCTION public.categorias_validas_de_oferta(p_categoria_ids uuid[])
RETURNS uuid[]
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
DECLARE
  v_ids uuid[];
BEGIN
  v_ids := ARRAY(
    SELECT DISTINCT c.id
    FROM pg_catalog.unnest(p_categoria_ids) AS c(id)
    WHERE c.id IS NOT NULL
  );

  IF pg_catalog.cardinality(v_ids) NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Seleccioná entre 1 y 5 categorías.';
  END IF;

  IF (
    SELECT pg_catalog.count(*)
    FROM public.categorias ca
    WHERE ca.id = ANY (v_ids)
  ) <> pg_catalog.cardinality(v_ids) THEN
    RAISE EXCEPTION 'Una o más categorías no son válidas.';
  END IF;

  RETURN v_ids;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.categorias_validas_de_oferta(uuid[]) FROM public, anon, authenticated;


-- ============================================================
-- BLOQUE 4 — crear_oferta_empresa
-- Oferta, categorías y vacantes en una transacción. Las mismas condiciones
-- que la política "ofertas: insertar (empresa aprobada)" (021): rol empresa,
-- empresa aprobada, estado 'pendiente_aprobacion' y empresa_id propio.
-- empresa_id y empresa_nombre salen de la base, no del cliente.
-- ============================================================

CREATE OR REPLACE FUNCTION public.crear_oferta_empresa(
  p_titulo            text,
  p_descripcion       text,
  p_ubicacion         text,
  p_modalidad         public.modalidad_oferta,
  p_jornada           public.jornada_oferta,
  p_requisitos        text[],
  p_beneficios        text[],
  p_duracion_dias     int,
  p_categoria_ids     uuid[],
  p_cantidad_vacantes int,
  p_clave_envio       uuid
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_empresa_id   uuid;
  v_razon_social text;
  v_categorias   uuid[];
  v_oferta_id    uuid;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'empresa' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT e.id, e.razon_social
  INTO   v_empresa_id, v_razon_social
  FROM   public.empresas e
  WHERE  e.usuario_id = auth.uid()
    AND  e.estado_aprobacion = 'aprobada';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tu empresa no está aprobada para publicar ofertas.' USING ERRCODE = '42501';
  END IF;

  IF p_clave_envio IS NULL THEN
    RAISE EXCEPTION 'Falta la clave de envío de la oferta.';
  END IF;

  IF p_cantidad_vacantes IS NULL OR p_cantidad_vacantes < 1 THEN
    RAISE EXCEPTION 'La cantidad de vacantes debe ser un número entero mayor o igual a 1.';
  END IF;

  v_categorias := public.categorias_validas_de_oferta(p_categoria_ids);

  INSERT INTO public.ofertas (
    titulo, descripcion, ubicacion, modalidad, jornada, requisitos, beneficios,
    empresa_id, empresa_nombre, estado, duracion_dias, clave_envio
  )
  VALUES (
    p_titulo, p_descripcion, p_ubicacion, p_modalidad, p_jornada,
    COALESCE(p_requisitos, ARRAY[]::text[]), COALESCE(p_beneficios, ARRAY[]::text[]),
    v_empresa_id, v_razon_social, 'pendiente_aprobacion', p_duracion_dias, p_clave_envio
  )
  RETURNING id INTO v_oferta_id;

  INSERT INTO public.oferta_categorias (oferta_id, categoria_id)
  SELECT v_oferta_id, c.id
  FROM pg_catalog.unnest(v_categorias) AS c(id);

  INSERT INTO public.oferta_vacantes (oferta_id, cantidad)
  VALUES (v_oferta_id, p_cantidad_vacantes);

  RETURN v_oferta_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.crear_oferta_empresa(
  text, text, text, public.modalidad_oferta, public.jornada_oferta,
  text[], text[], int, uuid[], int, uuid
) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.crear_oferta_empresa(
  text, text, text, public.modalidad_oferta, public.jornada_oferta,
  text[], text[], int, uuid[], int, uuid
) TO authenticated;


-- ============================================================
-- BLOQUE 5 — editar_oferta_empresa
-- Contenido, categorías y vacantes en una transacción, con la oferta
-- bloqueada (FOR UPDATE): dos ediciones simultáneas se ejecutan una después
-- de la otra y no mezclan categorías.
--
-- Reemplaza a las condiciones de la política "ofertas: actualizar (empresa
-- propia)" (021), que no aplica dentro de una función SECURITY DEFINER:
--   USING      oferta propia y no cerrada → se verifica acá.
--   WITH CHECK estado final 'pendiente_aprobacion' → se verifica después del
--              UPDATE. El estado lo cambia el trigger de 027 solo si cambió
--              el contenido; si no cambió, la oferta seguiría activa o
--              rechazada, que la política tampoco permitía.
-- La edición de una oferta pendiente la sigue rechazando el trigger de 024.
-- ============================================================

CREATE OR REPLACE FUNCTION public.editar_oferta_empresa(
  p_oferta_id         uuid,
  p_titulo            text,
  p_descripcion       text,
  p_ubicacion         text,
  p_modalidad         public.modalidad_oferta,
  p_jornada           public.jornada_oferta,
  p_requisitos        text[],
  p_beneficios        text[],
  p_duracion_dias     int,
  p_categoria_ids     uuid[],
  p_cantidad_vacantes int
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_estado       public.estado_oferta;
  v_estado_nuevo public.estado_oferta;
  v_categorias   uuid[];
  v_contratados  int;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'empresa' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.empresas e
    WHERE e.usuario_id = auth.uid()
      AND e.estado_aprobacion = 'aprobada'
  ) THEN
    RAISE EXCEPTION 'Tu empresa no está aprobada para publicar ofertas.' USING ERRCODE = '42501';
  END IF;

  SELECT o.estado
  INTO   v_estado
  FROM   public.ofertas o
  JOIN   public.empresas e ON e.id = o.empresa_id
  WHERE  o.id = p_oferta_id
    AND  e.usuario_id = auth.uid()
  FOR UPDATE OF o;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la oferta o no tenés permiso para editarla.';
  END IF;

  IF v_estado = 'cerrada' THEN
    RAISE EXCEPTION 'No podés editar una oferta cerrada.';
  END IF;

  IF p_cantidad_vacantes IS NULL OR p_cantidad_vacantes < 1 THEN
    RAISE EXCEPTION 'La cantidad de vacantes debe ser un número entero mayor o igual a 1.';
  END IF;

  v_contratados := public.contratados_en_oferta(p_oferta_id);
  IF p_cantidad_vacantes < v_contratados THEN
    RAISE EXCEPTION 'Ya tenés % %. La cantidad de vacantes debe ser al menos %.',
      v_contratados,
      CASE WHEN v_contratados = 1 THEN 'candidato seleccionado' ELSE 'candidatos seleccionados' END,
      v_contratados;
  END IF;

  v_categorias := public.categorias_validas_de_oferta(p_categoria_ids);

  -- Cambiar la duración no mueve vence_en: se usa al publicar o renovar (036).
  UPDATE public.ofertas o
  SET    titulo        = p_titulo,
         descripcion   = p_descripcion,
         ubicacion     = p_ubicacion,
         modalidad     = p_modalidad,
         jornada       = p_jornada,
         requisitos    = COALESCE(p_requisitos, ARRAY[]::text[]),
         beneficios    = COALESCE(p_beneficios, ARRAY[]::text[]),
         duracion_dias = p_duracion_dias,
         updated_at    = now()
  WHERE  o.id = p_oferta_id
  RETURNING o.estado INTO v_estado_nuevo;

  IF v_estado_nuevo IS DISTINCT FROM 'pendiente_aprobacion' THEN
    RAISE EXCEPTION 'No hay cambios en el título, la descripción, los requisitos, los beneficios, la modalidad ni la jornada. Modificá alguno para enviar la oferta de nuevo a revisión.';
  END IF;

  DELETE FROM public.oferta_categorias oc
  WHERE oc.oferta_id = p_oferta_id;

  INSERT INTO public.oferta_categorias (oferta_id, categoria_id)
  SELECT p_oferta_id, c.id
  FROM pg_catalog.unnest(v_categorias) AS c(id);

  INSERT INTO public.oferta_vacantes (oferta_id, cantidad)
  VALUES (p_oferta_id, p_cantidad_vacantes)
  ON CONFLICT (oferta_id) DO UPDATE
    SET cantidad   = EXCLUDED.cantidad,
        updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.editar_oferta_empresa(
  uuid, text, text, text, public.modalidad_oferta, public.jornada_oferta,
  text[], text[], int, uuid[], int
) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.editar_oferta_empresa(
  uuid, text, text, text, public.modalidad_oferta, public.jornada_oferta,
  text[], text[], int, uuid[], int
) TO authenticated;


-- ============================================================
-- BLOQUE 6 — actualizar_mi_perfil_postulante
-- Datos de contacto (usuarios) y DNI/domicilio (postulantes) juntos: si el
-- DNI ya está registrado (23505) no se guarda nada. Escribe las mismas
-- columnas que permiten los grants de 018.
-- ============================================================

CREATE OR REPLACE FUNCTION public.actualizar_mi_perfil_postulante(
  p_nombre    text,
  p_apellido  text,
  p_telefono  text,
  p_domicilio text,
  p_dni       text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'postulante' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  UPDATE public.usuarios u
  SET    nombre   = p_nombre,
         apellido = p_apellido,
         telefono = p_telefono
  WHERE  u.id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró tu perfil.';
  END IF;

  UPDATE public.postulantes p
  SET    domicilio = NULLIF(pg_catalog.btrim(p_domicilio), ''),
         dni       = p_dni
  WHERE  p.usuario_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró tu perfil de postulante.';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.actualizar_mi_perfil_postulante(text, text, text, text, text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.actualizar_mi_perfil_postulante(text, text, text, text, text) TO authenticated;


-- ============================================================
-- BLOQUE 7 — reemplazar_mis_rubros
-- Borra e inserta los rubros de interés en una transacción: si el insert
-- falla, el postulante conserva los anteriores. La fila del postulante se
-- bloquea para que dos envíos simultáneos no se mezclen ni choquen con la
-- clave primaria de postulante_categorias. Una lista vacía deja al
-- postulante sin rubros (igual que antes).
-- ============================================================

CREATE OR REPLACE FUNCTION public.reemplazar_mis_rubros(p_categoria_ids uuid[])
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_postulante_id uuid;
  v_ids           uuid[];
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'postulante' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT p.id
  INTO   v_postulante_id
  FROM   public.postulantes p
  WHERE  p.usuario_id = auth.uid()
  FOR NO KEY UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el perfil del postulante.';
  END IF;

  v_ids := ARRAY(
    SELECT DISTINCT c.id
    FROM pg_catalog.unnest(COALESCE(p_categoria_ids, ARRAY[]::uuid[])) AS c(id)
    WHERE c.id IS NOT NULL
  );

  IF (
    SELECT pg_catalog.count(*)
    FROM public.categorias ca
    WHERE ca.id = ANY (v_ids)
  ) <> pg_catalog.cardinality(v_ids) THEN
    RAISE EXCEPTION 'Algunas categorías no son válidas.';
  END IF;

  DELETE FROM public.postulante_categorias pc
  WHERE pc.postulante_id = v_postulante_id;

  INSERT INTO public.postulante_categorias (postulante_id, categoria_id)
  SELECT v_postulante_id, c.id
  FROM pg_catalog.unnest(v_ids) AS c(id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reemplazar_mis_rubros(uuid[]) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.reemplazar_mis_rubros(uuid[]) TO authenticated;


-- ============================================================
-- BLOQUE 8 — reenviar_solicitud_empresa
-- Datos de contacto (usuarios) y de la empresa en una transacción. La
-- empresa se bloquea con FOR UPDATE: el segundo envío espera, ve la
-- solicitud en 'pendiente' y recibe P0001.
-- El reset a 'pendiente' y el registro en el historial los siguen haciendo
-- los triggers de 031; si los datos de la empresa no cambiaron, el trigger no
-- resetea y la función lo rechaza (antes lo controlaba la aplicación).
-- Un CUIT repetido falla con 23505 y no se guarda nada.
-- ============================================================

CREATE OR REPLACE FUNCTION public.reenviar_solicitud_empresa(
  p_razon_social text,
  p_cuit         text,
  p_rubro        text,
  p_descripcion  text,
  p_nombre       text,
  p_apellido     text,
  p_telefono     text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_empresa_id   uuid;
  v_estado       text;
  v_estado_nuevo text;
BEGIN
  IF public.rol_actual()::text IS DISTINCT FROM 'empresa' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT e.id, e.estado_aprobacion
  INTO   v_empresa_id, v_estado
  FROM   public.empresas e
  WHERE  e.usuario_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la empresa.';
  END IF;

  IF v_estado = 'pendiente' THEN
    RAISE EXCEPTION 'Tu solicitud ya fue enviada y está en revisión.';
  END IF;
  IF v_estado IS DISTINCT FROM 'rechazada' THEN
    RAISE EXCEPTION 'Solo podés reenviar la solicitud si fue rechazada.';
  END IF;

  UPDATE public.usuarios u
  SET    nombre   = p_nombre,
         apellido = p_apellido,
         telefono = p_telefono
  WHERE  u.id = auth.uid();

  UPDATE public.empresas e
  SET    razon_social = p_razon_social,
         cuit         = p_cuit,
         rubro        = p_rubro,
         descripcion  = NULLIF(pg_catalog.btrim(p_descripcion), '')
  WHERE  e.id = v_empresa_id
  RETURNING e.estado_aprobacion INTO v_estado_nuevo;

  IF v_estado_nuevo IS DISTINCT FROM 'pendiente' THEN
    RAISE EXCEPTION 'Modificá los datos que te indicaron antes de reenviar.';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reenviar_solicitud_empresa(text, text, text, text, text, text, text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.reenviar_solicitud_empresa(text, text, text, text, text, text, text) TO authenticated;


-- ============================================================
-- BLOQUE 9 — Nombre único de curso
-- Dos envíos del formulario de curso nuevo (dos pestañas) creaban dos cursos
-- iguales. Se compara sin mayúsculas ni espacios en los extremos.
-- Si ya hay cursos con el mismo nombre, el índice no se crea y no se toca
-- ningún curso: queda un NOTICE con la consulta para revisarlos.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.cursos c
    GROUP BY pg_catalog.lower(pg_catalog.btrim(c.nombre))
    HAVING pg_catalog.count(*) > 1
  ) THEN
    RAISE NOTICE
      'No se creó cursos_nombre_unico_idx: hay cursos con el mismo nombre. '
      'No se borró nada; revisar con: '
      'SELECT lower(btrim(nombre)) AS nombre, count(*) FROM public.cursos '
      'GROUP BY 1 HAVING count(*) > 1;';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS cursos_nombre_unico_idx
      ON public.cursos (pg_catalog.lower(pg_catalog.btrim(nombre)));
  END IF;
END;
$$;


-- ============================================================
-- BLOQUE 10 — activar_archivo_usuario (reemplazo, misma firma y retorno)
-- Única diferencia con 033: bloquea la fila del usuario antes de desactivar
-- e insertar. Sin el bloqueo, dos subidas simultáneas del mismo tipo podían
-- no ver el archivo de la otra y la segunda fallaba contra
-- archivos_usuario_activo_unico; ahora la segunda espera y reemplaza a la
-- primera, como cualquier reemplazo.
-- ============================================================

CREATE OR REPLACE FUNCTION public.activar_archivo_usuario(
  p_usuario_id      uuid,
  p_tipo            text,
  p_ruta            text,
  p_nombre_original text,
  p_tamano          bigint,
  p_mime_type       text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM 1
  FROM public.usuarios u
  WHERE u.id = p_usuario_id
  FOR NO KEY UPDATE;

  -- Desactivar el archivo activo actual (si existe)
  UPDATE public.archivos_usuario
  SET    activo        = false,
         desactivado_en = now()
  WHERE  usuario_id = p_usuario_id
    AND  tipo       = p_tipo
    AND  activo     = true;

  -- Insertar el nuevo como activo
  INSERT INTO public.archivos_usuario
    (usuario_id, tipo, ruta, nombre_original, tamano, mime_type)
  VALUES
    (p_usuario_id, p_tipo, p_ruta, p_nombre_original, p_tamano, p_mime_type);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.activar_archivo_usuario(uuid, text, text, text, bigint, text)
  FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.activar_archivo_usuario(uuid, text, text, text, bigint, text)
  TO service_role;


-- ============================================================
-- BLOQUE 11 — Límite de vacantes al seleccionar
-- Hasta ahora nada impedía seleccionar más candidatos que vacantes: dos
-- selecciones simultáneas no veían la una a la otra, y después del cierre
-- automático (029) se podía seguir seleccionando.
--
-- Trigger BEFORE UPDATE en derivaciones, solo cuando estado_empresa pasa a
-- 'contratado'. Aplica a la empresa y a la oficina (corregirEstadoDerivacion);
-- sin rol (SQL Editor, service_role) no se controla, para correcciones
-- manuales.
--
-- Bloqueos, siempre en este orden: ofertas (FOR NO KEY UPDATE) y después
-- oferta_vacantes (FOR UPDATE). Es el mismo orden que editar_oferta_empresa
-- (BLOQUE 5), así que una selección y una edición de vacantes simultáneas se
-- ejecutan una después de la otra sin deadlock, y la edición ve el conteo ya
-- actualizado. Una segunda selección espera el bloqueo y, como cada sentencia
-- toma una instantánea nueva, el conteo incluye la selección ya confirmada.
--
-- Orden de ejecución (por nombre, dentro de cada momento):
--   BEFORE  derivaciones_empresa_update (028/029)  valida la transición
--           derivaciones_limite_vacantes (040)     valida las vacantes
--   AFTER   derivaciones_auto_cerrar_oferta (029)  cierra la oferta
--           derivaciones_notificar_contratacion (038)
-- Si una transición no es válida, el error de 028/029 sale primero. El cierre
-- automático no cambia: sigue cerrando al llegar al cupo.
-- ============================================================

DO $$
DECLARE
  v_cantidad int;
BEGIN
  SELECT pg_catalog.count(*)::int INTO v_cantidad
  FROM (
    SELECT ov.oferta_id
    FROM public.oferta_vacantes ov
    JOIN public.postulaciones po ON po.oferta_id = ov.oferta_id
    JOIN public.derivaciones d   ON d.postulacion_id = po.id
    WHERE d.estado_empresa = 'contratado'
    GROUP BY ov.oferta_id, ov.cantidad
    HAVING pg_catalog.count(*) > ov.cantidad
  ) AS excedidas;

  IF v_cantidad > 0 THEN
    RAISE NOTICE
      '% oferta(s) tienen más seleccionados que vacantes. No se modificó nada; '
      'no admiten nuevas selecciones hasta que se revisen. Consulta: '
      'SELECT ov.oferta_id, ov.cantidad AS vacantes, count(*) AS seleccionados '
      'FROM public.oferta_vacantes ov '
      'JOIN public.postulaciones po ON po.oferta_id = ov.oferta_id '
      'JOIN public.derivaciones d ON d.postulacion_id = po.id '
      'WHERE d.estado_empresa = ''contratado'' '
      'GROUP BY ov.oferta_id, ov.cantidad HAVING count(*) > ov.cantidad;',
      v_cantidad;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.derivaciones_limite_vacantes_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_oferta_id   uuid;
  v_vacantes    int;
  v_contratados int;
BEGIN
  IF public.rol_actual() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT po.oferta_id INTO v_oferta_id
  FROM public.postulaciones po
  WHERE po.id = NEW.postulacion_id;

  IF v_oferta_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM 1
  FROM public.ofertas o
  WHERE o.id = v_oferta_id
  FOR NO KEY UPDATE;

  SELECT ov.cantidad INTO v_vacantes
  FROM public.oferta_vacantes ov
  WHERE ov.oferta_id = v_oferta_id
  FOR UPDATE;

  -- Sin registro de vacantes no hay cupo que controlar (igual que el cierre
  -- automático de 029).
  IF v_vacantes IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT pg_catalog.count(*)::int INTO v_contratados
  FROM public.derivaciones d
  JOIN public.postulaciones po ON po.id = d.postulacion_id
  WHERE po.oferta_id      = v_oferta_id
    AND d.estado_empresa  = 'contratado'
    AND d.id             <> NEW.id;

  IF v_contratados >= v_vacantes THEN
    RAISE EXCEPTION 'Ya cubriste todas las vacantes de esta oferta.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS derivaciones_limite_vacantes ON public.derivaciones;
CREATE TRIGGER derivaciones_limite_vacantes
  BEFORE UPDATE OF estado_empresa ON public.derivaciones
  FOR EACH ROW
  WHEN (NEW.estado_empresa = 'contratado'
        AND OLD.estado_empresa IS DISTINCT FROM 'contratado')
  EXECUTE FUNCTION public.derivaciones_limite_vacantes_fn();
