# 026 — Varios CVs, CV elegido al postularse y borrado lógico de archivos

**Fecha:** 2026-10-20
**Estado:** Vigente
**Migración:** `migration_054_cvs_y_borrado_logico_archivos.sql`

---

## Contexto

- El postulante tenía un solo CV activo: subir otro dejaba el anterior con `activo = false`, pero el archivo nunca se borraba de Storage. Lo mismo con las fotos de perfil. Los buckets crecían sin límite con archivos que nadie podía ver.
- La postulación no guardaba con qué CV se hizo: la oficina y la empresa veían siempre el CV activo del momento, aunque el postulante lo hubiera cambiado después.

---

## Decisiones tomadas

### 1. Estados de un archivo

`archivos_usuario.eliminado_en` es el borrado lógico.

| Estado | Columnas | Quién lo ve |
|---|---|---|
| CV disponible | `tipo = 'cv'`, `eliminado_en` NULL | El postulante en su perfil (hasta 5), la oficina, y la empresa si es el CV de una postulación derivada a ella. Se puede elegir al postularse. |
| CV eliminado | `eliminado_en` con fecha | El postulante ya no lo ve ni lo abre. La oficina y la empresa lo siguen viendo mientras esté asociado a una postulación en curso. |
| Foto activa | `tipo = 'avatar'`, `eliminado_en` NULL | La que se muestra (una por usuario). |
| Foto eliminada | `eliminado_en` con fecha | Nadie la muestra; la purga la borra. |

- `activo` se conserva porque lo leen consultas y políticas existentes, pero siempre vale `eliminado_en IS NULL`: lo garantizan un `CHECK` y el trigger `archivos_usuario_estado`. El trigger además traduce una escritura vieja que solo pone `activo = false` a `eliminado_en = now()`, para que el código anterior siga funcionando mientras se despliega el nuevo.
- El índice "un activo por usuario y tipo" (009) queda solo para fotos.

### 2. Hasta 5 CVs, garantizado en la base

- `cvs_maximo()` = 5 (en TypeScript, `CV_MAXIMOS` de `src/lib/archivos.ts`, solo para la pantalla y para no subir el archivo en vano).
- El trigger `archivos_usuario_estado` (BEFORE INSERT OR UPDATE) controla el límite cada vez que un CV pasa a disponible (alta o restauración a mano), venga de donde venga: bloquea la fila del usuario en `usuarios` (`FOR NO KEY UPDATE`, el mismo bloqueo que `activar_archivo_usuario` desde 040), cuenta los disponibles y rechaza con `P0001`: "Podés tener hasta 5 CVs. Para subir otro, eliminá alguno de los que tenés."
- Dos subidas simultáneas: la segunda espera el bloqueo hasta que la primera termina; como en `READ COMMITTED` cada sentencia de la función toma una instantánea nueva, el conteo ya incluye el CV confirmado. Nunca se elimina un CV automáticamente.
- `activar_archivo_usuario` mantiene la firma y el retorno: para una foto marca eliminada la anterior; para un CV solo agrega uno.
- Si un postulante quedara con más de 5 disponibles (por una corrección a mano), nada se rompe: solo no puede subir más hasta bajar de 5.

### 3. CVs y fotos que ya existían

Todo archivo con `activo = false` (CVs y fotos reemplazados o quitados antes de la 054) pasa a eliminado con **la fecha en que se aplica la migración**, no la de su reemplazo: la purga los borra recién 30 días después, con margen para revisar. El CV activo de cada postulante queda disponible, así que nadie queda con más de uno.

No hay CVs viejos asociados a postulaciones en curso: las postulaciones existentes no guardaban el CV y siguen mostrando el más reciente, como hasta ahora.

### 4. CV elegido al postularse

- `postulaciones.cv_archivo_id` (FK a `archivos_usuario`, `ON DELETE SET NULL`). El trigger `postulaciones_cv_elegido` valida que sea del mismo postulante, de tipo `cv` y no eliminado, y bloquea la fila del CV (`FOR SHARE`) hasta el final de la transacción: si el postulante lo elimina al mismo tiempo, una operación espera a la otra.
- Un `INSERT` sin CV (código anterior al despliegue) toma el disponible más reciente; si no tiene ninguno y quien inserta es un usuario, se rechaza.
- La acción `postularme(ofertaId, cvArchivoId)` valida que el CV sea suyo y esté disponible y lo manda en el mismo `INSERT` de la postulación: no hace falta otra función.
- Postulaciones existentes: `cv_archivo_id` NULL. Para ellas (y para las que pierdan el CV en la purga) se muestra el CV disponible más reciente del postulante (`cv_de_postulacion`).

### 5. Postulación "en curso"

`postulacion_en_curso(estado, estado_empresa)`:

| Estado | |
|---|---|
| `recibida`, `en_revision` | en curso |
| `derivada` con derivación `pendiente` o `en_proceso` (o sin derivación) | en curso |
| `derivada` con `contratado`, `rechazado`, `oferta_retirada` o `retirada_postulante`; `rechazada_municipalidad`; `oferta_retirada`; `retirada_postulante` | cerrada |

`contratado` se toma como proceso terminado.

### 6. Permisos

- **Postulante:** la política de `archivos_usuario` y la del bucket `cvs` ("postulante puede leer su cv") exigen `eliminado_en IS NULL`. Un CV eliminado no se abre aunque el archivo siga en Storage.
- **Oficina:** sin cambios: lee todos los archivos y todo el bucket (018), también los CVs eliminados hasta que se purgan.
- **Empresa:** `empresa_puede_ver_cv` (misma firma, la usa la misma política) solo deja abrir el CV de una postulación derivada a una oferta suya: el elegido, o el respaldo si es NULL; si ese CV está eliminado, solo mientras la postulación siga en curso. Antes veía el CV activo de cualquier candidato derivado o guardado; un guardado siempre tuvo una derivación (la política de `INSERT` de `candidatos_guardados` lo exige), así que ve el de esa.
- La ficha del candidato en la oferta usa `cv_de_derivacion_empresa`; el perfil del candidato, `cv_de_candidato_empresa` (el de la derivación más reciente a esa empresa). `candidato_para_empresa` y `candidato_para_empresa_completo` mantienen firma y retorno; `cv_ruta` sale de `cv_de_candidato_empresa` (antes el `LEFT JOIN` al CV activo devolvería una fila por CV).
- **Escrituras en los buckets:** la 054 quita las seis políticas de `INSERT`, `UPDATE` y `DELETE` de `cvs` y `avatares` de 008. Con ellas un usuario podía subir, sobrescribir o borrar archivos de su carpeta con la API de Storage, salteando la validación del servidor (tipo, tamaño, firma), el máximo de CVs y la protección de los CVs elegidos (por ejemplo, cambiar el PDF de una postulación en curso). El portal no las usaba: `subirAvatar`, `subirCV` y la purga suben y borran con `supabaseAdmin`, y con la sesión del usuario solo se generan URLs firmadas. Quedan solo políticas de lectura.
- Mis postulaciones muestra con qué CV se postuló con `cvs_de_mis_postulaciones` (nombre y fecha, también de un CV ya eliminado; nunca la ruta).

### 7. Purga diaria

Tarea `archivos_eliminados` en `src/lib/mantenimiento.ts`, dentro del cron `/api/mantenimiento/purgar`:

1. `archivos_a_purgar(500)` (solo service role) devuelve los CVs y fotos eliminados hace más de `archivos_dias_purga()` = 30 días, **excepto** los CVs elegidos en una postulación en curso y las rutas que otra fila no eliminada todavía usa. No modifica nada.
2. Se borran de Storage en tandas de 100 por bucket (`cvs` y `avatares`) con `supabaseAdmin`.
3. `confirmar_archivos_purgados(ids)` borra solo las filas de las tandas que Storage borró sin error. `postulaciones.cv_archivo_id` queda en NULL por la FK.

Si una tanda falla, sus filas quedan y vuelven a salir al día siguiente; la corrida se marca fallida (el cron responde 500). Borrar un archivo que ya no está no es un error, así que un reintento también limpia filas cuyo archivo ya se había borrado. Los logs llevan solo el bucket y cantidades, nunca rutas (empiezan con el id del usuario).

Un CV de una postulación ya cerrada se purga 30 días después de eliminado. Si una postulación vuelve a abrirse entre la consulta y el borrado (una corrección de la oficina), el archivo puede borrarse igual: la ventana es de segundos y la postulación pasa a mostrar el CV más reciente.

La migración no borra archivos de Storage: solo la purga lo hace.

---

## Alternativas descartadas

- **Reemplazar el CV en lugar de agregar:** obligaba a postularse siempre con el último y cambiaba lo que veía la empresa en postulaciones viejas.
- **Eliminar el CV más viejo al llegar a 5:** el postulante perdería un CV sin pedirlo.
- **Contar en la server action:** dos subidas simultáneas pasarían el límite; la regla tiene que valer también desde otros caminos.
- **Contar los CVs viejos como disponibles:** algunos postulantes quedarían con más de 5 desde el primer día y con CVs que nunca eligieron conservar.
- **Una sola función que borre filas y devuelva rutas:** si el borrado en Storage falla, la fila ya no existiría y el archivo quedaría huérfano para siempre.

---

## Pendiente

- El filtro "con CV" de la base de postulantes trae las filas de `archivos_usuario` sin paginar; con varios CVs por persona llega antes al límite de filas de PostgREST.
