# 028 — Buscar postulantes para una oferta e invitarlos

**Fecha:** 2026-10-21
**Estado:** Vigente
**Migración:** `migration_056_buscar_e_invitar_candidatos.sql`, `migration_057_link_invitaciones.sql`

---

## Contexto

- La oficina solo veía a quienes se postulaban a una oferta. Muchas personas registradas cumplen lo que pide una oferta y no la vieron, o no se animaron a postularse.
- Queremos que, al ver una oferta publicada, la oficina encuentre postulantes que coinciden con ella y los invite. Si la persona acepta, la oficina revisa y deriva la postulación a mano, como cualquier otra.
- Datos disponibles: rubros de la oferta y de interés del postulante, requisitos y título de la oferta, experiencia laboral, disponibilidad, CVs, nivel de prioridad y procedencia (055).

---

## Decisiones tomadas

### 1. Criterios y pesos de la búsqueda

`buscar_candidatos_para_oferta()` (solo la oficina, solo ofertas activas, no vencidas y no eliminadas) calcula un puntaje. Los pesos están en un solo lugar: las constantes `c_peso_*` al principio de la función.

| Criterio | Puntos | Por qué |
|---|---|---|
| Rubro: interés en al menos un rubro de la oferta | 40 | Es el criterio más fuerte: lo eligió la persona. |
| Requisitos: cada requisito que coincide con su experiencia | 10, hasta 30 | Varios requisitos cumplidos pesan más que uno, sin superar al rubro. |
| Título de la oferta en su experiencia | 10 | Ya hizo ese trabajo. |
| Disponibilidad compatible con la jornada | 10 | Puede tomar el horario. |
| Tiene al menos un CV disponible | 10 | Puede postularse sin cargar nada. |

Máximo 100. Coincidencia **alta** desde 60, **media** desde 35, **baja** debajo. Ejemplo: rubro (40) + un requisito (10) + CV (10) = 60, alta. Solo rubro = 40, media. Un requisito y CV = 20, baja.

Aparece quien coincide en rubro o en texto (algún requisito o el título). No aparecen quienes tienen una postulación vigente (no retirada) a la oferta ni quienes fueron contratados en ella: van en la sección "Ya se postularon", con su estado y la etiqueta "Por invitación" si vinieron de una.

Disponibilidad y jornada:

| Jornada | Disponibilidades compatibles |
|---|---|
| Tiempo completo | completa, flexible |
| Part-time | mañana, tarde, noche, completa, flexible |
| Pasantía | mañana, tarde, completa, flexible |
| Por proyecto | completa, flexible |

Sin disponibilidad cargada no suma.

### 2. Búsqueda de texto completo en español

Requisitos y título se comparan con la experiencia laboral con `to_tsvector('spanish')` en los dos lados: "atendí", "atención" y "atender" quedan con la misma raíz y las palabras vacías ("de", "en", "la") no cuentan. Un `LIKE` no encuentra "atención al público" en "atendí al público" y no tiene índice útil.

- Se descartan números y palabras genéricas de los avisos ("experiencia", "conocimientos", "años", "mínimo", "excluyente", "manejo", …): si no, "Experiencia en ventas" coincidiría con cualquiera que escriba "experiencia".
- Un requisito coincide si la experiencia tiene **al menos la mitad** de sus raíces. Exigir todas dejaba afuera a casi todos; una sola de seis traía ruido.
- Rendimiento: índice GIN sobre `experiencia_tsv(experiencia_laboral)` para el filtro previo (`@@` con una consulta OR de todas las raíces), índice sobre `postulante_categorias(categoria_id)` para el rubro y el resto en la misma consulta. Nada se consulta por fila desde la aplicación.
- La consulta se arma con las raíces que ya dio `to_tsvector('spanish')` convertidas a `tsquery`, en lugar de `to_tsquery('spanish', …)`: así no se reduce dos veces una raíz ya reducida y los dos lados quedan iguales.

### 3. Orden: primero los que nunca fueron invitados

1. Los que nunca fueron invitados a esta oferta; al final, los ya invitados (última invitación pendiente, rechazada, vencida, o aceptada con la postulación retirada después).
2. Dentro de cada grupo: puntaje, nivel de prioridad (1, 2, 3), el más reciente.

El orden y el total se resuelven en la función SQL, así la paginación respeta los dos grupos: los invitados quedan en las últimas páginas y el separador "Ya invitados a esta oferta" aparece solo en la página donde empieza ese grupo. Cada tarjeta de un invitado muestra su última invitación ("Invitado el …, sin respuesta" en azul, "No interesado" en rojo, "Invitación vencida el …" en gris), sin la cantidad de invitaciones. "No interesado" no lleva fecha; si la persona dejó un motivo, se ve al pasar el mouse, tocar o activar el aviso con el teclado (popover).

La pantalla no tiene filtros: muestra el encabezado (oferta y empresa) y la lista. La función conserva sus parámetros de filtro (solo con CV, solo de Funes, nivel, ocultar rechazos) con los valores por defecto, sin cambiar su firma.

### 4. La oficina invita en lugar de derivar directamente

Derivar a alguien que no se postuló le mandaría a la empresa los datos de una persona que nunca pidió eso. La invitación pide su consentimiento: recibe un aviso y un email ("Una oferta para vos") y decide. La empresa no ve la búsqueda, las invitaciones ni quién dijo que no: no hay políticas ni funciones que se lo muestren, y para ella un candidato que vino por invitación es un candidato derivado más.

### 5. Al aceptar se crea una postulación que la oficina revisa a mano

"Me interesa" pide el CV (igual que al postularse, el más reciente elegido) y `responder_invitacion()` inserta una postulación normal con `origen = 'invitacion'`. Pasa por todos los triggers de postulaciones: oferta vigente, CV del postulante y disponible, aviso a la oficina y email de confirmación. Queda "Recibida": `derivar_postulacion` y el flujo de revisión no cambian. Así la oficina vuelve a mirar a la persona (puede haber cambiado algo) y la regla de rechazos, los indicadores y el retiro funcionan igual.

`postulaciones.origen` es una columna de texto con `DEFAULT 'postulante'`: no reescribe la tabla, no toca ningún trigger existente y no está en ningún permiso por columna, así que solo la función la escribe. La invitación apunta a su postulación con `postulacion_id`.

**Un solo aviso a la oficina:** el trigger de 043 avisaba "X se postuló a «Y»" en cada postulación nueva. Con origen `invitacion`, el mismo trigger (misma firma) manda en su lugar "X aceptó la invitación a «Y». Su postulación está pendiente de revisión." (`invitacion_aceptada`, link a la ficha) con la misma clave `postulacion_nueva:<id>`. No hay un segundo aviso.

**Casos borde:**

- La oferta se cerró (o venció) antes de responder: no se crea nada, la invitación pasa a `vencida` y el postulante ve "La oferta ya se cerró."
- Se postuló por su cuenta mientras tenía la invitación pendiente: un trigger la pasa a `aceptada` apuntando a esa postulación, sin crear otra (si en ese instante estaba respondiendo la invitación, `responder_invitacion()` la enlaza a esa misma postulación).

### 6. Se puede volver a invitar a quien dijo que no

La situación de una persona cambia (consiguió y perdió un trabajo, se mudó, se recibió). Se guarda el historial completo: varias invitaciones del mismo postulante a la misma oferta, como mucho una pendiente (índice único parcial). Antes de confirmar, el diálogo muestra el antecedente: "Esta persona dijo que no a esta oferta el … (motivo: …). ¿Querés invitarla de nuevo?". Cada invitación tiene su propia clave de aviso, así una nueva invitación genera un aviso nuevo. El historial de todas las ofertas está en la ficha del postulante.

### 7. Cómo vencen las invitaciones

- **La oferta deja de estar activa** (la empresa la retira, se cubren las vacantes, vuelve a revisión por una edición, la oficina la rechaza o se elimina): un trigger sobre `ofertas` pasa las pendientes a `vencida` en la misma transacción. `invitar_a_oferta()` y `responder_invitacion()` bloquean la oferta (`FOR SHARE`), así ninguna invitación nueva se escapa de ese trigger.
- **La oferta vence por fecha** (sigue `activa` con `vence_en` pasado, 036): no hay un evento que dispare un trigger. Lo más simple: la purga diaria (`/api/mantenimiento/purgar`) llama a `vencer_invitaciones_de_ofertas_vencidas()`. Mientras tanto, `mis_invitaciones()` ya la muestra vencida, el resumen de la oficina la cuenta como vencida y `responder_invitacion()` la marca al intentar aceptarla. Si la empresa renueva la oferta antes de la purga, la invitación sigue pendiente y vale.

---

## Consecuencias

- La oficina llega a "Buscar postulantes" desde el detalle de la oferta en su panel, y también desde el listado público `/ofertas` y el detalle `/ofertas/[id]` (solo ofertas activas y vigentes; en el detalle público no ve el botón de postularse). En el detalle de su panel tiene el resumen "Invitados · Aceptaron · Dijeron que no · Sin respuesta".
- "Ver ficha" abre la ficha del postulante con `?oferta=<id>`: la ficha muestra "Invitar a esta oferta" con las mismas reglas que la lista, validadas en el servidor.
- El postulante ve sus invitaciones en `/invitaciones` ("Invitaciones" en el menú del usuario, sin contador); el aviso de invitación lleva ahí.
- Tipos de aviso nuevos: `invitacion_oferta` (postulante, con email), `invitacion_aceptada` e `invitacion_rechazada` (oficina, sin email).
- La coincidencia de texto es aproximada (raíces del español, sin sinónimos): "cajera" y "caja" no tienen la misma raíz. El rubro compensa buena parte de eso.

---

## Actualización (2026-10-21)

- **Pantalla propia de invitaciones.** Las invitaciones salieron de Mis postulaciones a `/invitaciones`. `migration_057` cambia el link de `invitaciones_oferta_avisos_fn()` (misma firma y cuerpo) y actualiza los avisos `invitacion_oferta` ya creados y sus emails sin enviar.
- **Búsqueda sin filtros.** Se quitaron los filtros y el bloque "Qué se compara": las razones de cada coincidencia ya están en la tarjeta.
- **"No interesado".** Reemplaza a "Dijo que no el …": sin fecha ni cantidad de invitaciones, con el motivo en un popover. El diálogo de "Invitar de nuevo" sigue mostrando fecha y motivo.
- **Invitar desde la ficha.** El mismo botón (`src/components/admin/invitar-boton.tsx`) aparece en la ficha cuando se entra desde la búsqueda; la oferta del parámetro `oferta` se vuelve a validar en el servidor.
- **Sin indicadores en la foto ni en el nombre.** Las invitaciones nuevas se informan solo con la campanita (ver decisión 014).
- **Datos de la oferta en la búsqueda.** Debajo del título: rubros, modalidad, lugar de trabajo, jornada y requisitos (desde el cuarto, en "Ver más"), con los mismos valores que el detalle público. Salen de la misma consulta de la oferta.
- **Volver al origen.** La búsqueda acepta `?volver=` y lo valida `destinoVolverBusqueda()` (`src/lib/invitaciones.ts`): solo `/`, `/ofertas` (con filtros), `/ofertas/<id>`, `/admin/ofertas` (con filtros) o `/admin/ofertas/<id>`; si no, vuelve al detalle de la oferta en el panel. Las tarjetas del listado mandan la vista con sus filtros, las del inicio `/` y el detalle público `/ofertas/<id>`. "Ver ficha" lleva la búsqueda con su `volver`, y la ficha lo vuelve a validar (`volverALaBusqueda()`).
- **Sin resumen de invitaciones en el detalle de la oferta.** El panel ya no muestra "Invitados · Aceptaron · …"; las respuestas se ven en la búsqueda. `resumen_invitaciones_oferta()` sigue en la base, pero el código ya no la usa.
