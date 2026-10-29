# 029 — Panel del postulante

**Fecha:** 2026-10-21
**Estado:** Vigente
**Migración:** `migration_058_dashboard_postulante.sql`

---

## Contexto

La empresa tiene su panel (`/empresa`) e indicadores (decisión [021](021-dashboard-de-empresa.md)) y la oficina tiene `/admin` (decisión [019](019-dashboard-de-indicadores.md)). El postulante no tenía un inicio propio: `panelDeRol("postulante")` lo mandaba a `/perfil`, y para saber cómo iban sus postulaciones, si tenía invitaciones o qué le faltaba al perfil tenía que recorrer varias pantallas.

Se agrega `/panel`, dentro del grupo `(dashboard)`, como la página de inicio del postulante.

---

## Decisiones tomadas

### 1. Qué muestra el panel y por qué

Lo que el postulante puede hacer algo al respecto, en este orden:

| Bloque | Qué muestra | Para qué |
|---|---|---|
| Encabezado | "Hola, [nombre]" y una línea | Saber que está en su inicio |
| Tus postulaciones | Activas, en revisión, enviadas a la empresa, invitaciones para responder; seleccionadas, no seleccionadas y retiradas. Cada número lleva a Mis postulaciones o a Invitaciones | Ver de un vistazo cómo está |
| Invitaciones | "Tenés N invitaciones para responder" con botón a `/invitaciones`. Solo si hay pendientes | Que no se le pasen: vencen cuando cierra la oferta |
| Últimos movimientos | Las 5 postulaciones que cambiaron de estado más recientemente, con su badge y la fecha. Cada una lleva a esa postulación en Mis postulaciones | Enterarse de los cambios sin buscarlos |
| Completá tu perfil | Lo que le falta, cada ítem con link a la sección de `/perfil`. Solo si falta algo | Un perfil completo coincide con más ofertas |
| Ofertas para vos | Hasta 5 ofertas vigentes con coincidencia alta o media y por qué coinciden | Encontrar ofertas sin buscar |

Los números se cuentan como los muestra Mis postulaciones (mismo estado de la postulación y, si está derivada, el resultado de la empresa), para que coincidan con esa pantalla. Los detalles de cada número están en el encabezado de `indicadores_postulante()` en la migración. Las postulaciones cerradas porque la empresa retiró la oferta no entran en ningún número: no son un resultado del postulante.

Las etiquetas y badges de estado son los de Mis postulaciones, ahora en `src/lib/mis-postulaciones.ts` (antes estaban dentro de la lista). Mis postulaciones no tiene filtros ni pestañas, así que los números llevan al listado completo.

**Un solo badge por postulación.** Mis postulaciones y Últimos movimientos muestran un único badge, de `badgePostulacion()`, con esta prioridad: Retirada; Seleccionado (la empresa contrató); No seleccionado (oficina o empresa); Oferta cerrada (retirada por la empresa, cerrada o que el postulante ya no puede leer); y si no, Recibida, En revisión o Enviada a la empresa. El estado de la oferta no lleva badge propio: una oferta en revisión o rechazada con la postulación en curso se avisa en una línea debajo. El panel lee el estado de la oferta en la misma consulta del orden, así las dos pantallas muestran el mismo badge.

**Últimos movimientos.** No hay historial de estados de las postulaciones. `ultimos_movimientos_postulante()` toma como fecha de cada postulación `GREATEST(postulaciones.updated_at, derivaciones.updated_at)`: la primera cambia con el estado en la oficina (revisión, derivación, no seleccionada, retiro, oferta retirada) y la segunda la pone el trigger de la 028 en cada cambio de la empresa (entrevista coordinada o reprogramada, resultado). Así un resultado o una entrevista de la empresa también cuentan como movimiento. Lo que no queda es la secuencia: de cada postulación se ve solo su último cambio. La función devuelve en una sola llamada la oferta, el estado de la postulación, el de la empresa y la fecha de la entrevista, y el badge combina los dos estados como en Mis postulaciones. Cada movimiento lleva a la página de Mis postulaciones en la que está esa postulación, con un ancla (`#postulacion-<id>`); la página se calcula con una sola consulta de los ids en el orden del listado. El panel muestra el título real aunque la oferta ya no se pueda leer; Mis postulaciones hace lo mismo con `ofertas_de_mis_postulaciones()` (migración 059), sin link a la oferta, y deja "Oferta no disponible" solo si la oferta ya no existe.

**Completá tu perfil.** No había lógica de completitud. Se revisan: los datos obligatorios del registro (nombre, apellido, DNI, teléfono y domicilio), la foto, la experiencia laboral, la disponibilidad, la localidad, el comprobante de domicilio (solo si es de Funes y no lo cargó o se lo rechazaron; en revisión no cuenta como pendiente), los rubros de interés y al menos un CV. Las secciones de `/perfil` tienen anclas (`src/lib/perfil-secciones.ts`).

### 2. Una sola fórmula de coincidencia, compartida con la búsqueda de la oficina

Las ofertas recomendadas usan el mismo puntaje y el mismo nivel que ve la oficina al buscar postulantes para una oferta (decisión [028](028-buscar-e-invitar-postulantes.md)). Para no tener la fórmula dos veces, la 058 la saca a una función interna:

| Función | Quién | Qué hace |
|---|---|---|
| `puntaje_coincidencia(oferta, postulante)` | Uso interno | Puntaje (rubro 40, requisitos 10 c/u hasta 30, título 10, disponibilidad 10, CV 10), nivel (alta ≥ 60, media ≥ 35) y los motivos |
| `buscar_candidatos_para_oferta(...)` | Oficina | Reemplazada con `CREATE OR REPLACE`: misma firma, mismas columnas y mismo orden; el puntaje sale de la función interna |
| `ofertas_recomendadas_para_mi(p_limite)` | Postulante | Ofertas activas, vigentes y no eliminadas sin una postulación vigente suya, solo nivel alta o media, por puntaje y después por fecha de publicación. Hasta 10 |
| `indicadores_postulante()` | Postulante | Una fila con los números del panel |
| `ultimos_movimientos_postulante(p_limite)` | Postulante | Las postulaciones que cambiaron más recientemente (postulación o derivación), hasta 10 |

- `puntaje_coincidencia` es `SECURITY INVOKER` y no tiene `EXECUTE` para `public`, `anon` ni `authenticated`: solo la llaman las otras funciones, que son `SECURITY DEFINER` y controlan el rol.
- Las tres funciones del postulante fallan con `42501` si `rol_actual()` no es `postulante` (una cuenta desactivada tampoco pasa) y toman el postulante de `auth.uid()`, nunca de un parámetro.
- Los motivos se muestran igual en los dos lados: `motivosCoincidencia()` en `src/lib/invitaciones.ts` y los componentes `BadgeCoincidencia` / `MotivosCoincidencia` en `src/components/ofertas/coincidencia.tsx`.
- Una oferta a la que tiene una invitación pendiente puede aparecer también en Ofertas para vos: es la misma oferta, y postularse por su cuenta acepta la invitación (056).

### 3. Sin selector de período

La empresa y la oficina miran períodos porque comparan actividad en el tiempo. El postulante tiene pocas postulaciones y lo que le sirve es la situación de hoy: qué está en curso, qué tiene que responder y qué le falta. Un período agregaría una decisión sin información nueva, así que el panel muestra siempre el estado actual.

### 4. Página y navegación

- `/panel` en `src/app/(dashboard)/panel/`, protegida con `requerirRolPagina("postulante")`. El proxy ya protege toda ruta que no es pública.
- `loading.tsx` con esqueleto. Cada bloque carga en su propio `Suspense` y, si falla, muestra su error (`logError` + `ErrorListado`) sin romper los demás. El aviso de invitaciones no muestra error propio: lo muestra el bloque de indicadores, que usa la misma consulta (una sola por request).
- `panelDeRol("postulante")` devuelve `/panel`: lo usan `/inicio` y el link "Ir a mi panel" / "Ir a mi perfil" del aviso de sesión activa. El login vuelve a la página pedida o al inicio público, y el registro termina en la confirmación del email: ninguno de los dos pasa por `panelDeRol`, así que el flujo de un postulante nuevo no cambia. *(Actualizado 2026-10-29: sin una ruta pedida, el login lleva a la Oficina a `/admin/indicadores` y a la empresa a `/empresa`; el postulante sigue yendo al inicio público.)*
- "Panel" en el menú del postulante, después de "Mi perfil", como en los otros roles.

- **Rediseño (2026-10-22):** los indicadores son seis tarjetas (sin "Invitaciones", que queda en el aviso), el aviso muestra la invitación más reciente (`mis_invitaciones`), movimientos y perfil van en dos columnas, "Completá tu perfil" muestra los siete ítems con un porcentaje (completos sobre el total) y queda visible también con el perfil completo, y las ofertas usan la tarjeta del inicio sin los motivos ni el vencimiento; el inicio reutiliza estas funciones en "Tu actividad".
- **Tu actividad en el inicio (2026-10-24):** el resumen del postulante conserva dos tarjetas de igual jerarquía: postulaciones e invitación a la izquierda, perfil a la derecha (apiladas en móvil). Muestra la invitación pendiente más reciente, hasta dos postulaciones recientes con su estado y progreso, y destaca el perfil cuando hay invitaciones con pendientes o postulaciones activas sin avisos nuevos. "Estás al día" solo aparece con postulaciones activas, perfil completo, sin invitaciones pendientes ni notificaciones no leídas. El botón de postulación de este resumen se presenta bloqueado si el perfil está incompleto; ver la oferta mantiene su comportamiento actual. El estado sin postulaciones usa una ilustración accesible de carpeta vacía con lupa, en versión compacta cuando hay invitación. El pie institucional no cambia. La vista de comparación de `/panel/comparacion-actividad` presenta seis artboards con datos marcadores.

---

## Consecuencias

- La empresa y la oficina no ven ningún cambio: la búsqueda de la oficina devuelve lo mismo y muestra los motivos con el mismo componente.
- Si cambian los pesos o los umbrales de coincidencia, se cambian en un solo lugar (`puntaje_coincidencia`) y valen para la oficina y para el postulante.
- Para mostrar cada cambio por separado (y no solo el último de cada postulación) haría falta un historial de estados de la postulación.
