# 025 — Retiro de la postulación y volver a postularse

**Fecha:** 2026-10-20
**Estado:** Vigente
**Migración:** `migration_053_retiro_postulacion.sql`

---

## Contexto

- El postulante solo podía retirar una postulación `recibida`, y lo hacía borrando la fila (política de `DELETE` de 018). Una vez que la oficina la abría, no podía retirarse aunque ya no le interesara el puesto.
- La restricción `UNIQUE (oferta_id, postulante_id)` de 001 impedía tener dos postulaciones a la misma oferta, así que conservar la retirada en el historial y volver a postularse eran incompatibles.

---

## Decisiones tomadas

### 1. Qué pasa al retirar, según el estado

| Estado | Al retirar |
|---|---|
| `recibida` | Se borra la fila, como antes. Nadie la revisó; no se avisa a nadie. |
| `en_revision` (con o sin pre-entrevista) | La postulación pasa a `retirada_postulante` con `retirada_en`. La pre-entrevista `coordinada` pasa a `cancelada`. Aviso a la oficina. |
| `derivada`, derivación `pendiente` o `en_proceso` (también con entrevista coordinada) | Igual, y la derivación pasa a `retirada_postulante`. Aviso a la oficina y a la empresa (con email). |
| `derivada` con `contratado` | No se puede: "Ya fuiste seleccionado para este puesto". |
| `rechazada_municipalidad`, `rechazado`, `oferta_retirada`, `retirada_postulante` | No se puede: el proceso ya está cerrado. La pantalla no muestra el botón. |

- Todo lo hace `retirar_postulacion(p_postulacion_id)`, una función `SECURITY DEFINER` que controla el rol y el dueño (`auth.uid()`), bloquea la oferta (`FOR KEY SHARE`, para no cruzarse con un `retirar_oferta` en curso), la postulación y la derivación, y lee el estado después de bloquear.
- A diferencia de `oferta_retirada` (024), la postulación derivada **también** cambia de estado: "retirada" se lee de la postulación sin mirar la derivación.
- Solo esa función escribe el estado nuevo (marca de transacción `ftl.retiro_postulacion`) y después no cambia: ni la oficina (derivar, descartar, reconsiderar, corregir el estado de la empresa) ni la empresa (entrevista, seleccionar, rechazar) pueden tocarlo. Sin rol (SQL Editor) se permite, como en 024.

### 2. No es un rechazo

`retirada_postulante` es un valor propio de `estado_postulacion` y `estado_empresa`. Las funciones que cuentan rechazos filtran por `rechazado` / `rechazada_municipalidad` y quedan igual: la regla de 3 rechazos en 90 días (`estado_cursos_calculo`, 046, y todo lo que la usa), `postulaciones_no_seleccionadas` (038) y los indicadores de la oficina y de la empresa (047, 049/051).

### 3. Volver a postularse

- La restricción única se reemplaza por el índice único parcial `postulaciones_vigente_unica (oferta_id, postulante_id) WHERE retirada_en IS NULL`: una sola postulación vigente por oferta, y cualquier cantidad de retiradas. Usa la columna y no el literal del enum, que no puede usarse en la misma transacción en que se agrega. La migración verifica antes que no haya duplicados.
- La nueva postulación es una fila nueva y pasa por las mismas reglas que la primera (oferta activa y no vencida: política de `INSERT` y `postulaciones_oferta_vigente`, 036). Si la oferta está cerrada, vencida, retirada o eliminada, la acción muestra el mismo mensaje que antes. Los avisos de postulación nueva (`postulacion_nueva`, email `postulacion_recibida`) salen igual porque su clave es el id de la fila.
- "Postulación vigente" = `retirada_en IS NULL`. Lo usan el botón de postularse del detalle de la oferta, el link "Volver a postularme" de Mis postulaciones y el conteo de postulaciones de la ficha de la oferta en la oficina. Los historiales (Mis postulaciones, ficha del postulante en la oficina) muestran todas las filas.
- La regla de rechazos no cuenta dos veces una oferta: para tener dos postulaciones a la misma oferta la primera tiene que estar retirada, y una retirada nunca termina en `rechazado`.
- Si la oficina vuelve a derivarlo, la empresa recibe una derivación nueva: aparece como un candidato nuevo y la anterior queda "Se retiró".

### 4. Pre-entrevista

`pre_entrevistas.estado` suma `cancelada` (la columna es texto con `CHECK`). Una `coordinada` (con la fecha por venir o pasada sin resultado) pasa a `cancelada` al retirar; después la oficina ya no podría registrar el resultado ni reprogramarla, porque solo se gestiona con la postulación pendiente. Es final y solo la pone `retirar_postulacion`. Las `realizada` y `no_asistio` quedan como estaban. El aviso a la oficina lo menciona.

### 5. Avisos

- Oficina: `postulacion_retirada`, siempre que la postulación ya estaba revisada (en revisión o derivada), con link a la ficha. Solo en el portal.
- Empresa: `candidato_retirado` ("[Nombre Apellido] retiró su postulación a «Oferta».") si estaba derivada, con link a la oferta y con email.
- Al postulante no se le avisa (fue su acción).
- Salen de un trigger `AFTER UPDATE` que nunca hace fallar el retiro.

### 6. Pantallas

- Mis postulaciones: "Retirar postulación" con el diálogo común en toda postulación que se puede retirar; etiqueta "Retirada" (gris pizarra, distinta del rojo de "No seleccionada") y "Volver a postularme" si la oferta sigue abierta y no hay otra postulación vigente.
- Empresa: "Se retiró", sin acciones, en la lista de candidatos y en la ficha.
- Oficina: "Retirada por el postulante" sin acciones; pestaña y contador "Retiradas" en Postulaciones; la ficha muestra la fecha de retiro y la derivación anterior.

---

## Alternativas descartadas

- **Borrar siempre la fila:** se pierde el historial de la oficina y de la empresa, y una derivación con entrevista desaparecería sin aviso.
- **Reusar la misma fila al volver a postularse:** pisaría el historial (pre-entrevista, derivación, notas) de la postulación anterior.
- **Usar `rechazado` o `rechazada_municipalidad`:** contaría para la regla de cursos y como "no seleccionado".
- **Índice parcial con `WHERE estado <> 'retirada_postulante'`:** el valor del enum no se puede usar en la misma transacción en que se agrega; además `retirada_en` da la fecha del retiro.

---

## Pendiente

- La empresa sigue viendo los datos del candidato que se retiró (como con uno no seleccionado): el acceso se da por haber sido derivado alguna vez (007).
- Las postulaciones cerradas por oferta retirada (024) siguen sin pestaña propia en la oficina.
