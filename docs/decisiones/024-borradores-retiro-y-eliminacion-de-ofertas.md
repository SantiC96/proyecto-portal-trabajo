# 024 — Borradores, retiro y eliminación de ofertas

**Fecha:** 2026-10-19
**Estado:** Vigente
**Migración:** `migration_051_borradores_retiro_y_eliminacion_de_ofertas.sql`, `migration_052_retirar_oferta_rechazada.sql`

---

## Contexto

- Una oferta se enviaba a revisión apenas se guardaba: no había forma de dejarla a medio cargar.
- "Cerrar" solo servía para ofertas activas o pendientes con postulaciones, y dejaba abiertos los procesos de los candidatos (sin aviso).
- "Eliminar" borraba la fila sin vuelta atrás.
- El requisito mínimo de una oferta lo controlaba solo un trigger (032), que no mira las filas que no cambian de contenido.

---

## Decisiones tomadas

### 1. Borradores

- El estado `borrador` (existía en el enum desde 001) se usa para ofertas sin enviar. El formulario de una oferta nueva o de un borrador tiene "Guardar borrador" y "Enviar a revisión". Editar una oferta ya enviada (publicada o rechazada) no ofrece borrador: una oferta enviada no vuelve atrás.
- Guardar un borrador solo exige el título (`guardar_borrador_oferta`). Las categorías se validan si vienen; las vacantes pueden faltar.
- "Enviar a revisión" valida en el formulario como siempre (errores por campo). Además, la base lo garantiza: el trigger `ofertas_reglas_borrador_y_eliminacion` rechaza cualquier paso de `borrador` a otro estado si `oferta_campos_faltantes()` devuelve algo (título, descripción, 1 a 5 categorías, modalidad, jornada, duración, requisito, vacantes). Vale también para un `UPDATE` directo de la empresa y para el SQL Editor. Un borrador solo puede ir a `pendiente_aprobacion`.
- Al enviarse, `created_at` pasa a ser la fecha de envío (la oferta "se crea" para la oficina y el portal) y `contenido_editado_en` queda vacío (las ediciones del borrador no son "ediciones" para la oficina).
- Un borrador no lo ven la oficina ni el público (RLS), no recibe postulaciones (no es `activa`), no vence (`vence_en` se fija al publicar) y no cuenta en los indicadores. El aviso `oferta_pendiente` sale al enviarlo, con la misma clave que el alta directa (`oferta_nueva:<id>`), y no al guardarlo.
- En Mis ofertas, un borrador lleva solo la etiqueta "Borrador" (azul, distinta del gris de "Cerrada") y dos botones: "Continuar", que lleva al formulario (ahí se guarda o se envía a revisión, y se marcan los campos faltantes), y "Eliminar".

### 2. Retirar la oferta (reemplaza a "Cerrar")

- Se retira una oferta pendiente de revisión (con o sin postulaciones), publicada (vigente o vencida) o rechazada con postulaciones. Un borrador o una rechazada sin postulaciones no se retiran: se eliminan.
- `retirar_oferta()` hace todo en una transacción: la oferta pasa a `cerrada`, las derivaciones abiertas (`pendiente`, `en_proceso`) y las postulaciones sin derivación (`recibida`, `en_revision`) pasan a `oferta_retirada`. Los contratados, los no seleccionados y los descartados por la oficina no cambian.
- **No es un rechazo.** `oferta_retirada` es un valor nuevo de `estado_postulacion` y de `estado_empresa`, y no `rechazado` / `rechazada_municipalidad`. La regla de cursos (`estado_cursos_calculo`, 046), `postulaciones_no_seleccionadas` (038) y los indicadores de la oficina y de la empresa (047, 049) cuentan solo los estados de rechazo, así que el retiro queda afuera sin tocarlos.
- Solo `retirar_oferta()` pone ese estado (marca de transacción `ftl.retiro_oferta`), y no cambia después: la empresa no puede usarlo para cerrar un proceso sin dar un motivo, y la oficina no lo corrige.
- La empresa ya no puede dejar una oferta `cerrada` con un `UPDATE` directo (política de UPDATE): cerrar es retirar. El cierre automático al cubrir las vacantes (029) sigue igual.
- Avisos: al postulante de cada proceso cerrado (`postulacion_cerrada`, con email) y a la oficina (`oferta_retirada`, solo en el portal).
- El diálogo de confirmación muestra cuántos candidatos están en proceso (`procesos_abiertos_ofertas_empresa`, solo cantidades).
- En Mis ofertas cada oferta muestra un solo botón de baja: "Eliminar" en un borrador, o en una rechazada o una pendiente sin postulaciones; "Retirar oferta" en una pendiente o una rechazada con postulaciones, una publicada o una vencida. La base permite también retirar una pendiente sin postulaciones, pero la pantalla ofrece solo "Eliminar" para no mostrar dos bajas parecidas. La pantalla nunca muestra una baja que la base vaya a rechazar (`accionesDisponibles`, `src/lib/oferta-estados.ts`).

#### Oferta rechazada con postulaciones (migración 052)

- **Caso:** una oferta publicada con candidatos que la empresa edita vuelve a revisión (027); si la oficina rechaza la nueva versión, queda `rechazada` con procesos abiertos. `eliminar_oferta` no la acepta (tiene postulaciones) y en la 051 `retirar_oferta` no aceptaba ninguna rechazada: los candidatos quedaban sin cierre.
- **Decisión:** `retirar_oferta` (misma firma) acepta una rechazada **si tiene postulaciones**, con el mismo efecto que en una activa: la oferta pasa a `cerrada`, los procesos abiertos a `oferta_retirada` y se avisa a los postulantes y a la oficina. Una rechazada sin postulaciones sigue sin retirarse: se elimina.
- "Tiene postulaciones" es `oferta_sin_postulaciones()`, la misma condición que usa `eliminar_oferta`, así cada rechazada admite exactamente una de las dos bajas.
- `procesos_abiertos_ofertas_empresa` no filtra por el estado de la oferta, así que el diálogo de retiro cuenta los procesos igual que para una activa.
- En Mis ofertas: rechazada sin postulaciones → "Editar" y "Eliminar"; rechazada con postulaciones → "Editar" y "Retirar oferta". Editar sigue mandándola a revisión; si la oficina la aprueba, vuelve a estar publicada con sus candidatos.

### 3. Borrado lógico

- "Eliminar" (borrador, rechazada o pendiente sin postulaciones, como antes) marca `ofertas.eliminada_en`. Un `CHECK` exige que la oferta eliminada nunca se haya publicado, así nunca es `activa` ni `cerrada` y las funciones que leen solo ofertas activas no necesitan filtrarla.
- Las políticas RLS la sacan del público, la oficina y el postulante. La empresa la ve en la pestaña "Eliminadas" con los días que le quedan y la restaura en el estado que tenía durante 30 días (`ofertas_dias_restauracion()`; en la app `DIAS_RESTAURACION_OFERTA`). Si estaba pendiente, la oficina recibe un aviso de nuevo.
- La empresa ya no tiene política de `DELETE`. La purga definitiva es `purgar_ofertas_eliminadas()` (solo service role), que llama el cron diario `/api/mantenimiento/purgar` (protegido con `CRON_SECRET`, igual que `/api/emails/procesar`). Las filas dependientes se van por las FK existentes. La ruta corre una lista de tareas para poder sumar la limpieza de Storage.

### 4. Requisito mínimo en la base

`ofertas_requisito_minimo_check`: toda oferta que no es borrador tiene al menos un requisito con texto (`oferta_tiene_requisito()`). Si al aplicar la migración hay filas que no cumplen, se crea `NOT VALID` y queda un `NOTICE`: esas filas no se pueden actualizar hasta que tengan un requisito; después se corre `VALIDATE CONSTRAINT`.

---

## Alternativas descartadas

- **Columnas de motivo en postulaciones y derivaciones en lugar de un estado nuevo:** el estado seguiría siendo `recibida` o `pendiente`, y todos los listados, contadores y recordatorios que filtran por estado tendrían que excluir los cerrados uno por uno.
- **Usar `rechazado` con una nota:** contaría para la regla de 3 rechazos y como "no seleccionado".
- **Mantener el borrado físico con confirmación:** un error de la empresa no tenía arreglo.

---

## Pendiente

- Las pre-entrevistas coordinadas de una postulación cerrada quedan como estaban (la oficina ya no puede gestionarlas porque la postulación no está pendiente); el postulante deja de verlas.
- La oficina no tiene una pestaña propia para las postulaciones cerradas por retiro: se ven en la ficha de la postulación y en el historial del postulante.
