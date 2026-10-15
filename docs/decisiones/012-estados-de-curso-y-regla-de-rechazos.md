# 012 — Estados de curso y regla de rechazos

**Fecha:** 2026-10-14 (actualizada el 2026-10-15 con las migraciones 038 y 039)
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

**Por qué la oficina ya no marca abandonos (038):** el abandono lo decidía la oficina sin un dato del postulante y le cerraba el curso sin aviso. Ahora un curso asignado queda pendiente hasta que el postulante lo complete; mientras tanto no se le puede asignar otro (índice de una sola asignación activa).

### 2. Una sola asignación activa por postulante

Índice único parcial `asignaciones_curso_una_activa_idx (postulante_id) WHERE estado IN ('asignado','en_curso')`. Además, un trigger BEFORE INSERT y el trigger de transiciones devuelven un mensaje claro (P0001) en lugar del error de clave duplicada.

**Datos existentes:** si un postulante tenía más de una asignación, se conservó activa la más reciente y las anteriores pasaron a `abandonado` (con `abandonado_en` = momento de la migración). No se borró ninguna fila.

Desde la 038, el mensaje del trigger BEFORE INSERT ya no sugiere marcar la asignación actual como abandonada: "Este postulante ya tiene un curso asignado o en curso. Podrá recibir otro cuando complete el actual."

### 3. Regla de rechazos

> Un postulante **necesita curso** cuando tiene **3 o más rechazos dentro de los últimos 90 días**, contando solo los posteriores a su **último curso completado**, y **no tiene una asignación activa**.

- **Rechazo:** derivación con `estado_empresa = 'rechazado'` (misma definición que la 030).
- **Fecha del rechazo:** `derivaciones.fecha_respuesta`, que el trigger de derivaciones fija al pasar a un estado final. Si falta (filas muy viejas), se usa `updated_at`. No se hizo backfill: actualizar `derivaciones` dispara su trigger de validación y el `COALESCE` da el mismo resultado sin tocar datos.
- **Reinicio:** al **completar** un curso (no al asignarlo). Una asignación histórica en `abandonado` no reinicia nada: si ya tenía 3 rechazos en la ventana, aparece como "Esperando curso".
- **Mientras tiene un curso asignado o en curso**, los rechazos nuevos no generan otro curso (`necesita_curso = false`), pero sí se cuentan.
- **3 y 90 viven en un solo lugar del SQL:** `public.parametros_cursos()`. En TypeScript, `UMBRAL_RECHAZOS_CURSO` y `VENTANA_RECHAZOS_DIAS` (`src/lib/cursos.ts`) se usan solo para los textos. Si se cambia uno hay que cambiar el otro.

**Por qué 90 días:** un rechazo de hace más de un trimestre dice poco sobre la situación actual del postulante, y la ventana evita que alguien quede marcado para siempre por rechazos viejos.

### 4. Funciones

`estado_cursos_postulantes(p_postulante_ids uuid[])` concentra la regla y devuelve por postulante: rechazos en la ventana, rechazos totales, si necesita curso, la asignación activa y su estado, el estado de la última asignación y la fecha del último curso completado. Las funciones de la 030 se reescribieron sobre ella **con la misma firma y el mismo retorno**:

| Función | Ahora devuelve |
|---|---|
| `rechazos_desde_ultimo_curso(uuid)` | rechazos en la ventana (el nombre quedó por compatibilidad) |
| `contar_postulantes_esperando_curso()` | postulantes con `necesita_curso` |
| `postulantes_esperando_curso_ids()` | ids con `necesita_curso` |
| `rechazos_por_postulantes(uuid[])` | rechazos en la ventana (> 0) |

`mis_cursos_asignados()` no podía cambiar su retorno con `CREATE OR REPLACE`, así que se creó `mis_cursos_con_estado()` con estado, fechas y `por_rechazos` (si al momento de la asignación cumplía la regla, para el texto del aviso). La vieja queda sin uso.

### 5. Lo que ve cada rol

- **Postulante:** aviso en Mi perfil (la página a la que llega después de iniciar sesión) y en Mis postulaciones mientras tenga un curso asignado o en curso; indicador con la cantidad en "Mis cursos" del menú; badge de estado y botones "Empezar curso" / "Marcar como completado" (con confirmación). Tener un curso pendiente **no bloquea** las postulaciones (ni en el código ni en la base).
- **Oficina:** estado y fechas en `admin/cursos/[id]` con filtro por estado, solo lectura; filtros "Esperando curso" (regla nueva) y "Con curso pendiente", rechazos en la ventana, "N curso(s) pendiente(s) por terminar" y botón "Asignar curso" (solo si necesita curso) en cada fila de `admin/postulantes`; sección "Rechazos y cursos" en la ficha, con historiales paginados; en el inicio, la tarjeta "Postulantes" muestra cuántos tienen 3 o más rechazos y lleva al listado sin filtros (039). La lista de cursos completados (`/admin/cursos/completados`) se abre desde `admin/cursos`.
- **Al derivar:** si el postulante necesita curso, tiene uno pendiente o su última asignación figura como abandonada (dato histórico), el diálogo de derivación muestra un aviso. **No bloquea**: decide la oficina.

### 6. Asignar curso solo a quien lo necesita (039)

> La oficina solo puede asignar un curso a un postulante que **necesita curso** según la regla del punto 3.

- **Interfaz:** el botón "Asignar curso" aparece solo cuando `necesita_curso` es verdadero, tanto en la fila de `admin/postulantes` como en la ficha `admin/postulantes/[id]`. Si el postulante ya tiene un curso pendiente, la ficha muestra "Ya tiene un curso pendiente" como antes. Si no necesita curso, no se muestra nada. No hay otros puntos de asignación (`admin/cursos` solo muestra las asignaciones).
- **Server action** `asignarCurso`: antes de insertar consulta `estado_cursos_postulantes()`. Con una asignación activa devuelve `REGLA_DE_NEGOCIO` con el mensaje de siempre; si no necesita curso, `REGLA_DE_NEGOCIO` con "Solo se puede asignar un curso a postulantes con 3 o más rechazos recientes."
- **Base** (`asignaciones_curso_alta_fn`, BEFORE INSERT): si inserta la municipalidad y el postulante no necesita curso, `RAISE EXCEPTION` (P0001) con el mismo mensaje. **Sin rol** (SQL Editor o service role) se permite, para correcciones manuales. El control de asignación activa va primero, así conserva su mensaje. El resto de la función no cambió respecto de la 038.
- Las asignaciones ya existentes no se tocan.

**Por qué:** el curso es la respuesta de la oficina a los rechazos repetidos. Asignarlo a quien no cumple la regla mezcla el historial y reinicia el contador al completarlo sin motivo. La validación está en las tres capas para que no dependa de que el botón esté oculto.

---

## Archivos clave

```
src/migrations/migration_035_estados_curso_y_regla_rechazos.sql
src/migrations/migration_038_cursos_sin_abandono_y_notificaciones.sql — transiciones vigentes
src/migrations/migration_039_asignar_curso_solo_si_necesita.sql — alta solo si necesita curso
src/lib/cursos.ts                                 — constantes, etiquetas, tipos, aviso al derivar
src/app/(dashboard)/mis-cursos/actions.ts         — actualizarEstadoMiCurso
src/app/(dashboard)/mis-cursos/acciones-mi-curso.tsx
src/app/admin/cursos/actions.ts                   — asignarCurso (valida necesita_curso)
src/app/admin/postulantes/asignar-curso-dialog.tsx
src/components/cursos/aviso-curso-pendiente.tsx
src/components/cursos/estado-curso-badge.tsx
src/app/admin/cursos/completados/page.tsx
```
