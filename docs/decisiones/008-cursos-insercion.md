# 008 — Cursos de inserción laboral

> **Actualización (2026-10-14):** los puntos 1 y 6 quedaron reemplazados por la
> decisión 012 (estados de curso y regla de rechazos, migration_035). Las
> asignaciones ahora tienen estado (asignado, en curso, completado, abandonado),
> el contador cuenta los rechazos de los últimos 90 días posteriores al último
> curso **completado** y los cursos del postulante están en `/mis-cursos`.

## Contexto

El municipio deriva postulantes a empresas a través del portal. Con el tiempo, algunos postulantes acumulan rechazos sin recibir orientación. La Oficina de Empleo necesita una herramienta para asignarles cursos de capacitación como paso previo a nuevas derivaciones.

---

## Decisiones tomadas

### 1. Contador de rechazos: cuándo se reinicia

> **Reemplazado por la decisión 012.** Hoy el contador se reinicia al completar
> un curso (no al asignarlo) y solo cuenta rechazos de los últimos 90 días.

**Decisión:** el contador de rechazos (`rechazos_desde_ultimo_curso`) cuenta las derivaciones con `estado_empresa = 'rechazado'` y `fecha_respuesta > created_at` de la última asignación de curso. Si nunca se asignó un curso, cuenta todos los rechazos históricos.

**Razonamiento:**
- El contador mide cuánto tiempo ha pasado desde que el postulante recibió orientación, no si completó el curso.
- Reiniciarlo al momento de la asignación —no al completarlo— es coherente con que el portal no hace seguimiento de completitud.
- Reiniciar sobre `fecha_respuesta` (no `created_at` de la derivación) evita contar rechazos anteriores a la asignación que todavía no habían sido respondidos.

**Regla exacta:** `count(derivaciones where estado_empresa = 'rechazado' and fecha_respuesta > último_curso.created_at)`.

---

### 2. Asignación manual (sin automatización)

> Sigue vigente: la regla de la decisión 012 solo marca a quién le hace falta
> un curso; la asignación la hace siempre la oficina y nunca bloquea
> postulaciones ni derivaciones.

**Decisión:** la asignación de cursos es siempre manual por parte de la municipalidad. El sistema no asigna cursos automáticamente ni bloquea postulaciones.

**Razonamiento:**
- La Oficina de Empleo conoce el contexto de cada postulante (historial presencial, situación laboral, disponibilidad). Una regla automática ignoraría ese contexto.
- El umbral de 3 rechazos es una señal visual, no una restricción técnica. El operador puede ignorarla o actuar antes.
- No bloquear postulaciones garantiza que el postulante no quede en un estado inerte esperando que alguien le asigne un curso.

---

### 3. Uso de funciones SECURITY DEFINER en lugar de vistas o RLS directo

**Decisión:** la lógica de filtrado y conteo se implementa en funciones PostgreSQL con `SECURITY DEFINER` y `search_path = ''`.

**Razonamiento:** coherente con el patrón establecido en `migration_028` (derivaciones) y `migration_029`. Las funciones encapsulan la lógica de acceso y permiten que el postulante consulte sus propios datos sin exponer columnas internas como `nota`.

Funciones implementadas:
- `rechazos_desde_ultimo_curso(p_postulante_id uuid)` — contador para la vista admin
- `contar_postulantes_esperando_curso()` — badge del panel principal
- `postulantes_esperando_curso_ids()` — pre-filtro de la lista de postulantes
- `rechazos_por_postulantes(p_postulante_ids uuid[])` — batch de conteos para la tabla
- `mis_cursos_asignados()` — cursos visibles al postulante autenticado (sin `nota`)

---

### 4. La `nota` interna nunca se expone al postulante

**Decisión:** `asignaciones_curso.nota` es visible solo para la municipalidad. `mis_cursos_asignados()` no la devuelve.

**Razonamiento:** la nota es un campo de trabajo interno (observaciones operativas, contexto de la decisión). Exponerla al postulante podría generar confusión o conflicto.

---

### 5. Columna `activo` en lugar de borrado lógico

**Decisión:** los cursos tienen una columna `activo boolean default true`. Un curso inactivo no puede asignarse (trigger), pero sus asignaciones históricas se conservan.

**Razonamiento:** mantener el historial de asignaciones aunque el curso sea discontinuado. La eliminación física solo está permitida si el curso no tiene asignaciones.

---

### 6. Dónde se muestran los cursos al postulante

> **Reemplazado.** Los cursos están en la página `/mis-cursos` (con su detalle en
> `/mis-cursos/[asignacionId]`), con acceso desde el menú del usuario. Mientras
> tiene un curso pendiente, el postulante ve un aviso en Mi perfil y en Mis
> postulaciones (decisión 012).

**Decisión:** en `/mis-postulaciones`, debajo del listado de postulaciones.

**Alternativas descartadas:**
- `/perfil`: menos visible; el postulante no la visita con frecuencia.
- Página dedicada `/mis-cursos`: agrega una entrada al menú sin justificación suficiente dado el volumen esperado.

---

## Pendientes con la Municipalidad

Los siguientes puntos quedaron abiertos y requieren confirmación del equipo de la Oficina de Empleo antes de implementar:

Estado al 2026-10-14: los puntos 1, 3 y 5 se resolvieron en la decisión 012
(umbral y ventana en `parametros_cursos()`, sin panel de configuración; el
postulante marca el curso como completado y la oficina como abandonado; una
sola asignación activa por postulante). Los puntos 2, 4 y 6 siguen abiertos.

1. **Umbral de rechazos configurable:** el valor 3 está hardcodeado en la UI. ¿Debería ser configurable desde el panel sin despliegue?
2. **Modalidades de cursado:** ¿se necesita distinguir entre cursos presenciales, virtuales e híbridos?
3. **Seguimiento de completitud:** ¿el operador necesita marcar que el postulante terminó el curso? ¿Hay consecuencias en el flujo si no lo completa?
4. **Notificación al postulante:** ¿debería llegarte un email cuando se le asigna un curso?
5. **Límite de asignaciones simultáneas:** ¿puede asignarse más de un curso activo al mismo tiempo?
6. **Reporte de cursos:** ¿se necesita exportar el listado de postulantes por curso para presentaciones internas?
