# 013 — Vencimiento de ofertas

**Fecha:** 2026-10-14
**Estado:** Vigente

---

## Contexto

Una oferta aprobada quedaba publicada hasta que la empresa la cerraba o se cubrían las vacantes. Muchas búsquedas terminan sin que la empresa vuelva al portal, y el listado público acumulaba ofertas que ya no estaban vigentes.

---

## Decisiones tomadas

### 1. Duración elegida por la empresa

`ofertas.duracion_dias` acepta 15, 30, 45 o 60 (`CHECK`), 30 por defecto. La empresa la elige en el formulario al crear o editar.

### 2. `vence_en` se calcula al publicar, con un trigger

El trigger `vencimiento_ofertas` (BEFORE INSERT OR UPDATE) fija `vence_en = now() + duracion_dias` cuando la oferta **pasa a `activa`** (la aprueba la oficina).

- **Editar una oferta activa no cambia `vence_en`.** La edición la manda a revisión (027); si la oficina la vuelve a aprobar antes de que venza, conserva la fecha. Si ya había vencido, la re-aprobación calcula una fecha nueva.
- Cambiar la duración de una oferta activa no mueve la fecha: se usa en la próxima publicación o renovación.
- `vence_en` no está en ningún grant: solo la escriben el trigger y `renovar_oferta()`. En un INSERT de empresa queda NULL aunque el cliente mande un valor.
- El trigger se llama `vencimiento_ofertas` para correr último entre los BEFORE UPDATE de `ofertas` (orden alfabético) y ver el estado final, incluido el reset a revisión de la 027.

### 3. Sin cron: "vencida" se calcula al leer

Una oferta vencida **sigue en estado `activa`** en la base. No hay un estado nuevo ni un proceso programado:

- `buscar_ofertas_publicas` (misma firma) filtra `vence_en > now()`.
- `/ofertas/[id]` de una oferta vencida muestra "Esta oferta ya no está disponible" en lugar del formulario para postularse.
- La base rechaza postulaciones nuevas: trigger `postulaciones_oferta_vigente` (BEFORE INSERT, mensaje P0001 "Esta oferta ya venció y no acepta postulaciones nuevas.") y `oferta_acepta_postulaciones` (usada por la política de INSERT) exige `vence_en > now()`.
- Los paneles muestran "Vencida" calculándolo con `estadoVencimiento()` (`src/lib/ofertas-vencimiento.ts`); los contadores separan activas y vencidas con `vence_en > now()` / `<= now()`.

**Por qué sin cron:** el proyecto no tiene tareas programadas y agregarlas (pg_cron o un job externo) suma infraestructura. Comparar con `now()` al leer da el mismo resultado en el momento exacto del vencimiento, sin ventanas en las que una oferta vencida siga apareciendo.

**Consecuencia:** las postulaciones que llegaron antes del vencimiento se siguen procesando normalmente. La oficina puede derivarlas porque la oferta sigue `activa`.

### 4. Renovación

`renovar_oferta(p_oferta_id)` (`SECURITY DEFINER`) verifica que el usuario sea empresa, que la oferta sea suya, que esté `activa` y vencida, y fija `vence_en = now() + duracion_dias`.

- **No pasa por revisión:** solo cambia `vence_en` y `updated_at`; el trigger de la 027 solo manda a revisión cuando cambia el contenido.
- **Una vez cada vez que vence:** después de renovar, la oferta ya no está vencida y la función rechaza otra renovación hasta que vuelva a vencer.
- Si la empresa quiere cambiar el contenido, edita la oferta y vuelve a revisión como siempre.

### 5. Avisos

- Empresa (panel y Mis ofertas) y oficina (`admin/ofertas`): "Vence el <fecha>", aviso cuando faltan `DIAS_AVISO_VENCIMIENTO` (5) días o menos y estado "Vencida" cuando pasó la fecha.
- `admin/ofertas` tiene una pestaña "Vencidas" aparte de "Activas".

### 6. Datos existentes

Las ofertas que estaban activas al correr la migración recibieron `vence_en = now() + 30 días`, contados desde la migración y no desde su publicación, para que ninguna desapareciera de golpe en producción. Todas quedaron con `duracion_dias = 30`.

---

## Archivos clave

```
src/migrations/migration_036_vencimiento_ofertas.sql
src/lib/ofertas-vencimiento.ts                          — duraciones, días de aviso, estadoVencimiento
src/components/ofertas/vencimiento-oferta.tsx           — "Vence el…", aviso y "Venció el…"
src/app/empresa/(panel)/ofertas/_components/renovar-oferta-btn.tsx
src/app/empresa/(panel)/ofertas/actions.ts              — renovarOferta
```
