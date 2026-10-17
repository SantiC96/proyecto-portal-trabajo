# 020 — Notificaciones por email

**Fecha:** 2026-10-17
**Estado:** Vigente
**Migración:** `migration_048_emails.sql`

---

## Contexto

Los avisos del portal (decisión 014) solo se ven al entrar. Para que el postulante, la empresa y la oficina se enteren sin entrar, algunos avisos también se mandan por email, por SMTP con una cuenta de Gmail. Los avisos se crean en la base (triggers y funciones de 041–044), no en la aplicación, así que el email tiene que salir de lo que la base registra.

---

## Decisiones tomadas

### 1. Cola de salida (outbox) en la base

Un trigger `AFTER INSERT` sobre `notificaciones` agrega una fila en `emails_pendientes`; la aplicación lee esa tabla y manda los emails.

Por qué así y no mandando el email desde cada acción:

- **Un solo lugar.** Los avisos salen de muchos triggers y funciones distintos. Encolar desde `notificaciones` cubre todos, también los que se generan desde el SQL Editor o desde funciones de la base, sin tocar ninguno.
- **Misma transacción.** El email se encola solo si el aviso se guardó. Si la acción falla y se deshace, la fila de la cola también.
- **El SMTP no frena la acción.** Mandar un email tarda segundos y puede fallar. La acción responde enseguida; el envío va después y se reintenta.
- **Nunca rompe el aviso.** El trigger atrapa cualquier error (`EXCEPTION WHEN OTHERS` + `RAISE WARNING`), igual que los avisos de 041.

La tabla tiene RLS activado sin políticas y sin permisos para `anon` ni `authenticated`: guarda direcciones de email y solo la lee la service role (`supabaseAdmin`, decisión 005).

El destinatario se copia de `auth.users.email` al encolar, solo si `email_confirmed_at` no es nulo y tiene forma de dirección. Sin email confirmado no hay fila.

### 2. Qué tipos mandan email

La lista vive en una sola función, `email_tipo_con_envio(tipo)`. Para cambiarla se reemplaza esa función con una migración nueva.

| Destinatario | Con email |
|---|---|
| Postulante | `postulacion_derivada`, `entrevista`, `seleccionado`, `no_seleccionado_empresa`, `no_seleccionado_oficina`, `curso_asignado`, `pre_entrevista_coordinada`, `pre_entrevista_reprogramada` |
| Empresa | `solicitud_aprobada`, `solicitud_rechazada`, `oferta_aprobada`, `oferta_rechazada`, `candidato_derivado`, `oferta_por_vencer`, `oferta_vencida` |
| Oficina | `empresa_pendiente`, `oferta_pendiente`, `contratacion` |

**Solo aviso en el portal:** `postulacion_nueva`, `necesita_curso`, `curso_completado` y cualquier tipo nuevo que no se agregue a la lista. Son avisos frecuentes para la oficina que se revisan desde el panel; por email serían ruido.

**Solo email, sin aviso:** `postulacion_recibida`, la confirmación al postulante cuando se postula. La encola un trigger `AFTER INSERT` sobre `postulaciones` directo en la cola; no se agregó al CHECK de `notificaciones`. A diferencia de los avisos, acá sí se le escribe a quien hizo la acción.

El email usa el título del aviso como asunto y copia el mensaje y el link. Los mensajes ya cumplen las reglas de 041 (nada de DNI ni notas internas), así que el email no muestra nada que el destinatario no vea en el portal.

Sin backfill: los avisos anteriores a la migración no generan emails.

### 3. Cuándo se envía: `after()` + cron diario

- **Normal:** las server actions que pueden generar un aviso con email llaman a `programarEnvioEmails()` cuando salieron bien. Usa `after()` de `next/server`: procesa hasta 20 emails de la cola después de mandar la respuesta. También se llama desde `/auth/callback` (confirmar el email de una empresa genera `empresa_pendiente`, 042) y al generar avisos de vencimiento en el panel de empresa.
- **Respaldo:** Vercel Cron llama a `GET /api/emails/procesar` todos los días a las 12:00 UTC (9 h de Argentina) y procesa hasta 50. El plan Hobby solo permite un cron por día, así que sirve para reintentos y para avisos creados fuera de la aplicación, no para el envío normal.

La ruta del cron valida `Authorization: Bearer <CRON_SECRET>` con comparación de tiempo constante. Sin la variable o con otro valor responde 401 sin procesar nada. Devuelve solo cuántos se enviaron y cuántos fallaron. `proxy.ts` la deja pasar sin sesión.

### 4. Reclamo y reintentos

`reclamar_emails_pendientes(p_limite)` (solo service role) toma filas `pendiente`, `fallido` con menos de 5 intentos o `enviando` con el bloqueo vencido, con `proximo_intento` ya cumplido. Usa `FOR UPDATE SKIP LOCKED` y las deja en `enviando`, con un intento más y bloqueadas 5 minutos: si `after()` y el cron corren a la vez, no mandan el mismo email dos veces.

| Resultado | Estado | Además |
|---|---|---|
| Enviado | `enviado` | `enviado_en` |
| Error | `fallido` | `ultimo_error` (recortado, sin direcciones) y `proximo_intento` |

Espera antes de reintentar según los intentos hechos: 1 min, 5 min, 30 min, 2 h. Después del 5.º intento la fila queda `fallido` y no se vuelve a tomar. Si el proceso se corta en medio del envío, la fila vuelve a la cola cuando vence el bloqueo.

Caso borde aceptado: si el email salió pero no se pudo marcar `enviado`, se puede mandar dos veces. Es preferible a perderlo.

### 5. Límites de Gmail

Gmail permite unos 500 envíos por día por cuenta. Con el volumen de un municipio alcanza, pero:

- Cada tanda está acotada (20 por acción, 50 por cron, como máximo 100 por llamada a la función).
- Si Gmail rechaza por cuota, los emails quedan `fallido` y se reintentan con espera; los que agotan los 5 intentos se pueden volver a poner en `pendiente` a mano.
- Si el volumen crece, la alternativa es un proveedor transaccional (SMTP de otro servicio): solo cambian las variables `SMTP_*`.

### 6. Configuración

Variables: `SMTP_HOST`, `SMTP_PORT` (465, TLS directo), `SMTP_USER`, `SMTP_PASS` (contraseña de aplicación de Google), `EMAIL_FROM`, `CRON_SECRET` y `NEXT_PUBLIC_SITE_URL` para armar el link del botón "Ver en el portal". Si falta alguna `SMTP_*` o `EMAIL_FROM`, se registra una vez con `logError` y no se reclama nada: los emails esperan en la cola sin gastar intentos.

El código está en `src/lib/emails/` (`transporte.ts`, `plantilla.ts`, `cola.ts`), con `import "server-only"`. La plantilla escapa todo el contenido dinámico y manda HTML y texto plano.

---

## Consecuencias

- Un tipo de aviso nuevo no manda email hasta que se agrega a `email_tipo_con_envio`.
- Una acción nueva que genere un aviso con email tiene que llamar a `programarEnvioEmails()`; si no, el email sale con el cron del día siguiente.
- La tabla crece con cada email. Si hiciera falta, se pueden borrar los `enviado` viejos sin afectar nada.
- Rollback: el comando está comentado al final de `migration_048_emails.sql`.
