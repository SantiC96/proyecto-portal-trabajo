# 022 — Sesión: cierre del navegador e inactividad

**Fecha:** 2026-10-19
**Estado:** Vigente
**Migración:** ninguna

---

## Contexto

La sesión tiene que terminar al cerrar el navegador y después de 30 minutos sin actividad. El servidor ya escribía las cookies de auth sin vencimiento, pero la sesión seguía iniciada al volver a abrir el navegador por dos motivos:

1. **El cliente del navegador** (`src/lib/supabase-browser.ts`) usaba el manejo de cookies por defecto de `@supabase/ssr`. Cuando renovaba el token (lo usan `sesion-provider.tsx` y `navbar.tsx`), reescribía las cookies de auth con `maxAge` de 400 días.
2. **El proxy**, si había usuario pero no existía `ftl_last_activity` (navegador recién abierto), creaba la cookie con la hora actual y el usuario seguía adentro.

---

## Decisiones tomadas

### 1. Cookies de auth sin vencimiento, en el servidor y en el navegador

- `sessionCookieOptions()` (`src/lib/session-config.ts`) saca `maxAge` y `expires` de las opciones que manda `@supabase/ssr`, salvo `maxAge: 0`, que es el borrado al cerrar sesión.
- Se aplica en los tres lugares que escriben cookies de auth: el proxy, `createSupabaseServerClient()` y, ahora, `createSupabaseBrowserClient()`.
- El cliente del navegador recibe `getAll`/`setAll` propios sobre `document.cookie`. `session-config.ts` no importa nada del servidor, así que se usa tal cual en el cliente.

### 2. `ftl_last_activity` marca que la sesión es de este navegador

- Es una cookie de sesión (`httpOnly`, `sameSite: lax`, sin vencimiento; `lastActivityCookieOptions()`). Desaparece al cerrar el navegador.
- **Hay usuario y no existe la cookie:** la sesión viene de un navegador anterior. El proxy hace `signOut({ scope: "local" })`, borra las cookies igual que en la inactividad y:
  - en rutas protegidas, redirige a `/auth/login?motivo=sesion-anterior&redirect=<ruta>`. El login muestra "Por seguridad, volvé a iniciar sesión.";
  - en rutas públicas (`/`, `/ofertas`, `/auth/*`), no redirige: la página se muestra como visitante, igual que a cualquiera sin sesión;
  - en `/api/sesion` responde `{ activa: false }`, como en la inactividad.
- Se cierra solo la sesión de este navegador (`scope: "local"`): las de otros dispositivos del usuario pueden ser válidas.

### 3. Los flujos que inician sesión crean la cookie

Si no la crearan, el primer request con sesión se tomaría como una sesión anterior y habría que iniciar sesión dos veces.

| Flujo | Dónde se crea |
|---|---|
| Login | `login()` en `src/app/auth/actions.ts`, después de `signInWithPassword` y antes del `redirect`. Las Server Actions no pasan por el control del proxy. |
| Confirmación de email | `src/app/auth/callback/route.ts`, después de `exchangeCodeForSession` y antes del redirect a `/`. |
| Cualquier request con sesión válida | El proxy la actualiza con la hora actual. |

La recuperación de contraseña (`/auth/nueva-contrasena`) no inicia sesión: usa un cliente efímero que no escribe cookies, y al terminar lleva al login. No necesita la cookie. Si alguien llega con una sesión abierta, el proxy no la controla en esa ruta (igual que antes) y la siguiente navegación aplica la regla normal.

### 4. Inactividad (sin cambios)

- Pasados **30 minutos** (`INACTIVITY_TIMEOUT_MS`) desde la última actividad, el proxy cierra la sesión y redirige al login con `?motivo=inactividad` (en `/api/sesion`, `{ activa: false }`).
- Un valor corrupto en la cookie se reemplaza por la hora actual en lugar de cerrar la sesión.

### 5. Rutas que el control no toca

- **Server Actions** (encabezado `next-action`): no se controlan, como hoy. Un redirect en medio de una acción la rompe. La acción siguiente que navegue a una página sí pasa por el control.
- **`/auth/callback` y `/auth/nueva-contrasena`:** están en medio del canje de credenciales.
- **`/api/emails/procesar`** (cron): no tiene sesión de usuario, así que el control no aplica. Lo protege `CRON_SECRET`.

### 6. Logout

`logout()` hace `signOut()`, que borra las cookies de auth con `maxAge: 0` (en el navegador también: `sessionCookieOptions` conserva ese valor), y borra `ftl_last_activity`.

---

## Limitaciones

- **"Continuar donde lo dejaste" de Chrome** (y la restauración de sesión de otros navegadores) vuelve a cargar las cookies de sesión al reabrir. Para el portal es como si el navegador no se hubiera cerrado. Lo cubre el control de inactividad: si pasaron más de 30 minutos desde la última actividad, la sesión se cierra en el primer request.
- **Navegadores que siguen corriendo en segundo plano** (Chrome con "Seguir ejecutando aplicaciones en segundo plano", o los del celular, que casi nunca se cierran del todo) no borran las cookies de sesión al cerrar la ventana. También lo cubre la inactividad.
- El control corre en el servidor en cada request. Una pestaña abierta sin navegar no se entera de que la sesión venció hasta el próximo request o la próxima consulta a `/api/sesion`.

---

## Consecuencias

- Todo flujo nuevo que inicie sesión (otro proveedor, magic link, etc.) tiene que crear `ftl_last_activity` con `lastActivityCookieOptions()` antes de redirigir.
- Las cookies que ya existían con 400 días de vencimiento dejan de servir: al abrir un navegador nuevo falta `ftl_last_activity` y el proxy cierra esa sesión.
