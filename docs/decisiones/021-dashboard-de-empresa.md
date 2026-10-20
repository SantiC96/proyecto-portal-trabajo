# 021 — Dashboard de indicadores de la empresa

**Fecha:** 2026-10-18
**Estado:** Vigente
**Migración:** `migration_049_indicadores_empresa.sql`

---

## Contexto

La oficina ya tiene su dashboard (decisión [019](019-dashboard-de-indicadores.md)). Las empresas solo veían cuántas ofertas tenían en cada estado en el inicio de su panel; para saber cómo avanzaba cada búsqueda tenían que entrar oferta por oferta. Se agrega `/empresa/indicadores` con los números de sus ofertas y de los candidatos que la oficina les derivó.

La regla que no se puede romper: **una empresa solo ve datos de sus ofertas y de las derivaciones que recibió**. Nunca datos de otras empresas ni postulaciones que la oficina no le derivó.

---

## Decisiones tomadas

### 1. El cálculo vive en funciones de la base, como en la 019

| Función | Devuelve |
|---|---|
| `indicadores_empresa(p_desde)` | Una fila con los totales de la empresa |
| `indicadores_por_oferta_empresa(p_desde)` | Una fila por oferta de la empresa |

Las dos son `SECURITY DEFINER` con `SET search_path = ''` y `EXECUTE` solo para `authenticated`. Hacen falta como `SECURITY DEFINER` porque la empresa no tiene `SELECT` en `postulaciones` ni en `derivaciones` (028): las ve únicamente a través de funciones.

### 2. Cómo se garantiza que cada empresa vea solo lo suyo

- **Rol:** las dos funciones fallan con `42501` si `rol_actual()` no es `empresa` (también desde el SQL Editor, donde el rol es `NULL`).
- **Empresa:** sale de `auth.uid()` (`empresas.usuario_id`), nunca de un parámetro. El único parámetro es `p_desde`, una fecha. Desde la aplicación tampoco se pasa ningún id (`src/lib/empresa/indicadores.ts`).
- **Empresa no aprobada:** `indicadores_empresa` devuelve una fila en cero y `indicadores_por_oferta_empresa` no devuelve filas. Además, el layout del panel ya no muestra la página a una empresa pendiente o rechazada.
- **Ofertas:** solo las de `ofertas.empresa_id` = la empresa de la sesión.
- **Candidatos:** solo las derivaciones de esas ofertas. Las postulaciones se leen siempre a través de una derivación (`JOIN`, no `LEFT JOIN`), así que las que la oficina no derivó no cuentan en ningún número.
- **Sin datos personales:** las funciones devuelven solo cantidades, títulos de ofertas propias y estados. Nombres y datos de los candidatos siguen saliendo de `candidato_para_empresa` (decisión [007](007-acceso-candidatos-empresa.md)).

### 3. Qué mide cada indicador

`p_desde` es el comienzo del período (`NULL` = desde el inicio); el período termina en el momento de la consulta. Los períodos son los mismos que en la oficina (30 días, 90 días, este año, desde el inicio).

**Situación actual (no depende del período)**

| Indicador | Cálculo |
|---|---|
| Ofertas publicadas y vigentes | `estado = 'activa'` y `vence_en > now()` |
| Pendientes de revisión | `estado = 'pendiente_aprobacion'` |
| Vencidas | `estado = 'activa'` y `vence_en <= now()` (decisión [013](013-vencimiento-de-ofertas.md)) |
| Cerradas / Rechazadas | `estado = 'cerrada'` / `'rechazada'` |
| Vacantes | Suma de `oferta_vacantes.cantidad` de las ofertas publicadas alguna vez (`publicado_en` no nulo, o `activa` / `cerrada` para las ofertas anteriores a la 026, que no tienen esa fecha) |
| Vacantes cubiertas | Seleccionados de cada una de esas ofertas, como máximo sus vacantes |

Son los mismos criterios de estado que el resumen del inicio del panel. Las rechazadas no estaban en el pedido original; se muestran para que los estados sumen el total de ofertas.

**En el período**

| Indicador | Cálculo | Fecha que se mira |
|---|---|---|
| Candidatos derivados | Filas de `derivaciones` de sus ofertas | `derivaciones.created_at` |
| Entrevistas coordinadas | Derivaciones con `fecha_entrevista` | `fecha_entrevista` (incluye las próximas) |
| Seleccionados | `estado_empresa = 'contratado'` | `COALESCE(fecha_respuesta, updated_at)` |
| No seleccionados | `estado_empresa = 'rechazado'` | `COALESCE(fecha_respuesta, updated_at)` |
| Días hasta la selección | Promedio de `fecha del resultado − derivaciones.created_at` de los seleccionados del período, en días con un decimal. Sin seleccionados: `NULL` ("—") | |

La base no guarda cuándo se coordinó una entrevista, solo para cuándo es. Por eso las entrevistas cuentan por `fecha_entrevista`: una entrevista reprogramada cuenta una sola vez, en la fecha nueva.

**Por oferta:** título, estado, vacantes, cubiertas (desde siempre), derivados, entrevistas y seleccionados (del período) y vencimiento, con las mismas fechas que los totales. Aparecen todas las ofertas de la empresa, de la más nueva a la más vieja, como en Mis ofertas. El estado viene tal como está en la base y la aplicación muestra "Vencida" con `estadoVencimiento()`, igual que en el resto del panel.

### 4. Índices

No se agregan. Todo parte de las ofertas de una empresa y baja por claves con índice: `ofertas_empresa_id_idx` (021), el `UNIQUE (oferta_id, postulante_id)` de `postulaciones`, el `UNIQUE (postulacion_id)` de `derivaciones` y la clave primaria de `oferta_vacantes`. Los filtros por fecha se aplican sobre las derivaciones de una sola empresa, que son pocas.

### 5. Página y componentes compartidos

- `/empresa/indicadores`, dentro de `src/app/empresa/(panel)/`, con acceso desde el menú de usuario (escritorio y celular) y una tarjeta en el inicio del panel.
- Período en la URL (`?periodo=`), igual que la oficina. Bloques: **Ofertas** y **Vacantes** (situación actual), **Candidatos** (período) y **Por oferta**.
- Por oferta: tabla en pantallas anchas (`lg`) y tarjetas en el celular y la tablet, sin scroll horizontal. Cada fila lleva al detalle de la oferta.
- Sin ofertas: estado vacío con el botón para publicar la primera. Sin actividad en el período: estado vacío con link a "Desde el inicio".
- Carga con esqueleto (`loading.tsx` y `Suspense` por período). Errores con `logError` + `ErrorListado`, cada bloque por separado.
- Lo que antes era solo del dashboard de la oficina y ahora usan los dos pasó a lugares comunes, sin cambios visuales:
  - `src/lib/indicadores-periodo.ts`: períodos, etiquetas y cálculo de `p_desde`.
  - `src/components/indicadores/`: `GrupoIndicadores` (con una prop opcional `columnas`), `SelectorPeriodo`, `TituloBloque` y `EsqueletoGrupo`.
  - `src/lib/oferta-estados.ts`: etiquetas y colores del estado de oferta que ve la empresa, que estaban en Mis ofertas.

---

## Consecuencias

- Cambiar un criterio es reemplazar la función con una migración nueva; la página no cambia.
- Si se agrega un estado de oferta o de derivación, hay que revisar estas funciones y las de la 047.
- La lista por oferta no se pagina: una empresa tiene pocas ofertas. Si eso cambiara, la función devuelve un conjunto de filas y PostgREST puede paginarlo como en `derivaciones_de_oferta_empresa`.
