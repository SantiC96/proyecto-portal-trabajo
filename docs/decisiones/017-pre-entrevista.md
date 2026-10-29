# 017 — Pre-entrevista de la oficina (opcional)

**Fecha:** 2026-10-16 (actualizada 2026-10-16: pasa a ser opcional, 045; 2026-10-29: modalidad presencial u online y reprogramar, 064)
**Estado:** Vigente — **la unidad (por postulación) está pendiente de confirmar con la oficina** (ver sección 6)
**Migraciones:** `migration_044_pre_entrevistas.sql` (tabla, funciones y avisos), `migration_045_pre_entrevista_opcional.sql` (la derivación deja de exigirla), `migration_053_retiro_postulacion.sql` (estado `cancelada`), `migration_064_entrevistas_flexibles.sql` (modalidad y link)

---

## Contexto

La Oficina de Empleo puede hacer una pre-entrevista con el postulante antes de derivarlo a la empresa. En 044 era obligatoria; desde 045 es **opcional**: la oficina decide en cada postulación si la hace, y puede derivar con o sin ella. La empresa sigue coordinando su propia entrevista después de la derivación (`derivaciones.fecha_entrevista` / `lugar_entrevista`, 028).

---

## Flujo

```text
Postulación recibida / en revisión
  └─ Coordinar pre-entrevista (fecha futura + presencial con lugar u online con link)
                                                      → 'coordinada'  (la postulación pasa a en_revision si estaba recibida)
       ├─ Reprogramar (otra fecha, modalidad, lugar o link) → 'coordinada'
       ├─ [fecha pasada] Marcar como realizada         → 'realizada'
       └─ [fecha pasada] No asistió                    → 'no_asistio'
             └─ Reprogramar (fecha futura)             → 'coordinada'
Derivar a la empresa  → con o sin pre-entrevista, en cualquier estado (045)
No seleccionar        → con o sin pre-entrevista
Postulación derivada o no seleccionada → la pre-entrevista queda como está (solo lectura)
```

---

## Decisiones tomadas

### 1. Tabla `public.pre_entrevistas`

| Columna | Tipo | Uso |
|---|---|---|
| `id` | `uuid` PK | |
| `postulacion_id` | `uuid` FK → `postulaciones(id)` `ON DELETE CASCADE`, **`UNIQUE`** | una pre-entrevista por postulación |
| `fecha_hora` | `timestamptz` | fecha y hora acordadas |
| `modalidad` | `text` + `CHECK`, default `presencial` | `presencial` · `online` (064) |
| `lugar` | `text` NULL | obligatorio y no vacío en las presenciales; en las online, NULL (064; antes `NOT NULL`) |
| `link` | `text` NULL | link de la reunión, `https://` sin espacios, solo en las online (064) |
| `estado` | `text` + `CHECK` | `coordinada` · `realizada` · `no_asistio` |
| `nota_oficina` | `text` NULL | nota interna; el postulante nunca la ve |
| `coordinada_por` | `uuid` FK → `usuarios(id)` `ON DELETE SET NULL` | quien coordinó o reprogramó por última vez |
| `created_at`, `updated_at` | `timestamptz` | |

`estado` es `text` con `CHECK` (como `asignaciones_curso.estado`) y no un enum: agregar o quitar un estado es reemplazar el `CHECK`. La tabla es nueva, así que los `CHECK` no chocan con filas viejas.

### 2. Reglas (validadas en la base)

- **Transiciones** (trigger `pre_entrevistas_transicion`, `BEFORE UPDATE`, aplica a todos, también sin rol): `coordinada → realizada`, `coordinada → no_asistio`, `no_asistio → coordinada`. Una `realizada` no vuelve atrás. Cambiar la fecha, la modalidad, el lugar o el link solo se puede en `coordinada` (es reprogramar; desde la 064 también la modalidad y el link). La postulación de una pre-entrevista no cambia.
- **Fechas** (en las funciones; un `CHECK` no puede usar `now()`): al coordinar o reprogramar la fecha tiene que ser futura; `realizada` y `no_asistio` solo cuando la fecha ya pasó.
- **Solo postulaciones pendientes**: coordinar, reprogramar y registrar el resultado exigen la postulación en `recibida` o `en_revision`.
- **Coordinar desde `recibida`** pasa la postulación a `en_revision` en la misma transacción.
- Reprogramar una `coordinada` sin cambiar fecha, hora, modalidad, lugar ni link se rechaza.
- **Modalidad** (064): presencial exige el lugar; online exige un link `https://` sin espacios (hasta 500 caracteres) y no guarda lugar. Lo controlan los `CHECK` de la tabla y `validar_datos_pre_entrevista` (con mensajes para el usuario).

### 3. Funciones (mismas reglas que 040)

`SECURITY DEFINER`, `SET search_path = ''`, tablas calificadas, rol con `rol_actual()::text IS DISTINCT FROM 'municipalidad'` → `42501`, mensajes para el usuario con `P0001`.

| Función | Qué hace |
|---|---|
| `coordinar_pre_entrevista(p_postulacion_id, p_fecha_hora, p_lugar, p_nota, p_modalidad, p_link)` | crea la pre-entrevista; `recibida` → `en_revision`. `p_modalidad` (default `presencial`) y `p_link` desde la 064 |
| `reprogramar_pre_entrevista(p_pre_entrevista_id, p_fecha_hora, p_lugar, p_nota, p_modalidad, p_link)` | `coordinada` con fecha, modalidad, lugar o link nuevos, o `no_asistio` → `coordinada` |
| `registrar_resultado_pre_entrevista(p_pre_entrevista_id, p_resultado, p_nota)` | `coordinada` → `realizada` / `no_asistio` (fecha pasada) |
| `mis_pre_entrevistas(p_postulacion_ids)` | lo que ve el postulante: estado, fecha, modalidad, lugar y link de las propias, **sin la nota** |

Internas (sin `EXECUTE` para los roles del cliente): `validar_datos_pre_entrevista` (desde la 064 con la modalidad y el link), `bloquear_pre_entrevista`, `detalle_entrevista_aviso` (064, el texto de los avisos). `postulacion_tiene_pre_entrevista_realizada` existió en 044 y se borró en 045 (ver sección 5).

**Bloqueos:** las tres funciones de la oficina bloquean primero la postulación (`FOR UPDATE`) y después la pre-entrevista. `derivar_postulacion` bloquea la misma postulación, así que coordinar, reprogramar, registrar el resultado y derivar se ejecutan de a una por postulación.

**Nota interna:** `p_nota` reemplaza la nota (vacía → NULL). La pantalla precarga la nota actual, así que confirmarla sin cambios la conserva.

### 4. Permisos (RLS)

- La oficina (`municipalidad`) lee todas las pre-entrevistas.
- El postulante no lee la tabla (tiene la nota interna): usa `mis_pre_entrevistas()`, que filtra por `auth.uid()` y nunca devuelve `nota_oficina` ni `coordinada_por` (mismo criterio que `estado_derivacion_postulante`, 028).
- La empresa no las ve.
- Nadie inserta, modifica ni borra desde el cliente: solo `SELECT` para `authenticated`; las escrituras pasan por las funciones.

### 5. La pre-entrevista es opcional (045)

- En 044, `derivar_postulacion` exigía una pre-entrevista `realizada`, y dos triggers (`postulaciones_exigir_pre_entrevista`, `derivaciones_exigir_pre_entrevista`, con la función `exigir_pre_entrevista_al_derivar_fn`) exigían lo mismo a las escrituras directas. La regla vivía en `postulacion_tiene_pre_entrevista_realizada`.
- **Desde 045** la oficina puede derivar con o sin pre-entrevista, también con una `coordinada` pendiente o una `no_asistio`. `derivar_postulacion` (misma firma) queda igual que en 044 sin ese control: bloqueo `FOR UPDATE` de la postulación, controles de estado de la postulación y de la oferta, y la derivación a medias de 040. Los dos triggers, su función y `postulacion_tiene_pre_entrevista_realizada` se borraron porque nada más los usaba.
- **Después de derivar** (o de marcar la postulación como «No seleccionado») la pre-entrevista queda como está y solo se puede ver: `bloquear_pre_entrevista` exige la postulación en `recibida` o `en_revision` para reprogramar o registrar el resultado, y `coordinar_pre_entrevista` hace el mismo control. Una `coordinada` que queda pendiente en una postulación derivada no se cierra sola.
- Todo lo demás de 044 sigue igual: la tabla, coordinar, reprogramar, registrar el resultado, lo que ve el postulante y sus avisos.
- Si la oficina vuelve a pedir que sea obligatoria, hay que restaurar el control en `derivar_postulacion` y los triggers del BLOQUE 8 de 044 en una migración nueva.

### 6. Una pre-entrevista por postulación — **decisión a revisar**

Se eligió **por postulación**: cada postulación tiene su propia pre-entrevista, aunque el postulante se haya postulado a varias ofertas. Ventajas: la oficina evalúa al postulante para esa búsqueda en particular, y el resultado, la nota y la fecha quedan atados a la postulación que se deriva.

**Pendiente de confirmar con la oficina.** Si pasa a ser **por postulante** (una pre-entrevista realizada habilita todas sus postulaciones), habría que cambiar:

1. **Tabla:** agregar `postulante_id` (o reemplazar `postulacion_id`) y mover el `UNIQUE` a `postulante_id` (o permitir varias por postulante y considerar la última). Migrar las filas existentes tomando `postulaciones.postulante_id`.
2. **Regla de derivación:** desde 045 la derivación no depende de la pre-entrevista, así que no hay nada que cambiar.
3. **Funciones:** `coordinar_pre_entrevista` recibiría el postulante (o seguiría recibiendo la postulación y la usaría para encontrar al postulante); el bloqueo pasaría a ser sobre la fila de `postulantes` en lugar de la postulación. Definir qué postulaciones pasan de `recibida` a `en_revision` al coordinar.
4. **`mis_pre_entrevistas`:** devolver la del postulante una vez, no por postulación.
5. **Pantallas:** la sección de la ficha (`pre-entrevista-seccion.tsx`) mostraría la del postulante; la fecha de la fila en `/admin/postulaciones` se buscaría por `postulante_id`; en `/mis-postulaciones` iría arriba del listado en lugar de en cada postulación; la ficha del postulante (`/admin/postulantes/[id]`) sería el lugar natural para gestionarla.
6. **Avisos:** el texto dejaría de mencionar una oferta.

El código de la aplicación accede a las pre-entrevistas por la postulación en pocos puntos (ficha, listado, mis-postulaciones), todos listados en "Archivos clave".

### 7. Avisos al postulante

Mismo patrón que 041 (ver decisión 014): trigger `AFTER`, `EXCEPTION WHEN OTHERS` + `RAISE WARNING`, `notificar_usuario` (no avisa a quien hizo la acción), link `/mis-postulaciones`, sin la nota interna.

| Tipo | Disparador | Clave |
|---|---|---|
| `pre_entrevista_coordinada` | `INSERT` en `pre_entrevistas` | `pre_entrevista_coordinada:<id>` |
| `pre_entrevista_reprogramada` | `UPDATE` que deja `coordinada` y antes no lo estaba, o cambió la fecha, la modalidad, el lugar o el link | `pre_entrevista_reprogramada:<id>:<updated_at>` |

El mensaje incluye la oferta, la fecha y hora (hora de Argentina) y la modalidad con el lugar o el link (064: "Modalidad: online. Link: https://…", el link al final y sin punto pegado). El correo usa el mismo texto. Cada reprogramación fija `updated_at = now()`, así que cada una tiene su aviso, aunque vuelva a una fecha y un lugar anteriores. No hay aviso por `realizada` ni por `no_asistio`.

### 8. Pantallas

- **Ficha** (`/admin/postulaciones/[id]`): sección **Pre-entrevista** en la columna lateral, sobre **Acciones**, con el estado, la fecha y hora, la modalidad, el lugar o el link y la nota interna. Acciones según el estado: **Coordinar pre-entrevista** (fecha y hora, modalidad Presencial / Online y, según la modalidad, el lugar o el link de la reunión; nota opcional). Con una `coordinada`, en lugar del formulario se ve el cartel **Pre-entrevista coordinada** (fecha larga, modalidad, lugar o link en otra pestaña, nota interna) con **Reprogramar**, que abre el mismo formulario precargado y con **Cancelar** para volver al cartel; **Marcar como realizada** y **No asistió** (con confirmación y nota; deshabilitados hasta la fecha, con el motivo). Con la postulación derivada o no seleccionada la sección es de solo lectura (y no aparece si no hubo pre-entrevista). **Derivar a la empresa** no depende de la pre-entrevista y no muestra ningún aviso sobre ella (045).
- **Listado** (`/admin/postulaciones`, pestaña **Pendientes**): cada fila muestra solo la fecha y hora de la pre-entrevista `coordinada` ("Pre-entrevista: 20/10 10:30"), debajo del estado en la tabla y al pie de la card en mobile. Sin pre-entrevista, realizada o no asistió, la fila no muestra nada; el detalle está en la ficha. Sin filtro por pre-entrevista (el `?pre=` de 044 se sacó en 045).
- **Inicio de admin:** sin contador de pre-entrevistas (el de 044 se sacó en 045).
- **Mis postulaciones:** en cada postulación pendiente con pre-entrevista `coordinada`, la fecha larga, la modalidad y el lugar o el link (que se abre en otra pestaña).
- El campo de fecha y hora (`src/components/ui/campo-fecha-hora.tsx`) es un botón que abre un calendario y la hora en dos listas: horas de 08 a 20 y minutos cada 15, como la entrevista de la empresa, sin días ni horarios pasados (design system, sección 15).

---

## Archivos clave

```
src/migrations/migration_044_pre_entrevistas.sql
src/migrations/migration_045_pre_entrevista_opcional.sql   — derivar sin exigir la pre-entrevista
src/migrations/migration_064_entrevistas_flexibles.sql     — modalidad, link, reprogramar
src/lib/pre-entrevistas.ts                                  — estados, etiquetas y colores, validación
src/lib/entrevistas.ts                                      — modalidad, link y validación (compartido con la empresa)
src/components/entrevistas/                                 — campos del formulario y cartel de entrevista coordinada
src/lib/fechas.ts                                           — formatFechaHoraCorta ("20/10 10:30")
src/components/ui/campo-fecha-hora.tsx                      — día + horario
src/app/admin/postulaciones/actions.ts                      — coordinar, reprogramar, registrar resultado
src/app/admin/postulaciones/[id]/pre-entrevista-seccion.tsx — sección de la ficha
src/app/admin/postulaciones/[id]/page.tsx                   — lee la pre-entrevista
src/app/admin/postulaciones/page.tsx                        — fecha de la coordinada en las filas de Pendientes
src/app/(dashboard)/mis-postulaciones/                      — vista del postulante
```
