# 016 — Acciones atómicas y protección contra envíos duplicados

**Fecha:** 2026-10-15
**Estado:** Vigente
**Migración:** `migration_040_acciones_atomicas.sql`

---

## Contexto

Varias server actions hacían más de una escritura con llamadas separadas a Supabase. Cada llamada es su propia transacción: si fallaba un paso intermedio, el dato quedaba a medias. El caso conocido era derivar una postulación: se insertaba la derivación y después se cambiaba el estado de la postulación; si el segundo paso fallaba, la empresa veía al candidato y la oficina lo seguía viendo en «Pendientes», y reintentar daba «ya fue derivada».

Además, varias acciones leían el estado y después escribían sin condición. Entre la lectura y la escritura otra pestaña o un reintento podía cambiar el estado, y la escritura lo pisaba (por ejemplo, abrir la ficha después de derivar devolvía una postulación derivada a «En revisión»).

`useAccion` y `BotonFormulario` evitan el doble click, pero no cubren dos pestañas, un reintento de red ni volver atrás y enviar otra vez. La protección tiene que estar en la base.

---

## Decisiones tomadas

### 1. Las acciones que escriben en más de una tabla pasan a funciones de la base

| Acción | Función | Qué hace en una transacción |
|---|---|---|
| `derivarPostulacion` | `derivar_postulacion(p_postulacion_id, p_nota)` | inserta la derivación y pasa la postulación a `derivada` |
| `crearOferta` | `crear_oferta_empresa(...)` | oferta + `oferta_categorias` + `oferta_vacantes` |
| `editarOferta` | `editar_oferta_empresa(...)` | contenido + reemplazo de categorías + vacantes |
| `actualizarPerfil` (postulante) | `actualizar_mi_perfil_postulante(...)` | `usuarios` + `postulantes` |
| `actualizarRubros` | `reemplazar_mis_rubros(p_categoria_ids)` | borra e inserta `postulante_categorias` |
| `reenviarSolicitudEmpresa` | `reenviar_solicitud_empresa(...)` | `usuarios` + `empresas` |

Reglas comunes:

- `SECURITY DEFINER`, `SET search_path = ''` y tablas calificadas con `public.`.
- El rol se controla dentro de la función con `rol_actual()::text IS DISTINCT FROM '<rol>'` → `42501`. La propiedad sale de `auth.uid()`, nunca de un parámetro.
- El registro sobre el que se decide se bloquea (`FOR UPDATE`, o `FOR NO KEY UPDATE` cuando solo se usa como cerrojo). Un segundo envío espera, ve el estado nuevo y recibe un error claro.
- Cuando el estado no permite la acción, `RAISE EXCEPTION` con el mensaje para el usuario (`P0001`). Los duplicados que frena un índice único llegan como `23505`.
- Como no pasan por RLS ni por los grants de columna, cada función escribe solo las columnas que la aplicación ya podía escribir y repite las condiciones de las políticas que reemplaza (por ejemplo, `editar_oferta_empresa` exige oferta propia, no cerrada, y que termine en `pendiente_aprobacion`, que es el `WITH CHECK` de la política de 021).
- La server action valida la entrada (tipos, largos, formatos), llama a `supabase.rpc()` y traduce el error: `23505` → `CONFLICTO` con un mensaje específico; `P0001` y `42501` → `fromSupabaseError()`; el resto → `ERROR_INTERNO` con `logError`.
- Los controles de estado que ahora hace la función se quitaron de la action para no tener la regla en dos lugares.

**Convivencia con los triggers.** Dentro de una función `SECURITY DEFINER`, `auth.uid()` sigue siendo el del usuario, así que `rol_actual()` y los triggers se comportan igual que con escrituras directas. Las funciones no repiten lo que ya hacen:

- `ofertas`: el bloqueo de edición en revisión (024), la vuelta a revisión al cambiar el contenido (027), `contenido_editado_en` (022), el requisito mínimo (032) y `vence_en` (036) siguen en los triggers. `editar_oferta_empresa` mira el estado *después* del `UPDATE`: si el contenido no cambió, el trigger no la mandó a revisión y la función lo rechaza (antes lo rechazaba la política RLS con un error genérico).
- `empresas`: el reset a `pendiente` y el historial siguen en los triggers de 031. `reenviar_solicitud_empresa` mira el estado después del `UPDATE` para saber si cambió algún dato de la empresa.

**Postulaciones a medias.** Si una postulación tiene derivación pero sigue en `recibida` o `en_revision` (lo que dejaba el error anterior), `derivar_postulacion` conserva la derivación y completa el estado. La migración no las corrige sola: avisa cuántas hay con un `NOTICE` y la consulta para verlas.

### 2. Cuando alcanza un solo UPDATE condicional, no se crea una función

Si la acción escribe una sola fila de una sola tabla, el problema no es la atomicidad sino la carrera entre leer y escribir. Se resuelve agregando el estado esperado al `WHERE` y comprobando que el update afectó una fila; si no afectó ninguna, el estado cambió y se devuelve `ESTADO_INVALIDO`. Postgres reevalúa el `WHERE` sobre la versión más nueva de la fila después de esperar el bloqueo, así que no hace falta `FOR UPDATE`.

| Acción | Condición agregada |
|---|---|
| `abrirFicha` | `estado = 'recibida'` |
| `marcarEnRevision` | `estado IN ('recibida', 'rechazada_municipalidad')` |
| `descartarPostulacion` | `estado IN ('recibida', 'en_revision')` |
| `aprobarOferta`, `rechazarOferta` | `estado = 'pendiente_aprobacion'` |
| `aprobarEmpresa` / `rechazarEmpresa` | `estado_aprobacion <> 'aprobada'` / `<> 'rechazada'` (lo mismo que ya muestra la interfaz) |
| `retirarPostulacion` | `estado = 'recibida'` (la política ya lo exigía; ahora el mensaje es claro) |

### 3. Storage y la base: compensación

Storage y la base no comparten transacción. El orden es siempre **primero el archivo, después el registro** (`activar_archivo_usuario`, que desactiva el anterior e inserta el nuevo en una transacción). Así un registro activo nunca apunta a un archivo que todavía no existe.

Si el registro falla después de subir el archivo, `subirAvatar` y `subirCV` borran el archivo recién subido (`descartarArchivoSubido` en `perfil/actions.ts`) y devuelven el error. Antes de borrar comprueban que ninguna fila de `archivos_usuario` apunte a esa ruta: si el registro llegó a guardarse y solo se perdió la respuesta, borrar el archivo dejaría un registro activo sin archivo. Si la comprobación o el borrado fallan, el archivo queda huérfano (no lo referencia nada) y se registra con `logError`.

**Quitar o reemplazar.** La aplicación nunca borra archivos del bucket: quitar o reemplazar desactiva el registro (`activo = false`) y el archivo queda (decisión de la 009, que además quitó las políticas de DELETE de storage). Por eso un registro activo no puede quedar apuntando a un archivo borrado. La compensación es el único borrado y solo toca archivos sin registro.

`activar_archivo_usuario` mantiene su firma; ahora bloquea la fila del usuario antes de desactivar e insertar. Dos subidas simultáneas del mismo tipo se ejecutan una después de la otra y la segunda reemplaza a la primera, en vez de fallar contra `archivos_usuario_activo_unico` (y, ahora, compensar).

**Registro de cuentas.** `signUp` (Auth) y el alta del perfil (`postulantes`/`empresas`) tampoco comparten transacción. Si el perfil falla, se borra el usuario de Auth. Mientras el email no está confirmado, `signUp` devuelve el mismo usuario a cada envío, así que un segundo envío del formulario fallaba por duplicado y **borraba la cuenta creada por el primero**. Ahora, antes de borrar, se comprueba si el usuario ya tiene perfil: si lo tiene, el alta está completa y se redirige a la verificación; si no, se borra y un error del borrado queda en el log.

### 4. Protección contra duplicados

| Caso | Protección en la base | Mensaje (`CONFLICTO` salvo indicación) |
|---|---|---|
| Postularse dos veces | `UNIQUE (oferta_id, postulante_id)` (001) | «Ya te postulaste a esta oferta.» |
| Derivar dos veces | `FOR UPDATE` en `derivar_postulacion` + `UNIQUE (postulacion_id)` (001) | «Esta postulación ya fue derivada.» (`P0001`) |
| Crear la misma oferta dos veces | `ofertas.clave_envio` + índice único `(empresa_id, clave_envio)` (040) | «Esta oferta ya se envió…» |
| Crear dos cursos iguales | índice único `lower(btrim(nombre))` (040, si los datos lo permiten) | «Ya existe un curso con ese nombre.» |
| Asignar dos cursos a la vez | índice parcial `asignaciones_curso_una_activa_idx` (035) + trigger | mensaje de curso activo |
| Guardar dos veces un candidato | `UNIQUE (empresa_id, postulante_id)` (028) | «Este candidato ya está guardado.» |
| Dos CV/fotos activos | índice parcial `archivos_usuario_activo_unico` (009) + bloqueo (040) | la segunda reemplaza a la primera |
| Reenviar dos veces la solicitud | `FOR UPDATE` en `reenviar_solicitud_empresa` | «Tu solicitud ya fue enviada y está en revisión.» (`P0001`) |
| Registrarse dos veces | `UNIQUE` en `postulantes.usuario_id`/`dni`, `empresas.usuario_id`/`cuit` (001/003) | redirige a la verificación |
| Mismo DNI o CUIT en otro perfil | `UNIQUE` (003 / 001) | «Ese DNI ya está registrado…» / «Ya hay una empresa registrada con ese CUIT.» |
| Doble decisión sobre una derivación | trigger `derivaciones_empresa_update` (028/029) | su mensaje (`P0001`), que antes llegaba como error interno |
| Seleccionar más candidatos que vacantes | trigger `derivaciones_limite_vacantes` (040), ver sección 5 | «Ya cubriste todas las vacantes de esta oferta.» (`P0001`) |
| Rubros, categorías, vacantes | claves primarias + bloqueo en la función | las dos ediciones se aplican en orden |

**Clave de envío de ofertas.** Una oferta no tiene un dato natural único (dos ofertas con el mismo título pueden ser legítimas), así que el formulario genera una clave (`crypto.randomUUID()`) al abrirse y la manda con cada envío. Un doble click, un reintento o volver atrás y reenviar llegan con la misma clave y la base rechaza el segundo. Dos pestañas con el formulario abierto son dos envíos distintos y crean dos ofertas, igual que si la empresa cargara dos veces.

**Índices sobre datos existentes.** Antes de crear un índice único, la migración comprueba en un bloque `DO` si los datos existentes lo impiden. Si es así, no lo crea, no borra nada y deja un `NOTICE` con la consulta para revisarlos. Hay que leer los avisos al correr la migración.

### 5. No se selecciona a más candidatos que vacantes

Antes, dos selecciones simultáneas no se veían entre sí y, después del cierre automático (029), se podía seguir seleccionando. Ahora lo impide el trigger `derivaciones_limite_vacantes` (`BEFORE UPDATE OF estado_empresa`, solo cuando pasa a `contratado`):

- Bloquea la oferta (`FOR NO KEY UPDATE`) y su fila de `oferta_vacantes` (`FOR UPDATE`), cuenta los seleccionados sin contar la derivación actual y, si ya llegan a la cantidad de vacantes, falla con `P0001` «Ya cubriste todas las vacantes de esta oferta.». Una segunda selección simultánea espera el bloqueo y ve la primera.
- El orden de bloqueo (oferta y después vacantes) es el mismo que usa `editar_oferta_empresa`: una selección y una edición de vacantes simultáneas se ordenan sin deadlock, y la edición ve el conteo actualizado al exigir «al menos tantas vacantes como seleccionados».
- Aplica a la empresa y a la oficina cuando corrige el estado desde la ficha (`corregirEstadoDerivacion`, que ahora devuelve el mensaje en vez de un error interno). Sin rol (SQL Editor) no se controla, para correcciones manuales. Ojo: `supabaseAdmin` tampoco tiene rol; ninguna acción lo usa para cambiar derivaciones.
- Si la oferta no tiene fila en `oferta_vacantes`, no hay límite (igual que el cierre automático).
- Convivencia, por orden de nombre: `derivaciones_empresa_update` (validación de 028/029) corre antes, así que una transición inválida da su propio error; después de los `BEFORE` corren `derivaciones_auto_cerrar_oferta` (029, sin cambios) y `derivaciones_notificar_contratacion` (038).
- Las ofertas que ya tienen más seleccionados que vacantes no se modifican: la migración avisa cuántas hay con un `NOTICE` y la consulta para verlas. No admiten nuevas selecciones hasta que se revisen.
- En la ficha del candidato, si las vacantes ya están cubiertas, el botón «Seleccionar» queda deshabilitado con el motivo. Es solo informativo: la regla la hace cumplir la base.

---

## Consecuencias

- Para una acción nueva que escriba en más de una tabla: función de la base con las reglas de la sección 1, y la action solo valida, llama y traduce el error.
- Para una acción que cambia el estado de una sola fila: `UPDATE` condicional con el estado esperado y comprobar las filas afectadas.
- Las funciones nuevas reemplazan a las políticas RLS en su camino: si cambia una política de `ofertas`, `postulaciones` o `empresas`, hay que revisar la función correspondiente.
- Después de aplicar la 040 hay que correr `npm run db:tipos` (decisión 015).
- Si cambia la forma de contar seleccionados o de cerrar ofertas (029), hay que revisar `derivaciones_limite_vacantes` para que las dos reglas sigan coincidiendo.
