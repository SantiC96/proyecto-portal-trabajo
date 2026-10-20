# 023 — Cuentas de la Oficina de Empleo

**Fecha:** 2026-10-19
**Estado:** Vigente
**Migración:** `migration_050_gestion_admins.sql`

---

## Contexto

Las cuentas de la oficina (rol `municipalidad`) se creaban a mano en el dashboard de Supabase y con un `UPDATE` en el SQL Editor ([guía](../guias/guia-usuarios-oficina.md)). No había forma de dar de baja a alguien que deja la oficina sin borrar su usuario, y borrarlo rompía o vaciaba el historial que lleva su id (aprobaciones, cursos asignados, derivaciones).

---

## Decisiones tomadas

### 1. Todas las cuentas de la oficina son iguales

No hay super admin: cualquier cuenta activa de la oficina puede invitar, desactivar y reactivar a las demás, y tiene los mismos permisos sobre el portal.

### 2. Alta por invitación

- `/admin/cuentas` → "Invitar cuenta" (nombre, apellido, teléfono opcional y email). La acción `invitarCuenta` (`src/app/admin/cuentas/actions.ts`) usa `supabaseAdmin.auth.admin.inviteUserByEmail` en el servidor.
- Antes de invitar se consulta `email_registrado()` (solo service role): Supabase reutiliza al invitar un usuario que no confirmó su email, y un postulante o una empresa a medio registrar pasaría a ser cuenta de la oficina. Si el email existe, el error va debajo del campo.
- El trigger `on_auth_user_created` crea la fila de `usuarios` como siempre (nunca toma el rol de los metadatos para la oficina) y la acción le asigna `rol = 'municipalidad'`, igual que el alta manual. Si eso falla, se borra el usuario de Auth para poder invitarlo de nuevo.
- El email lleva a `/auth/aceptar-invitacion?token_hash=…&type=invite` (plantilla "Invite user" de Supabase). Igual que la recuperación de contraseña, el token se consume recién al enviar el formulario, con un cliente efímero; si falla después de consumirlo, la cookie `ftl_invitacion` (15 minutos) permite reintentar. `/auth/callback` no sirve acá: la invitación la genera el servidor y no tiene el verificador PKCE.
- Al guardar la contraseña, `aceptarInvitacion` inicia sesión con el cliente de cookies, crea `ftl_last_activity` (decisión [022](022-sesion-y-cierre-del-navegador.md)) y redirige al panel (`/admin`, ruta fija).

### 3. Desactivar en lugar de borrar

- `usuarios.activo` (por defecto `true`). Solo una cuenta de la oficina puede estar desactivada (`CHECK`). Desactivar no borra ni cambia nada más: el historial queda intacto.
- `rol_actual()` devuelve `NULL` para una cuenta desactivada: pierde todas las políticas RLS y funciones de la oficina sin tocar ninguna. Postulantes y empresas siempre están activos.
- Al desactivar, la aplicación además banea el usuario en Supabase Auth (`updateUserById`, `ban_duration`): no puede iniciar sesión ni renovar el token. Al reactivar se saca el ban.
- **Sesión abierta:** `requerirUsuarioPagina()` (lo usan todos los layouts y páginas protegidas) manda una cuenta desactivada a `/auth/cuenta-desactivada`, un Route Handler que cierra la sesión y lleva al login con "Tu cuenta está desactivada. Comunicate con la Oficina de Empleo.". Las server actions la rechazan con el mismo mensaje.
- **Login:** el ban da `user_banned`, que se traduce a ese mensaje. Si el ban no se hubiera aplicado, `login()` revisa `usuarios.activo` y cierra la sesión.
- Una cuenta desactivada no recibe avisos de la oficina (ni sus emails): un trigger en `notificaciones` los descarta.

### 4. Siempre queda al menos una cuenta activa, garantizado en la base

El trigger `usuarios_proteger_oficina` (`BEFORE UPDATE OF activo, rol OR DELETE` en `usuarios`) impide que la última cuenta activa de la oficina se desactive, cambie de rol o se borre. Borrar el usuario en `auth.users` borra la fila de `usuarios` en cascada, así que el trigger también lo frena. Vale desde la aplicación, el dashboard y el SQL Editor. Un advisory lock ordena dos desactivaciones simultáneas para que no quede ninguna.

### 5. Nadie se desactiva a sí mismo

Lo valida la base con `auth.uid()`: `desactivar_cuenta_oficina()` y el trigger rechazan desactivar la propia cuenta. La pantalla además no muestra el botón en la fila propia ("Vos"). En el SQL Editor `auth.uid()` es `NULL`, así que ahí solo aplica la regla del mínimo.

---

## Consecuencias

- La primera cuenta de la oficina se sigue creando a mano ([guía](../guias/guia-usuarios-oficina.md)); las siguientes, por invitación.
- Configuración en Supabase: plantilla "Invite user" con el link `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite` y `<sitio>/auth/aceptar-invitacion` en *Redirect URLs*.
- Una invitación pendiente cuenta como cuenta activa para el mínimo. No se puede desactivar a la propia cuenta, así que quien desactiva a otra siempre queda activo.
- Los emails que ya estaban en la cola (`emails_pendientes`) para una cuenta que se desactiva se envían igual.
