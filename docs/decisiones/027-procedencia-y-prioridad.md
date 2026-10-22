# 027 — Procedencia del postulante, comprobante de domicilio y prioridad

**Fecha:** 2026-10-20
**Estado:** Vigente
**Migración:** `migration_055_procedencia_y_prioridad.sql`

---

## Contexto

- La Oficina de Empleo prioriza a las personas de Funes. El postulante tenía un campo de domicilio libre, pero no se registraba la localidad ni había forma de verificarla. El registro pedía marcar "Confirmo que soy residente de Funes", que nadie controlaba.
- La oficina necesita ver de un vistazo quién es de Funes con domicilio verificado, quién dice ser de Funes y quién es de otra localidad, y ordenar las postulaciones con ese criterio.

---

## Decisiones tomadas

### 1. Lista de localidades de la zona más "Otra localidad"

`postulantes.localidad` (NULL = sin informar) sale de un desplegable con una lista fija definida en un solo lugar, `src/lib/localidades.ts`: Funes primero y después Rosario, Roldán, Pérez, Granadero Baigorria, Villa Gobernador Gálvez, Capitán Bermúdez, Ibarlucea, Soldini, Zavalla y San Lorenzo. Al final, "Otra localidad" muestra un campo de texto obligatorio.

- **No texto libre para todos:** "Funes", "funes", "FUNES " y "Fúnes" serían cuatro valores distintos, y las variantes de las localidades vecinas harían imposible filtrar o contar. Con la lista, casi todos los postulantes eligen un valor exacto.
- **No todas las ciudades del país:** una lista de miles de opciones es incómoda en el celular, hay que mantenerla y no aporta nada: a la oficina solo le importa distinguir Funes del resto. Las localidades de la zona cubren a casi todos los que se registran; el resto escribe la suya.
- El registro ya no pide confirmar que se vive en Funes: cualquiera puede registrarse y la prioridad la da la localidad (decisión 3).

### 2. Normalización de lo escrito a mano

`normalizarLocalidad()` (`src/lib/localidades.ts`) la usa el servidor antes de guardar y el campo del formulario al salir de él, para que la persona vea cómo queda:

1. Recorta y deja un solo espacio entre palabras.
2. Si coincide con una localidad de la lista sin importar mayúsculas, tildes ni espacios, se guarda el nombre exacto de la lista.
3. Si no, cada palabra con mayúscula inicial respetando las tildes y la ñ; "de", "del", "la", "las", "los", "el", "y", "e" en minúscula salvo al principio; las palabras con guion o apóstrofo se capitalizan en cada parte.

| Escrito | Guardado |
|---|---|
| `rosario` | Rosario |
| `perez` | Pérez |
| `granadero  baigorria` | Granadero Baigorria |
| `villa constitución` | Villa Constitución |
| `cañada de gómez` | Cañada de Gómez |
| `SAN JOSÉ DE LA ESQUINA` | San José de la Esquina |

Antes se valida que sea razonable: entre 2 y 60 caracteres, solo letras, espacios, guion, apóstrofo y punto.

### 3. Nivel de prioridad

| Nivel | Condición | Badge de la oficina |
|---|---|---|
| 1 | Funes y comprobante aprobado | "Funes · Verificado" (verde) |
| 2 | Funes sin comprobante, o pendiente o rechazado | "Funes · Sin verificar" (ámbar) y el detalle |
| 3 | Otra localidad o sin informar | "Otra localidad: …" o "Localidad sin informar" (gris) |

- La regla está en un solo lugar, `nivel_prioridad_calculado()`. El resultado se guarda en `postulantes.nivel_prioridad`, que mantienen triggers (al cambiar la localidad y al subir, revisar o eliminar un comprobante). Así los listados filtran y ordenan por una columna indexada, sin calcular por fila. Nadie puede escribirla: el trigger la recalcula en cada escritura y el permiso por columna del postulante es solo `localidad`.
- Reconocer Funes no depende de la normalización: `es_de_funes` la mantiene un trigger con `localidad_es_funes()`, que compara la localidad en minúsculas, sin tildes y solo con letras (`'funes'`). "  FÚNES " escrito directo en la base también cuenta.
- En la lista de postulaciones, "Primero verificados de Funes" ordena por `postulantes(nivel_prioridad)`, después por la fecha de siempre y por último por id, con la misma consulta paginada (`range`) que el resto: la paginación y los filtros por oferta y búsqueda no cambian. Está en Pendientes, Derivadas y Retiradas; "Contratado" y "No seleccionado" salen de otras consultas (derivaciones y una función) y no lo tienen.
- Los postulantes existentes quedan con localidad sin informar (nivel 3). El perfil les pide completarla con un aviso que no bloquea nada.

### 4. Comprobante de domicilio

- Es un tipo más de `archivos_usuario` (`comprobante_domicilio`): PDF, JPG, PNG o WEBP de hasta 5 MB, con las mismas validaciones de tipo, tamaño y firma que el resto (`src/lib/archivos.ts`) y los `CHECK` de la base. Como mucho uno vigente por usuario (índice único parcial); al subir otro, el anterior pasa a eliminado y lo borra la purga diaria.
- La verificación va en la misma fila (`verificacion_estado`, `verificacion_motivo`, `verificado_por`, `verificado_en`) y no en una tabla aparte: cada comprobante tiene una sola revisión, el estado nace y muere con el archivo y la purga borra todo junto. Los `CHECK` impiden usar esas columnas en CVs o fotos y exigen motivo al rechazar.
- Solo se puede tener comprobante si la localidad es Funes (trigger). Al cambiar la localidad, la verificación se reinicia: si sigue siendo Funes, el comprobante vuelve a "pendiente"; si deja de serlo, pasa a eliminado. El perfil lo avisa con un diálogo de confirmación antes de guardar.
- Solo la oficina revisa (`revisar_comprobante_domicilio`, valida `rol_actual() = 'municipalidad'`), solo un comprobante vigente y pendiente, y rechazar exige motivo (hasta 500 caracteres). El postulante recibe el resultado como aviso y por email; la oficina recibe un aviso (sin email) cada vez que hay uno por revisar, y tiene un contador en su inicio que lleva a la pantalla de comprobantes (ver Actualización).
- En el registro el comprobante es opcional. Se valida antes de crear la cuenta; la subida va después y, si falla, la cuenta queda creada igual y la página de verificación avisa que se puede subir desde el perfil.

### 5. Protección de los comprobantes (datos personales)

Un comprobante muestra nombre y dirección, y a veces más (consumo, número de cliente).

- Bucket privado `comprobantes`. La migración se detiene si está público.
- Sin políticas de escritura en Storage: se sube solo desde el servidor con `supabaseAdmin`, después de validar quién es el usuario y el archivo (igual que CVs y fotos desde la 054).
- Lectura: el postulante dueño (su comprobante vigente, `postulante_puede_ver_comprobante`) y la oficina. Se abre con URLs firmadas de pocos minutos.
- La ruta empieza con el id del usuario y nunca va a los logs ni a los avisos.
- Los reemplazados o eliminados se borran de Storage a los 30 días (purga de la 054, que ya incluye todo tipo de archivo eliminado).

### 6. La empresa no ve la procedencia, el nivel ni el comprobante

La prioridad es un criterio de la oficina para ordenar su trabajo, no un dato del candidato. Si la empresa viera "Funes · Verificado" o "Otra localidad", podría descartar candidatos por su domicilio, cuando la oficina ya decidió derivarlos. Además el comprobante es un dato personal que la empresa no necesita.

- La empresa no tiene políticas de lectura sobre `postulantes` ni `archivos_usuario`.
- Las funciones que le devuelven datos de un candidato (`candidato_para_empresa`, `candidato_para_empresa_completo`, `derivaciones_de_oferta_empresa`, `derivaciones_de_postulante_empresa`, `cv_de_derivacion_empresa`, `cv_de_candidato_empresa`) devuelven columnas fijas que no incluyen nada de esto. No se modificaron.
- El bucket `comprobantes` no tiene política para la empresa.
- `nivel_prioridad()` es `SECURITY INVOKER`: llamada por una empresa, no ve la fila y devuelve NULL.

---

## Actualización (2026-10-21)

### Lista de postulantes ordenada por nivel

- `/admin/postulantes` se ordena siempre por `nivel_prioridad` ascendente, después `created_at` descendente y por último `id` descendente, con o sin búsqueda y filtros. Es el orden del índice `postulantes_nivel_prioridad_idx`, y la paginación (`range`) no cambia.
- En cada página, arriba de la primera tarjeta de cada nivel va un título (`h2`): "De Funes, domicilio verificado", "De Funes, sin verificar" y "Otra localidad o sin informar".
- Cada tarjeta mantiene el badge de procedencia, que en el nivel 2 ya dice si el comprobante está en revisión, y suma un badge chico "Sin CV" (ningún CV disponible). Los dos salen de consultas por página (estado del comprobante y CVs vigentes de los postulantes de la página), no de una por tarjeta. La columna "CV" de la tarjeta se quitó porque repetía el badge.

### Filtros que se quitaron

- Procedencia (nivel), "Comprobante por revisar" y "Solo con CV". Con el orden por nivel, filtrar por procedencia ya no hace falta; los comprobantes se revisan en su propia pantalla, y el CV se ve en el badge.
- "Esperando curso" y "Con curso pendiente". La tarjeta ya muestra el estado del curso ("Necesita curso · N rechazos" o el estado de la asignación activa) y la línea "N cursos pendientes por terminar", que salen de consultas por página (`estado_cursos_postulantes` y las asignaciones pendientes de los postulantes de la página). Se sacaron las consultas previas que solo usaban esos filtros: `postulantes_esperando_curso_ids()` y la de `asignaciones_curso` del pre-filtro.
- Quedan el buscador y el filtro por rubros.
- El servidor ignora los parámetros `nivel`, `con_cv`, `comprobante`, `esperando_curso` y `curso_pendiente`: un link viejo muestra la lista sin esos filtros, sin error. Al cambiar un filtro se borran de la URL.
- La función `postulantes_esperando_curso_ids()` quedó sin uso en el código. Se borra en la migración de limpieza; `contar_postulantes_esperando_curso()` sigue en uso (contador del inicio de la oficina).

### Pantalla de comprobantes

- `/admin/comprobantes` (solo la oficina), en el menú después de "Postulantes". La tarjeta "Comprobantes por revisar" del inicio lleva acá.
- Pestañas "Por revisar (N)" (pendientes, primero los más viejos) y "Revisados" (aprobados y rechazados, primero los más recientes, con la fecha, quién lo revisó y el motivo del rechazo). Solo comprobantes vigentes (`eliminado_en` NULL), paginados como el resto de las listas.
- Cada fila muestra nombre (link a la ficha), DNI, localidad, domicilio declarado, fecha de carga y "Ver comprobante" con una URL firmada de 10 minutos generada en el servidor, igual que en la ficha (una sola llamada a Storage por página).
- Aprobar y rechazar usan la misma acción (`revisarComprobante`) y los mismos diálogos (`RevisarComprobante`) que la ficha. Al terminar se recarga la página: la fila sale de la lista y el número de la pestaña baja.
- La sección "Procedencia" de la ficha no cambió. El aviso a la oficina por un comprobante nuevo sigue llevando a la ficha del postulante (no se tocó la migración).

- **Rediseño (2026-10-22):** la lista es una tabla (tarjetas en pantallas angostas) y cada separador de nivel muestra el total de ese nivel con los filtros actuales, con un conteo `head: true` por nivel; ya no muestra la cantidad de postulaciones, los rechazos sueltos ni la fecha de registro (los rechazos siguen en "Necesita curso · N rechazos").

### Por qué el CV no entra en el orden

La lista de postulantes es un directorio: sirve para encontrar a una persona, no para elegir candidatos. Donde el CV importa, en la búsqueda de postulantes para una oferta (decisión 028), ya suma puntaje. En la lista alcanza con el badge "Sin CV" para verlo de un vistazo.

---

## Mejora futura

- **Foto del DNI:** el comprobante de domicilio no prueba la identidad de quien lo sube. Sumar la foto del DNI (frente con el domicilio) permitiría a la oficina comparar nombre y dirección. Queda fuera de esta etapa porque es un dato todavía más sensible y requiere definir con la oficina cuánto tiempo se guarda.

---

## Consecuencias

- Correr `migration_055_procedencia_y_prioridad.sql` antes de desplegar y después `npm run db:tipos`.
- El nivel de los postulantes existentes es 3 hasta que completen su localidad.
