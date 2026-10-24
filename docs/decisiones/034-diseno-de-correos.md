# 034 — Diseño de los correos

**Fecha:** 2026-10-24
**Estado:** Vigente
**Migración:** ninguna

---

## Contexto

El portal manda dos clases de correos:

- **Los avisos** (decisión 020): una postulación derivada, una entrevista, una oferta aprobada, una empresa para revisar… Los arma `armarEmail` (`src/lib/emails/plantilla.ts`) a partir de un título, un mensaje y un link, y los manda la cola (`cola.ts`, `transporte.ts`).
- **Los de la cuenta:** confirmar el registro, recuperar la contraseña e invitar a una cuenta de la Oficina. Los manda Supabase con las plantillas de su panel, que no estaban en el repositorio.

Los avisos tenían un diseño mínimo con colores que ya no coincidían con los tokens de `globals.css` (decisión 030), y las plantillas de Supabase eran las de fábrica o el ejemplo de la guía, en otro estilo. Un correo de la Municipalidad que no se parece al portal genera desconfianza, sobre todo los que piden hacer clic para entrar.

Además, en esta misma tarea las pantallas de recuperar la contraseña pasaron al formato del login (`PanelMarca`) y el panel verde del login se ve también en el celular; esos cambios están en el design system (sección 27) y en la nota agregada a la decisión 031.

---

## Decisiones tomadas

### 1. Una sola plantilla para todos los avisos

Todos los avisos tienen la misma forma: título, mensaje, un botón al portal. `armarEmail` no cambia su firma ni lo que devuelve; cambia solo el HTML, que ahora sale de `htmlCorreo` en `src/lib/emails/diseno.ts`.

Motivos: un tipo de aviso nuevo se suma desde la base (migración) sin tocar el diseño; no hay plantillas por tipo que se desactualicen; y la persona reconoce siempre el mismo correo. Lo que cambia entre avisos es el texto, que ya decide cada trigger.

### 2. Tablas y estilos en línea

Los clientes de correo (Gmail, Outlook, los de los celulares) no son navegadores: muchos ignoran o borran el `<style>`, no leen variables CSS, no soportan flexbox ni grid y Outlook de escritorio dibuja con el motor de Word. Por eso:

- la estructura son tablas con `role="presentation"` (los lectores de pantalla no las anuncian como tablas de datos);
- cada estilo va en línea; el `<style>` solo tiene una media query para pantallas angostas (padding 24 en lugar de 32), que si se pierde deja el correo igual de legible;
- los colores son los valores de los tokens copiados en `COLOR`;
- sin imágenes de fondo ni SVG; el logo es un PNG. En los avisos va embebido en el correo (punto 6); en las plantillas de Supabase, con URL absoluta (`{{ .SiteURL }}`), porque un correo no tiene un "sitio" desde donde resolver rutas relativas;
- `color-scheme` light, porque algunos clientes invierten los colores en modo oscuro y el verde sobre verde dejaría de leerse.

Public Sans se pide a Google Fonts y la mayoría de los clientes la ignora: cae a Arial o Helvetica sin romper nada. Georgia, como en el login, solo en el título.

### 3. El link visible además del botón

Debajo del botón va "Si el botón no funciona, copiá este link:" con la URL escrita. Algunos clientes bloquean los links o muestran el correo como texto, hay lectores que no reconocen la tabla del botón, y en una computadora compartida o con un filtro de seguridad a veces el único camino es copiar la dirección. También deja ver a dónde lleva el correo antes de hacer clic, que es lo que se recomienda para no caer en correos falsos. La versión de texto plano lleva la misma URL.

### 4. Las plantillas de Supabase salen del mismo código

Los HTML de `docs/emails/supabase/` (confirmar registro, recuperar contraseña e invitación) no se escriben a mano: los genera `npm run emails:supabase` (`scripts/vista-previa-emails.mjs`) con el mismo `htmlCorreo`. El script define solo los textos, el texto del botón, la nota ("Si no pediste esto, podés ignorar este correo.") y el link de cada una, que es exactamente el que esperan las rutas:

| Plantilla | Link | Lo recibe |
|---|---|---|
| Confirm signup | `{{ .ConfirmationURL }}` | `/auth/callback?code=…` (PKCE) |
| Reset Password | `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery` | `/auth/nueva-contrasena` |
| Invite user | `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite` | `/auth/aceptar-invitacion` |

Solo se usan variables documentadas en la guía de emails. Magic Link y Change Email Address no tienen plantilla: el portal no los usa.

Supabase no lee el repositorio: después de regenerar hay que copiar los archivos en su panel, comparando antes el link de cada uno con el configurado (guía de emails, "Aplicar las plantillas"). Para que el diseño no se separe, cualquier cambio en `diseno.ts` se termina con `npm run emails:supabase` y ese paso.

### 5. Vista previa sin mandar correos

`npm run emails:vista-previa` escribe en `emails-vista-previa/` (ignorada por git) el HTML y el texto de un ejemplo de cada tipo de aviso que manda el portal, el caso sin `NEXT_PUBLIC_SITE_URL` (sin botón) y las plantillas de Supabase con datos de prueba. `index.html` muestra cada uno a 600 y 375 px. Usa `armarEmail` tal cual (el script resuelve el alias `@/` y `server-only` para cargarlo con Node), así lo que se ve es lo que se manda. El navegador no resuelve el `cid:` del logo (punto 6): en la vista previa se reemplaza por un data URI con la misma imagen.

### 6. El logo va embebido en los avisos (CID)

Al principio el encabezado de los avisos cargaba el logo desde `NEXT_PUBLIC_SITE_URL` + `/images/logo-funes-blanco.png`. Eso fallaba en dos casos:

- en local la URL es `localhost`: Gmail descarga las imágenes desde sus servidores, no llega a `localhost` y el logo no se veía (por ejemplo, en los correos de empresa aprobada y rechazada);
- aunque la URL sea pública, muchos clientes bloquean las imágenes externas hasta que la persona las acepta.

Ahora el logo viaja dentro del correo, como imagen embebida: el HTML usa `<img src="cid:logo-funes">` (mismo tamaño, alt y estilos) y `transporte.ts` adjunta el PNG a cada envío con `cid` `logo-funes`, `contentDisposition` `inline` y `contentType` `image/png`. Lo hace un plugin del transporte de nodemailer (`usarLogoEmbebido`), así cualquier correo que salga por ese transporte con el `cid` en el HTML lleva el adjunto, sin depender de quién llame a `sendMail`. Los clientes no lo muestran como archivo adjunto. Pesa 5,8 KB.

El PNG está en el código, en base64 (`src/lib/emails/logo-correo.ts`), y no se lee de `public/` con `fs`: en Vercel `public/` lo sirve la CDN y no siempre entra en el paquete de las funciones. La alternativa (`outputFileTracingIncludes` en `next.config`) depende de que la ruta y el patrón sigan coincidiendo con las funciones que mandan correos (la cola corre en `after()` de muchas Server Actions y en el cron); un `import` entra siempre en el paquete y no lee el disco. El archivo explica cómo regenerarlo si cambia el logo. Si el valor estuviera vacío, el encabezado vuelve al texto "Municipalidad de Funes".

Los correos que ya estaban en `emails_pendientes` no necesitan nada: la tabla guarda asunto, mensaje y link, no el HTML, y `cola.ts` llama a `armarEmail` en el momento de enviar. Salen con el logo embebido.

Las plantillas de Supabase no pasan por nodemailer y no pueden adjuntar imágenes: siguen cargando el logo de `{{ .SiteURL }}/images/logo-funes-blanco.png`. Para que se vea, la *Site URL* del panel de Supabase tiene que ser la dirección publicada en Vercel (no `localhost`).

En la misma tarea se comprimieron `logo-funes-blanco.png` (36 KB) y `logo-funes-verde.png` (6 KB) a 5,8 KB cada uno: PNG con paleta de 256 colores, sin cambiar tamaño, color ni transparencia (son un solo color con 256 niveles de opacidad, que una paleta representa sin pérdida).

---

## Consecuencias

- Si cambia un token de color en `globals.css`, hay que cambiarlo también en `COLOR` (`diseno.ts`).
- Si cambian las rutas de `/auth` que reciben los links, hay que cambiar el link en el script, regenerar y volver a copiar la plantilla en Supabase.
- Las plantillas dicen que el link vence en 1 hora: es el valor de *Email OTP Expiration* en Supabase (3600 segundos), un solo valor para los tres correos (confirmar el registro, recuperar la contraseña y la invitación). Si se cambia en Supabase, hay que corregir el texto en `scripts/vista-previa-emails.mjs` y volver a generar las plantillas.
- Los avisos siguen sin imágenes salvo el logo, que va embebido. En las plantillas de Supabase, si el cliente bloquea las imágenes, el encabezado muestra el texto alternativo en blanco sobre verde.
- Si cambia `public/images/logo-funes-blanco.png`, hay que regenerar `src/lib/emails/logo-correo.ts` (el comando está en el archivo).
