# 019 — Dashboard de indicadores

**Fecha:** 2026-10-17
**Estado:** Vigente
**Migración:** `migration_047_indicadores_portal.sql`

---

## Contexto

La oficina necesita consultar cómo funciona el portal (postulantes, ofertas, postulaciones, derivaciones, contrataciones, rechazos y cursos) con datos reales. El inicio de admin tenía tres tarjetas de empresas (pendientes, aprobadas y rechazadas) de una primera versión; se quitaron y los números pasaron al dashboard `/admin/indicadores`.

---

## Decisiones tomadas

### 1. El cálculo vive en funciones de la base

Tres funciones `SECURITY DEFINER` con `SET search_path = ''`, que fallan con `42501` para cualquier rol que no sea `municipalidad` (incluido el SQL Editor):

| Función | Devuelve |
|---|---|
| `indicadores_portal(p_desde)` | Una fila con los totales y los indicadores del período |
| `postulaciones_por_mes()` | 12 filas (mes actual y 11 anteriores) |
| `postulaciones_por_rubro(p_desde, p_limite)` | Rubros de mayor a menor, con el resto en "Otros rubros" |

Por qué en la base y no en la aplicación:

- **Una sola consulta por bloque.** Con PostgREST serían 15 `count` separados más traer filas para agrupar por mes y por rubro. La base cuenta, agrupa y promedia sin mandar filas a Next.js.
- **Mismos criterios que el resto del sistema.** Las empresas sin email confirmado se excluyen leyendo `auth.users`, que la aplicación no puede leer (042). La fecha del rechazo es la misma que usa `postulaciones_no_seleccionadas` (038).
- **Zona horaria.** Los meses se arman en hora de Argentina (`America/Argentina/Buenos_Aires`) en la base, sin depender de la zona del servidor.
- **Autorización.** El control de rol está en la función; la página además usa `requerirRolPagina("municipalidad")` (decisión 015).

Ningún número es estático: la página es dinámica y llama a las funciones en cada carga.

### 2. Qué mide cada indicador

`p_desde` es el comienzo del período (`NULL` = desde el inicio). El período termina siempre en el momento de la consulta. Cada evento cuenta **en la fecha en que ocurrió**, no en la fecha de la postulación.

**Situación actual (no depende del período)**

| Indicador | Cálculo |
|---|---|
| Postulantes registrados | Filas de `postulantes` |
| Ofertas activas y vigentes | `ofertas.estado = 'activa'` y `vence_en > now()`: las que se ven en el portal (013). Igual que la pestaña Activas de `/admin/ofertas` |
| Empresas pendientes de revisión | `estado_aprobacion = 'pendiente'` con el email confirmado (`auth.users.email_confirmed_at`) |
| Empresas aprobadas / rechazadas | `estado_aprobacion = 'aprobada'` / `'rechazada'`. La base no deja aprobar ni rechazar una empresa sin email confirmado (042), así que solo las pendientes pueden estar sin confirmar |

**En el período**

| Indicador | Cálculo | Fecha que se mira |
|---|---|---|
| Postulaciones nuevas | Filas de `postulaciones` | `postulaciones.created_at` |
| Derivaciones a empresas | Filas de `derivaciones` | `derivaciones.created_at` |
| Contrataciones | `derivaciones.estado_empresa = 'contratado'` | `COALESCE(fecha_respuesta, updated_at)` |
| No seleccionados por la empresa | `derivaciones.estado_empresa = 'rechazado'` | `COALESCE(fecha_respuesta, updated_at)` |
| No seleccionados por la oficina | `postulaciones.estado = 'rechazada_municipalidad'` | `postulaciones.updated_at` |
| Pre-entrevistas realizadas | `pre_entrevistas.estado = 'realizada'` | `pre_entrevistas.fecha_hora` |
| Cursos asignados | Filas de `asignaciones_curso` | `asignaciones_curso.created_at` |
| Cursos completados | `asignaciones_curso.estado = 'completado'` | `asignaciones_curso.completado_en` |

`fecha_respuesta` la completa el trigger de derivaciones al pasar a un estado final (028/029); `updated_at` es solo para filas viejas sin esa fecha, igual que en `postulaciones_no_seleccionadas`.

**Derivados del período**

| Indicador | Cálculo |
|---|---|
| Tasa de contratación | `contrataciones / (contrataciones + no seleccionados por la empresa) × 100`, con un decimal. Solo las derivaciones con resultado final: las que siguen en "Por contactar" o "Entrevista coordinada" no cuentan. Sin resultados en el período: `NULL` ("—") |
| Días hasta la derivación | Promedio de `derivaciones.created_at − postulaciones.created_at`, en días con un decimal, de las derivaciones del período. Sin derivaciones: `NULL` ("—") |

**Gráficos**

- **Postulaciones por mes:** los últimos 12 meses (incluido el actual, que puede estar incompleto) en hora de Argentina. Los meses sin postulaciones aparecen en 0 (`generate_series` + `LEFT JOIN`). No depende del período elegido. *Desde la migración 061 la pantalla usa `postulaciones_por_periodo`, que sigue al período (decisión [032](032-graficos-de-indicadores.md), punto 6); esta función queda sin uso.*
- **Postulaciones por rubro:** la categoría de la oferta (`oferta_categorias`). Una oferta puede tener varias categorías y la postulación cuenta en cada una, así que **la suma puede superar** las postulaciones nuevas del período. Las ofertas sin categoría cuentan como "Sin rubro". Se muestran los 8 primeros (`p_limite`, entre 1 y 20) y el resto se suma en "Otros rubros". Empates: por nombre.

### 3. Índices

Se agregaron, con `IF NOT EXISTS`:

- `postulaciones_created_at_idx (created_at)`: postulaciones es la tabla que más crece y la usan las postulaciones nuevas, el gráfico por mes y el gráfico por rubro.
- `derivaciones_created_at_idx (created_at)`: derivaciones del período y días promedio.

El resto usa índices que ya existían: `ofertas_activas_vence_en_idx` (036), `pre_entrevistas_estado_fecha_idx` (044), `asignaciones_curso_completado_en_idx` (035), `idx_derivaciones_rechazado` (028) y la clave primaria de `oferta_categorias`. Las cuentas con `COALESCE(fecha_respuesta, updated_at)` y los totales de empresas recorren tablas chicas; con el volumen de un municipio no justifican índices nuevos.

### 4. Página

- `/admin/indicadores`, solo para la oficina, con link en el inicio de admin y en el menú de usuario de la oficina.
- Período en la URL (`?periodo=30d|90d|anio|todo`, por defecto `30d`). "Este año" empieza el 1 de enero a las 00:00 en Argentina.
- Los indicadores se agrupan en **Portal** y **Empresas** (situación actual) y **Proceso de selección** y **Cursos** (período). Cada uno lleva a la pantalla con el detalle cuando existe. Los links muestran el listado actual, que no se filtra por el período.
- Los gráficos son CSS, sin librerías: barras decorativas (`aria-hidden`), valores siempre visibles y una tabla equivalente `sr-only` para lectores de pantalla.
- Sin actividad en el período: estado vacío con un link a "Desde el inicio". Carga con esqueleto (`loading.tsx` y `Suspense` por período). Errores con `logError` + `ErrorListado`.

---

## Consecuencias

- Cambiar un criterio (por ejemplo, qué cuenta como contratación) es reemplazar la función con una migración nueva; la página no cambia.
- Si se agrega un estado nuevo a postulaciones, derivaciones o cursos, hay que revisar estas funciones.
- Las cuentas se calculan en cada carga. Si el volumen creciera mucho, la alternativa es una vista materializada actualizada por cron.
