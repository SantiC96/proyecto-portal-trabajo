# 014 — Notificaciones

**Fecha:** 2026-10-15 (actualizada 2026-10-16, pre-entrevista 044)
**Estado:** Vigente
**Migraciones:** `migration_038_cursos_sin_abandono_y_notificaciones.sql` (tabla y aviso de contratación), `migration_041_notificaciones_por_rol.sql` (avisos para los tres roles y vencimientos), `migration_042_empresas_email_confirmado.sql` (el alta de empresa espera la confirmación del email), `migration_043_avisos_oficina_y_oferta_rechazada.sql` (postulación nueva, postulante que necesita curso y link del aviso de oferta rechazada), `migration_044_pre_entrevistas.sql` (pre-entrevista coordinada / reprogramada)

---

## Contexto

La Oficina de Empleo se enteraba de una contratación solo si entraba a buscarla. Hacía falta un aviso, y se esperaba necesitar otros. En vez de una tabla por tipo de aviso se creó una tabla genérica (038). La migración 041 la usa para avisar a postulantes, empresas y la oficina de los hechos que les importan.

---

## Decisiones tomadas

### 1. Tabla `public.notificaciones`

| Columna | Tipo | Uso |
|---|---|---|
| `id` | `uuid` PK | |
| `usuario_id` | `uuid` FK → `usuarios(id)` `ON DELETE CASCADE` | destinatario |
| `tipo` | `text` + `CHECK notificaciones_tipo_check` | clase de aviso (ver la tabla de eventos) |
| `titulo` | `text` | encabezado corto |
| `mensaje` | `text` | texto completo, ya armado |
| `link` | `text` NULL + `CHECK notificaciones_link_check` | ruta interna (`/admin/...`, `/empresa/...`, `/mis-...`); nunca una URL externa |
| `clave` | `text` NULL | identificador del hecho que originó el aviso, para no duplicarlo |
| `leida_en` | `timestamptz` NULL | NULL mientras no se leyó |
| `created_at` | `timestamptz` | |

Índices:

- `notificaciones_usuario_leida_idx (usuario_id, leida_en, created_at DESC)`: contador de no leídas y listado.
- `notificaciones_usuario_clave_idx (usuario_id, clave) WHERE clave IS NOT NULL` (único): un mismo hecho genera como máximo un aviso por destinatario. Los que crean avisos usan `ON CONFLICT (usuario_id, clave) WHERE clave IS NOT NULL DO NOTHING`.

**Por qué el texto se guarda armado:** el aviso cuenta lo que pasó en ese momento. Si después cambia el nombre de la empresa o el título de la oferta, el aviso no cambia, y leerlo no necesita joins ni permisos sobre otras tablas.

**Por qué `clave` y no una FK:** la tabla sirve para avisos de cualquier origen. `clave` es texto libre con la forma `'<hecho>:<id>[:<marca>]'`.

### 2. Permisos

- RLS activado. Políticas: `SELECT` y `UPDATE` solo sobre las filas con `usuario_id = auth.uid()`.
- Grants: `SELECT` y `UPDATE (leida_en)` para `authenticated`. Nada para `anon`.
- **Nadie inserta ni borra desde el cliente.** Las filas las crean triggers o funciones `SECURITY DEFINER`. Las funciones auxiliares de 041 (`notificar_usuario`, `notificar_oficina`, `notificaciones_marca`, `notificaciones_fecha`) no tienen `EXECUTE` para `public`, `anon` ni `authenticated`: un usuario no puede fabricar avisos para otro.

### 3. Reglas de los triggers (041)

- **AFTER** `INSERT` / `UPDATE`, filtrados con `WHEN`. No se usa `UPDATE OF <columna>`: los resets que hacen los triggers `BEFORE` (oferta editada → `pendiente_aprobacion` en 027, empresa rechazada → `pendiente` en 031) no figuran en el `SET` del `UPDATE` y ese tipo de trigger no los vería.
- **Un aviso que falla nunca frena la acción principal:** cada función envuelve su trabajo en `BEGIN ... EXCEPTION WHEN OTHERS` y deja un `RAISE WARNING`.
- **No se avisa a quien hizo la acción:** `notificar_usuario` ignora al destinatario si es `auth.uid()`; `notificar_oficina` excluye a `auth.uid()`. Si la oficina corrige una derivación, el postulante recibe el aviso y la oficina no se avisa a sí misma.
- **Solo datos que el destinatario ya ve:** título de la oferta, `empresa_nombre`, razón social, nombre del curso, fecha y lugar de la entrevista y de la pre-entrevista, motivo de rechazo de la propia solicitud u oferta, y el nombre del candidato derivado para la empresa (decisión 007). Nunca el DNI ni las notas internas (`nota_oficina` de postulaciones y de pre-entrevistas, `nota_municipalidad`, `nota_empresa`).
- **Sin backfill:** los hechos anteriores a la migración no generan avisos.
- **Retirar una postulación no avisa a nadie:** es un `DELETE` de una postulación en `recibida` (todavía sin derivación) y no hay triggers de `DELETE`.
- Las fechas del texto se escriben en hora de Argentina (`DD/MM/YYYY a las HH:MI hs`). Las marcas de las claves son milisegundos desde 1970, que no dependen de la zona horaria de la sesión.

### 4. Eventos

| Tipo | Disparador | Destinatario | Título | Link | Clave |
|---|---|---|---|---|---|
| `postulacion_derivada` | `INSERT` en `derivaciones` (`derivar_postulacion`) | postulante | Tu postulación fue derivada | `/mis-postulaciones` | `derivacion:<derivacion_id>` |
| `candidato_derivado` | mismo `INSERT` | empresa dueña de la oferta | Nuevo candidato derivado | `/empresa/ofertas/<oferta_id>/candidatos/<derivacion_id>` | `derivacion:<derivacion_id>` |
| `entrevista` | `UPDATE` en `derivaciones` con `estado_empresa = 'en_proceso'` y cambio de `fecha_entrevista` o `lugar_entrevista` | postulante | Entrevista coordinada / Entrevista reprogramada | `/mis-postulaciones` | `entrevista:<derivacion_id>:<fecha_entrevista>:<md5(lugar)>` |
| `seleccionado` | `estado_empresa` pasa a `contratado` | postulante | ¡Fuiste seleccionado! | `/mis-postulaciones` | `seleccionado:<derivacion_id>` |
| `no_seleccionado_empresa` | `estado_empresa` pasa a `rechazado` | postulante | No fuiste seleccionado | `/mis-postulaciones` | `no_seleccionado:<derivacion_id>` |
| `contratacion` (038) | `estado_empresa` pasa a `contratado` | oficina | Nueva contratación | `/admin/postulaciones/<postulacion_id>` | `contratacion:<derivacion_id>` |
| `no_seleccionado_oficina` | `postulaciones.estado` pasa a `rechazada_municipalidad` | postulante | Postulación no seleccionada | `/mis-postulaciones` | `postulacion_no_seleccionada:<postulacion_id>:<updated_at>` |
| `curso_asignado` | `INSERT` en `asignaciones_curso` | postulante | Te asignaron un curso | `/mis-cursos/<asignacion_id>` | `curso_asignado:<asignacion_id>` |
| `pre_entrevista_coordinada` (044) | `INSERT` en `pre_entrevistas` (`coordinar_pre_entrevista`) | postulante | Pre-entrevista coordinada | `/mis-postulaciones` | `pre_entrevista_coordinada:<pre_entrevista_id>` |
| `pre_entrevista_reprogramada` (044) | `UPDATE` en `pre_entrevistas` que la deja `coordinada` y antes no lo estaba (`no_asistio` → `coordinada`) o cambia `fecha_hora` o `lugar` (ver sección 10) | postulante | Pre-entrevista reprogramada | `/mis-postulaciones` | `pre_entrevista_reprogramada:<pre_entrevista_id>:<updated_at>` |
| `curso_completado` | `asignaciones_curso.estado` pasa a `completado` | oficina | Curso completado | `/admin/postulantes/<postulante_id>` | `curso_completado:<asignacion_id>` |
| `postulacion_nueva` (043) | `INSERT` en `postulaciones` | oficina | Nueva postulación | `/admin/postulaciones/<postulacion_id>` | `postulacion_nueva:<postulacion_id>` |
| `necesita_curso` (043) | `estado_empresa` pasa a `rechazado` y el postulante queda necesitando curso (ver sección 6) | oficina | Postulante necesita curso | `/admin/postulantes/<postulante_id>` | `necesita_curso:<postulante_id>:<ultimo_completado_en o 0>` |
| `empresa_pendiente` | la empresa pendiente confirma su email (ver sección 5) | oficina | Nueva empresa para revisar | `/admin/empresas?estado=pendiente` | `empresa_registrada:<empresa_id>` |
| `empresa_pendiente` | `estado_aprobacion` `rechazada` → `pendiente` (reenvío) | oficina | Solicitud reenviada | `/admin/empresas?estado=pendiente` | `empresa_reenviada:<empresa_id>:<fecha_decision del rechazo>` |
| `solicitud_aprobada` | `estado_aprobacion` pasa a `aprobada` | empresa | Tu empresa fue aprobada | `/empresa` | `solicitud_aprobada:<empresa_id>:<fecha_decision>` |
| `solicitud_rechazada` | `estado_aprobacion` pasa a `rechazada` (con motivo) | empresa | Tu solicitud fue rechazada | `/empresa` | `solicitud_rechazada:<empresa_id>:<fecha_decision>` |
| `oferta_pendiente` | `INSERT` en `ofertas` en `pendiente_aprobacion` | oficina | Nueva oferta para revisar | `/admin/ofertas/<oferta_id>` | `oferta_nueva:<oferta_id>` |
| `oferta_pendiente` | `ofertas.estado` pasa a `pendiente_aprobacion` (edición) | oficina | Oferta editada para revisar | `/admin/ofertas/<oferta_id>` | `oferta_editada:<oferta_id>:<updated_at>` |
| `oferta_aprobada` | `pendiente_aprobacion` → `activa` | empresa | Oferta aprobada | `/empresa/ofertas/<oferta_id>` | `oferta_aprobada:<oferta_id>:<revisado_en>` |
| `oferta_rechazada` | `pendiente_aprobacion` → `rechazada` (con motivo) | empresa | Oferta rechazada | `/empresa/ofertas/<oferta_id>/editar` (043; ver sección 7) | `oferta_rechazada:<oferta_id>:<revisado_en>` |
| `oferta_por_vencer` | `generar_avisos_vencimiento_empresa` | empresa | Oferta por vencer | `/empresa/ofertas/<oferta_id>` | `oferta_por_vencer:<oferta_id>:<vence_en>` |
| `oferta_vencida` | `generar_avisos_vencimiento_empresa` | empresa | Oferta vencida | `/empresa/ofertas/<oferta_id>` | `oferta_vencida:<oferta_id>:<vence_en>` |

"Oficina" = cada usuario con rol `municipalidad`. Los avisos para la empresa usan `empresas.usuario_id` de la empresa dueña de la oferta; las ofertas cargadas por la oficina sin `empresa_id` no avisan a ninguna empresa.

**Por qué algunas claves llevan una fecha:** los hechos que se pueden repetir necesitan una clave distinta cada vez. Una entrevista reprogramada tiene otra fecha u otro lugar; una pre-entrevista reprogramada tiene otro `updated_at`; una oferta vuelve a aprobarse con otro `revisado_en`; una empresa reenvía su solicitud después de un rechazo con otra `fecha_decision`; la oficina puede volver a descartar una postulación con otro `updated_at`. Los hechos que ocurren una sola vez (derivación, contratación, curso asignado o completado, alta de empresa, oferta o postulación) usan solo el id.

El aviso de contratación (038) conserva su comportamiento, textos, link y clave. La 041 reemplaza `derivaciones_notificar_contratacion_fn` solo para envolverla en `EXCEPTION WHEN OTHERS` como los triggers nuevos. A diferencia de ellos, sigue avisando a **todos** los usuarios de la oficina, incluido quien corrige la derivación (por eso no usa `notificar_oficina`, que excluye a quien hizo la acción).

### 5. Alta de empresa: el aviso espera la confirmación del email (042)

`registrarEmpresa` inserta la fila de `empresas` justo después de `signUp`, antes de que la empresa confirme su email (`emailRedirectTo` a `/auth/callback`). Avisar en ese `INSERT` mandaba a la oficina a revisar empresas que quizá nunca confirmen. Desde 042:

- **`empresas_notificar_alta_fn`** (trigger `AFTER INSERT` de 041) solo avisa si `auth.users.email_confirmed_at` ya no es NULL al insertarse la empresa, por ejemplo con la confirmación de email desactivada en Supabase.
- **`auth_users_notificar_email_confirmado`** (`AFTER UPDATE ON auth.users`, mismo patrón que `on_auth_user_created` de 006) se dispara solo cuando `email_confirmed_at` pasa de NULL a un valor (`WHEN`). Si el usuario tiene una empresa en `pendiente`, avisa con el mismo texto, link y clave `empresa_registrada:<empresa_id>`: entre los dos triggers el aviso sale una sola vez. Para quien no es empresa hace una sola búsqueda por `empresas.usuario_id` (único) y no hace nada más. Atrapa cualquier error con `EXCEPTION WHEN OTHERS` + `RAISE WARNING`: confirmar el email o iniciar sesión nunca falla por el aviso.
- Sin backfill: las empresas registradas antes de 042 no generan avisos nuevos.

La revisión también espera la confirmación:

- `empresas_email_sin_confirmar()` (`SECURITY DEFINER`, vacía para cualquier rol que no sea `municipalidad`, como `emails_de_usuarios` de 018) devuelve los ids de las empresas `pendiente` cuyo usuario no confirmó el email. La aplicación no puede leer `auth.users`.
- Para la oficina una empresa sin email confirmado no existe hasta que confirma: `/admin/empresas` solo tiene las pestañas **Pendientes**, **Aprobadas** y **Rechazadas**, y las excluye de **Pendientes** (y de su búsqueda y paginación) con `empresas_email_sin_confirmar()`. El contador de empresas pendientes del inicio de `/admin` tampoco las cuenta. Solo pueden estar en `pendiente`, porque la oficina no puede aprobarlas ni rechazarlas. (Antes de 043 había una pestaña **Email sin confirmar**; se sacó.)
- `prevent_empresa_estado_change_fn` rechaza con `P0001` "La empresa todavía no confirmó su email." cuando `municipalidad` intenta aprobar o rechazar una empresa sin email confirmado. Sin rol (`auth.uid()` NULL: SQL Editor, service role) sigue sin restricciones.

### 6. Postulante que necesita curso (043)

La regla es la de 035 (decisión de cursos): umbral de rechazos (`parametros_cursos()`, hoy 3) dentro de los últimos 90 días, posteriores al último curso completado, y sin asignación activa. `estado_cursos_postulantes()` exige el rol `municipalidad` y falla para cualquier otro, así que un trigger que corre cuando la empresa rechaza no puede usarla.

- **`estado_cursos_calculo(p_postulante_ids)`**: el cálculo de 035 sin el control de rol. `SECURITY DEFINER`, sin `EXECUTE` para `public`, `anon` ni `authenticated`: solo la llaman funciones `SECURITY DEFINER`.
- **`estado_cursos_postulantes()`** mantiene firma, retorno y control de rol, y ahora devuelve lo que calcula `estado_cursos_calculo`. La regla vive en un solo lugar; las funciones de 035 y 039 que la usan no cambian.
- **`derivaciones_notificar_necesita_curso`** (`AFTER UPDATE ON derivaciones`, `WHEN` `estado_empresa` pasa a `rechazado`): si después de ese rechazo el postulante necesita curso, avisa a la oficina "<Nombre Apellido> tiene N rechazos recientes y necesita un curso.".
- **Un aviso por ciclo:** la clave lleva la marca de `ultimo_completado_en` (o `0` si nunca completó un curso). El 4.º o 5.º rechazo dan la misma clave y no avisan de nuevo; al completar un curso cambia la marca y el próximo ciclo vuelve a avisar.
- Sin backfill: un postulante que ya necesitaba curso antes de 043 recibe su aviso con el próximo rechazo.

### 7. Aviso de oferta rechazada (043)

El aviso `oferta_rechazada` lleva a `/empresa/ofertas/<oferta_id>/editar`, donde la empresa corrige y reenvía la oferta, y no al detalle con los candidatos. La 043 reemplaza `ofertas_notificar_revision_fn` cambiando solo ese link, y corrige con un `UPDATE` de la columna `link` los avisos `oferta_rechazada` ya creados que tenían el link exacto `/empresa/ofertas/<uuid>` (re-ejecutable: los corregidos ya no coinciden). El detalle `/empresa/ofertas/<id>` de una oferta rechazada muestra arriba el motivo del rechazo y el botón **Corregir y reenviar**.

### 8. Vencimientos sin cron

No hay cron (decisión 013): una oferta vencida sigue en estado `activa`. Los avisos de vencimiento los crea `generar_avisos_vencimiento_empresa(p_dias_aviso)` (`SECURITY DEFINER`, solo rol `empresa`, `42501` para otro rol), que el panel `/empresa` llama al cargarse, antes de renderizar, para que la campanita ya los cuente. Si falla, se registra con `logError` y la página carga igual.

- Para las ofertas activas de la empresa del usuario actual crea los avisos que falten: `oferta_vencida` si `vence_en <= now()`, `oferta_por_vencer` si vence dentro de `p_dias_aviso` días.
- `p_dias_aviso` lo pasa la aplicación: `DIAS_AVISO_VENCIMIENTO` de `src/lib/ofertas-vencimiento.ts`, la misma constante del aviso de vencimiento del panel. La función acepta entre 1 y 60.
- La clave incluye `vence_en`: al renovar la oferta (036) cambia la fecha y la oferta vuelve a avisar en su próximo vencimiento.
- Si la empresa no entra al panel mientras la oferta está por vencer, solo recibe el aviso de vencida. Una oferta que ya estaba vencida al aplicar la migración genera su aviso de vencida la primera vez que la empresa entra al panel: es una situación actual sobre la que tiene que actuar (renovarla), no un hecho pasado.

### 9. Interfaz

- **Campanita** (`CampanaNotificaciones`) en la navbar de los tres roles: cantidad de no leídas (oculta en 0), últimos 5 avisos con ícono y color por tipo y fecha relativa ("hace 2 horas"; la fecha exacta en el `title`), "Marcar como leída" por aviso, "Marcar todas como leídas" y "Ver todas las notificaciones".
- **El contador no viene del layout.** En Next 16 los layouts no se vuelven a ejecutar al navegar, así que la campanita pide los datos con la server action `obtenerNotificacionesRecientes` al montarse, en cada cambio de ruta (`usePathname`), al abrirse y cuando el listado avisa que marcó notificaciones (evento de ventana `notificaciones:cambiaron`, `src/components/notificaciones/eventos.ts`). El layout raíz solo pasa la ruta del listado del rol (`notificacionesHref` en `obtenerSesionActual()`).
- **Listado completo**, paginado (20 por página), con el mismo componente `PaginaNotificaciones` en:
  - `/notificaciones` (postulante, dentro de `(dashboard)`),
  - `/empresa/notificaciones` (empresa; fuera de `empresa/(panel)` para que una empresa pendiente o rechazada también pueda leer sus avisos),
  - `/admin/notificaciones` (oficina).
- Marcar una o todas como leídas (campanita o listado) no muestra ningún aviso de éxito; si falla, sí se muestra el error.
- Hacer clic en un aviso lo marca como leído y lleva a su link (`abrirNotificacion`, que solo redirige a rutas internas con `esLinkInterno`, aunque la base ya lo exige con el CHECK).
- Las server actions (`src/app/(dashboard)/notificaciones/actions.ts`) son las mismas para los tres roles: exigen uno de los tres roles con `requerirRol` / `requerirRolPagina` y filtran por el usuario de la sesión.
- Íconos y colores por tipo en un solo lugar: `src/components/notificaciones/icono-notificacion.tsx`.

### 10. Pre-entrevista (044)

La pre-entrevista de la oficina con el postulante (decisión 017) avisa al postulante cuando se coordina y cada vez que se reprograma, con la oferta, la fecha y hora (hora de Argentina) y el lugar. Trigger `AFTER INSERT` / `AFTER UPDATE` sobre `pre_entrevistas`, filtrado con `WHEN`, con `EXCEPTION WHEN OTHERS` + `RAISE WARNING` y `notificar_usuario` (la oficina, que hace la acción, no se avisa).

- **Clave de la reprogramación con `updated_at`**, no con la fecha y el lugar como la entrevista de la empresa: `reprogramar_pre_entrevista` fija `updated_at = now()`, así que cada reprogramación tiene su aviso aunque vuelva a una fecha y un lugar anteriores.
- **Sin aviso** cuando se marca `realizada` ni `no_asistio`.
- La nota interna de la pre-entrevista nunca va en el mensaje.

---

## Cómo agregar un aviso nuevo

1. Migración nueva que reemplace `notificaciones_tipo_check` con la lista completa más el tipo nuevo (`DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT`).
2. Un trigger `AFTER` o una función `SECURITY DEFINER` que llame a `public.notificar_usuario(...)` o `public.notificar_oficina(...)` con una `clave` que identifique el hecho, dentro de un `BEGIN ... EXCEPTION WHEN OTHERS THEN RAISE WARNING`.
3. Agregar el tipo a `icono-notificacion.tsx`. La tabla, las políticas, la campanita y los listados no cambian.

---

## Archivos clave

```
src/migrations/migration_038_cursos_sin_abandono_y_notificaciones.sql
src/migrations/migration_041_notificaciones_por_rol.sql
src/migrations/migration_042_empresas_email_confirmado.sql
src/migrations/migration_043_avisos_oficina_y_oferta_rechazada.sql
src/migrations/migration_044_pre_entrevistas.sql          — BLOQUE 9: avisos de pre-entrevista
src/lib/admin/empresas-sin-confirmar.ts                  — ids de empresas pendientes sin email confirmado
src/lib/notificaciones.ts                                — tipos, resumen, rutaNotificaciones, esLinkInterno, generarAvisosVencimientoEmpresa
src/app/(dashboard)/notificaciones/actions.ts           — refrescar, marcar leída(s), abrir (tres roles)
src/app/(dashboard)/notificaciones/page.tsx             — listado del postulante
src/app/empresa/notificaciones/page.tsx                 — listado de la empresa
src/app/admin/notificaciones/page.tsx                   — listado de la oficina
src/components/notificaciones/campana-notificaciones.tsx
src/components/notificaciones/pagina-notificaciones.tsx — listado paginado compartido
src/components/notificaciones/acciones-notificaciones.tsx
src/components/notificaciones/icono-notificacion.tsx
src/components/notificaciones/eventos.ts
```
