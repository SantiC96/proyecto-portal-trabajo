# 012 — Estados de curso y regla de rechazos

**Fecha:** 2026-10-14 (actualizada el 2026-10-15 con las migraciones 038 y 039, y el 2026-10-17 con la 046)
**Estado:** Vigente
**Reemplaza:** los puntos 1 y 6 de la decisión 008 y responde sus pendientes 1, 3 y 5.

> **Cambios de la migración 038 (2026-10-15)**
>
> - El postulante tiene que **empezar** el curso antes de completarlo: se quitó `asignado → completado` (también para el caso sin rol). Si lo intenta, la base responde "Primero tenés que empezar el curso." En la interfaz, con estado `asignado` solo se ve "Empezar curso"; "Marcar como completado" aparece con `en_curso`.
> - La oficina **ya no marca cursos como abandonados ni los reactiva**. Se quitaron los botones, la server action `cambiarEstadoAsignacion` y el componente `acciones-asignacion.tsx`; el trigger rechaza esos cambios con un mensaje claro si se intentan por fuera de la interfaz.
> - El valor `abandonado` sigue en el `CHECK`: la migración 035 pudo dejar asignaciones viejas en ese estado. Se muestran como "Abandonado", solo lectura, y el filtro "Abandonado" de `admin/cursos/[id]` aparece solo si hay alguna.
> - Se quitó del inicio de admin el contador "Cursos completados en los últimos 7 días". La página `/admin/cursos/completados` se mantiene porque sigue enlazada desde `admin/cursos`.

> **Cambios de la migración 039 (2026-10-15)**
>
> - **Solo se asigna curso a quien lo necesita** (`necesita_curso` de `estado_cursos_postulantes()`). Ver el punto 6.
> - El listado `admin/postulantes` se abre siempre sin filtros: la tarjeta "Postulantes" del inicio de admin sigue mostrando "N con 3 o más rechazos", pero lleva al listado completo. El filtro "Esperando curso" se aplica solo si lo elige el usuario.

> **Cambios de la migración 046 (2026-10-17) — varios cursos a la vez**
>
> - **Un postulante puede tener varios cursos pendientes a la vez.** Se quitó el índice `asignaciones_curso_una_activa_idx`. En su lugar, `asignaciones_curso_mismo_curso_activo_idx (postulante_id, curso_id) WHERE estado IN ('asignado','en_curso')`: no puede tener dos asignaciones activas **del mismo curso**. Ver el punto 2.
> - La regla se divide en dos (punto 3): **`puede_recibir_curso`** (3 o más rechazos en 90 días, posteriores al último curso completado, tenga o no cursos activos) y **`necesita_curso`** (`puede_recibir_curso` y ningún curso activo).
> - Para **asignar** alcanza con `puede_recibir_curso` (punto 6). El aviso a la oficina, el filtro "Esperando curso" y el contador del inicio siguen usando `necesita_curso`.
> - `estado_cursos_calculo()` y `estado_cursos_postulantes()` suman `puede_recibir_curso` y `cursos_activos` (cambió el retorno: se borraron y se volvieron a crear con los mismos permisos).
> - Al completar **cualquier** curso los rechazos vuelven a 0, como antes; los demás cursos pendientes siguen activos.

---

## Contexto

Hasta la migración 034 una asignación de curso no tenía estado: la oficina no sabía si el postulante lo había empezado o terminado, y el contador de rechazos se reiniciaba al **asignar** el curso (decisión 008). Eso tenía dos problemas:

- Un postulante podía acumular rechazos durante meses o años y aparecer como "Esperando curso" por rechazos muy viejos.
- Asignar un curso borraba el historial aunque el postulante nunca lo hiciera, y se podían asignar varios cursos a la vez.

---

## Decisiones tomadas

### 1. Estados de la asignación

`asignaciones_curso.estado` es `text` con `CHECK` (no un enum, para poder agregar valores sin una migración separada como pasó con `estado_oferta` en la 020):

| Estado | Significado | Fecha que se completa |
|---|---|---|
| `asignado` | La oficina lo asignó; el postulante todavía no lo empezó | `created_at` |
| `en_curso` | El postulante tocó "Empezar curso" | `iniciado_en` |
| `completado` | El postulante lo marcó como completado | `completado_en` |
| `abandonado` | Solo datos históricos (migración 035 o marcas anteriores a la 038). Ya no se puede llegar desde la interfaz | `abandonado_en` |

Transiciones, validadas por el trigger `asignaciones_curso_transicion` (BEFORE UPDATE):

```
Postulante:     asignado → en_curso
                en_curso → completado
Municipalidad:  ningún cambio de estado (solo edita la nota interna)
Sin rol:        las del postulante, más asignado | en_curso → abandonado
                y abandonado → asignado, solo para correcciones manuales
                desde el SQL Editor
completado → (final para todos los roles)
abandonado → (final para postulante y municipalidad)
```

Mensajes del trigger:

| Intento | Mensaje |
|---|---|
| Postulante: `asignado → completado` | Primero tenés que empezar el curso. |
| Postulante: salir de `abandonado` | Este curso figura como abandonado y ya no puede cambiar de estado. |
| Municipalidad: pasar a `abandonado` | La Oficina de Empleo no puede marcar un curso como abandonado. El curso sigue pendiente hasta que el postulante lo complete. |
| Municipalidad: reactivar | Los cursos abandonados quedan como historial y no se pueden reactivar. Si el postulante necesita un curso, asignale uno nuevo. |
| Municipalidad: cualquier otro cambio | La Oficina de Empleo no puede cambiar el estado de un curso asignado: lo actualiza el postulante. |

- El postulante **no tiene UPDATE** sobre la tabla. Cambia el estado con `actualizar_estado_mi_curso(p_asignacion_id, p_estado)`, `SECURITY DEFINER`, que verifica que la asignación sea suya.
- La municipalidad conserva el grant de UPDATE sobre `estado` y `nota` (no se tocaron los permisos), pero el trigger rechaza cualquier cambio de `estado` hecho con su rol; las fechas las completa el trigger.
- Reactivar (solo sin rol) limpia `iniciado_en` y `abandonado_en`: la asignación vuelve a empezar.
- Las filas existentes quedaron en `asignado`.

**Por qué el postulante marca su propio curso como completado:** los cursos son externos (un link) y el portal no tiene forma de verificar que se hicieron. Se confía en el postulante y la oficina ve las fechas de inicio y de finalización en el historial. Exigir el paso por `en_curso` deja registrado cuándo lo empezó. Una vez completado no se puede deshacer para que el reinicio del contador sea estable.

**Por qué la oficina ya no marca abandonos (038):** el abandono lo decidía la oficina sin un dato del postulante y le cerraba el curso sin aviso. Ahora un curso asignado queda pendiente hasta que el postulante lo complete.

### 2. Una asignación activa por curso (046)

> Hasta la 045 era **una sola asignación activa por postulante** (`asignaciones_curso_una_activa_idx`, 035). La 046 quitó ese límite.

Índice único parcial `asignaciones_curso_mismo_curso_activo_idx (postulante_id, curso_id) WHERE estado IN ('asignado','en_curso')`: un postulante puede tener varios cursos pendientes, pero no dos veces el mismo. Antes de crearlo, la migración controla en un `DO` que no haya datos que lo impidan; si los hay, no lo crea y deja un `RAISE NOTICE` con la consulta para revisarlos.

- **Alta** (`asignaciones_curso_alta_fn`, BEFORE INSERT): para **todos los roles**, si el postulante ya tiene ese curso asignado o en curso, P0001 "Este postulante ya tiene este curso pendiente." (el índice lo impediría igual; el trigger da el mensaje claro). La fila del postulante se bloquea con `FOR UPDATE` para que dos asignaciones simultáneas del mismo curso se ordenen y la segunda reciba ese mensaje en lugar del error de clave duplicada.
- **Reactivación** (`abandonado → asignado`, solo sin rol, en `asignaciones_curso_transicion_fn`): solo la impide otra asignación activa **del mismo curso**, con el mismo mensaje. Otros cursos activos no importan.
- En la server action, un `23505` (el índice) se traduce al mismo mensaje.

**Datos de la 035:** si un postulante tenía más de una asignación, se conservó activa la más reciente y las anteriores pasaron a `abandonado` (con `abandonado_en` = momento de la migración). No se borró ninguna fila. La 046 no cambia esas filas.

### 3. Regla de rechazos

> Un postulante **puede recibir un curso** (`puede_recibir_curso`) cuando tiene **3 o más rechazos dentro de los últimos 90 días**, contando solo los posteriores a su **último curso completado**, tenga o no cursos activos.
>
> Un postulante **necesita curso** (`necesita_curso`) cuando puede recibir un curso y además **no tiene ningún curso activo** (asignado o en curso).

| | `puede_recibir_curso` | `necesita_curso` |
|---|---|---|
| Regla | 3 o más rechazos en la ventana | `puede_recibir_curso` y 0 cursos activos |
| La usan | el botón "Asignar curso", `asignarCurso` y el trigger de alta | el aviso `necesita_curso` a la oficina, el filtro "Esperando curso", el contador del inicio, la etiqueta "Necesita curso" y el aviso al derivar |
| Por qué | la oficina decide si suma otro curso a quien sigue acumulando rechazos | lo que la oficina tiene que atender: alguien que cumple la regla y no está haciendo ningún curso |

Las dos se calculan en un solo lugar del SQL: `estado_cursos_calculo()` (043, retorno ampliado en la 046).

- **Rechazo:** derivación con `estado_empresa = 'rechazado'` (misma definición que la 030).
- **Fecha del rechazo:** `derivaciones.fecha_respuesta`, que el trigger de derivaciones fija al pasar a un estado final. Si falta (filas muy viejas), se usa `updated_at`. No se hizo backfill: actualizar `derivaciones` dispara su trigger de validación y el `COALESCE` da el mismo resultado sin tocar datos.
- **Reinicio:** al **completar** un curso cualquiera (no al asignarlo), los rechazos en la ventana vuelven a 0; los demás cursos pendientes siguen activos. Una asignación histórica en `abandonado` no reinicia nada: si ya tenía 3 rechazos en la ventana, aparece como "Esperando curso".
- **Mientras tiene cursos asignados o en curso**, los rechazos nuevos se cuentan pero no generan aviso ni lo ponen en "Esperando curso" (`necesita_curso = false`); si llega al umbral, la oficina **puede** asignarle otro curso (`puede_recibir_curso = true`).
- **3 y 90 viven en un solo lugar del SQL:** `public.parametros_cursos()`. En TypeScript, `UMBRAL_RECHAZOS_CURSO` y `VENTANA_RECHAZOS_DIAS` (`src/lib/cursos.ts`) se usan solo para los textos. Si se cambia uno hay que cambiar el otro.

**Por qué 90 días:** un rechazo de hace más de un trimestre dice poco sobre la situación actual del postulante, y la ventana evita que alguien quede marcado para siempre por rechazos viejos.

### 4. Funciones

`estado_cursos_postulantes(p_postulante_ids uuid[])` (solo municipalidad) devuelve lo que calcula `estado_cursos_calculo()` (sin control de rol, para los triggers) por postulante: rechazos en la ventana, rechazos totales, `necesita_curso`, una asignación activa y su estado (la en curso más reciente o, si no hay, la asignada más reciente), el estado de la última asignación, la fecha del último curso completado y, desde la 046, `puede_recibir_curso` y `cursos_activos` (cantidad de asignaciones en `asignado` o `en_curso`). Las funciones de la 030 se reescribieron sobre ella **con la misma firma y el mismo retorno**:

| Función | Ahora devuelve |
|---|---|
| `rechazos_desde_ultimo_curso(uuid)` | rechazos en la ventana (el nombre quedó por compatibilidad) |
| `contar_postulantes_esperando_curso()` | postulantes con `necesita_curso` |
| `postulantes_esperando_curso_ids()` | ids con `necesita_curso` |
| `rechazos_por_postulantes(uuid[])` | rechazos en la ventana (> 0) |

`mis_cursos_asignados()` no podía cambiar su retorno con `CREATE OR REPLACE`, así que se creó `mis_cursos_con_estado()` con estado, fechas y `por_rechazos` (si al momento de la asignación cumplía la regla, para el texto del aviso). La vieja queda sin uso.

### 5. Lo que ve cada rol

- **Postulante:** aviso en Mi perfil (la página a la que llega después de iniciar sesión) y en Mis postulaciones mientras tenga cursos asignados o en curso (con uno, el texto de siempre; con varios, la cantidad y un enlace a cada uno); indicador con la cantidad en "Mis cursos" del menú; badge de estado y botones "Empezar curso" / "Marcar como completado" (con confirmación). Tener un curso pendiente **no bloquea** las postulaciones (ni en el código ni en la base).
- **Oficina:** estado y fechas en `admin/cursos/[id]` con filtro por estado, solo lectura; filtros "Esperando curso" (regla nueva) y "Con curso pendiente", rechazos en la ventana, "N curso(s) pendiente(s) por terminar" (cantidad real) y botón "Asignar curso" (si `puede_recibir_curso`, aunque tenga cursos pendientes) en cada fila de `admin/postulantes`; sección "Rechazos y cursos" en la ficha, con historiales paginados; en el inicio, la tarjeta "Postulantes" muestra cuántos tienen 3 o más rechazos y lleva al listado sin filtros (039). La lista de cursos completados (`/admin/cursos/completados`) se abre desde `admin/cursos`.
- **Al derivar:** si el postulante necesita curso, tiene cursos pendientes ("no completó el curso asignado" o "no completó los N cursos asignados") o su última asignación figura como abandonada (dato histórico), el diálogo de derivación muestra un aviso. **No bloquea**: decide la oficina.

### 6. Asignar curso solo a quien puede recibirlo (039, 046)

> La oficina solo puede asignar un curso a un postulante que **puede recibir un curso** según la regla del punto 3. En la 039 se exigía `necesita_curso`; desde la 046 alcanza con `puede_recibir_curso`, aunque ya tenga otros cursos pendientes.

- **Interfaz:** el botón "Asignar curso" aparece cuando `puede_recibir_curso` es verdadero, en la fila de `admin/postulantes` y en la ficha `admin/postulantes/[id]`, aunque el postulante tenga cursos pendientes. La ficha muestra además "N curso(s) pendiente(s) por terminar". El diálogo **no ofrece los cursos que el postulante ya tiene pendientes**; si ya tiene pendientes todos los cursos activos, lo dice y no muestra el botón de confirmar. No hay otros puntos de asignación (`admin/cursos` solo muestra las asignaciones).
- **Server action** `asignarCurso`: antes de insertar consulta `estado_cursos_postulantes()`; si no puede recibir curso, `REGLA_DE_NEGOCIO` con "Solo se puede asignar un curso a postulantes con 3 o más rechazos recientes." El mismo curso pendiente lo rechaza la base (P0001, o `23505` del índice) con "Este postulante ya tiene este curso pendiente."
- **Base** (`asignaciones_curso_alta_fn`, BEFORE INSERT): primero el control del mismo curso (todos los roles, punto 2); después, si inserta la municipalidad y el postulante no puede recibir curso, `RAISE EXCEPTION` (P0001) con el mismo mensaje de la 039. **Sin rol** (SQL Editor o service role) no se exige la regla de rechazos, para correcciones manuales.
- Las asignaciones ya existentes no se tocan.

**Por qué:** el curso es la respuesta de la oficina a los rechazos repetidos. Asignarlo a quien no cumple la regla mezcla el historial y reinicia el contador al completarlo sin motivo. La validación está en las tres capas para que no dependa de que el botón esté oculto.

---

## Archivos clave

```
src/migrations/migration_035_estados_curso_y_regla_rechazos.sql
src/migrations/migration_038_cursos_sin_abandono_y_notificaciones.sql — transiciones vigentes
src/migrations/migration_039_asignar_curso_solo_si_necesita.sql — alta solo si necesita curso
src/migrations/migration_046_varios_cursos_e_informacion_laboral.sql — varios cursos, puede_recibir_curso
src/lib/cursos.ts                                 — constantes, etiquetas, tipos, aviso al derivar
src/app/(dashboard)/mis-cursos/actions.ts         — actualizarEstadoMiCurso
src/app/(dashboard)/mis-cursos/acciones-mi-curso.tsx
src/app/admin/cursos/actions.ts                   — asignarCurso (valida puede_recibir_curso)
src/app/admin/postulantes/asignar-curso-dialog.tsx
src/components/cursos/aviso-curso-pendiente.tsx
src/components/cursos/estado-curso-badge.tsx
src/app/admin/cursos/completados/page.tsx
```
