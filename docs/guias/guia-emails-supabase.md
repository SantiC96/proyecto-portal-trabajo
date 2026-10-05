# Guía de Emails con Supabase + Gmail SMTP

## Cómo funciona el sistema de emails de Supabase

Supabase envía emails automáticamente en ciertos eventos de autenticación:

- **Confirmación de registro** — al crear una cuenta nueva
- **Recuperación de contraseña** — cuando el usuario solicita un reset
- **Cambio de email** — al actualizar el email de la cuenta
- **Magic link** — login sin contraseña (si se habilita)

Por defecto, Supabase usa su propio servidor de email con un límite de **2 emails por hora**. Eso sirve para probar que el flujo funciona, pero no para desarrollo real. La solución es configurar tu propio servidor SMTP — en este caso, una cuenta de Gmail.

---

## Configurar Gmail para envío SMTP

Gmail no permite usar tu contraseña normal para SMTP. Requiere una **App Password** (contraseña de aplicación), que es una clave de 16 caracteres generada específicamente para esto.

### Paso 1 — Activar la verificación en dos pasos

Las App Passwords solo están disponibles si tenés 2FA activo en tu cuenta de Google.

1. Ir a [myaccount.google.com](https://myaccount.google.com)
2. **Seguridad** → **Verificación en dos pasos**
3. Seguir los pasos para activarla si no está activa

### Paso 2 — Generar una App Password

1. Ir a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. En **Seleccionar app** elegir **Correo**
3. En **Seleccionar dispositivo** elegir **Otro (nombre personalizado)** → escribir `Supabase`
4. Hacer click en **Generar**
5. Copiar la clave de 16 caracteres que aparece (ej: `abcd efgh ijkl mnop`)

> Guardala en un lugar seguro — Google solo la muestra una vez. Si la perdés, tenés que generar una nueva.

---

## Configurar SMTP en Supabase

1. Ir al dashboard de Supabase → tu proyecto
2. **Authentication** → **Settings** → sección **SMTP Settings**
3. Activar **Enable Custom SMTP**
4. Completar los campos:

| Campo | Valor |
|---|---|
| **Host** | `smtp.gmail.com` |
| **Port** | `587` |
| **Minimum TLS version** | `TLSv1.2` |
| **Username** | tu dirección de Gmail (ej: `tucuenta@gmail.com`) |
| **Password** | la App Password generada en el paso anterior (sin espacios) |
| **Sender email** | tu dirección de Gmail |
| **Sender name** | el nombre que van a ver los destinatarios (ej: `Portal Municipal de Empleo`) |

5. Hacer click en **Save**

### Verificar que funciona

En la misma sección hay un botón **Send test email**. Ingresar una dirección de destino y verificar que llega. Si no llega, revisar la sección de errores al final de esta guía.

---

## Configurar las URLs de redirección

Cuando Supabase envía un email con un link (confirmación, reset de contraseña), ese link lleva al usuario de vuelta a tu app. Hay que decirle a Supabase cuál es la URL base.

1. **Authentication** → **URL Configuration**
2. Completar **Site URL**:
   - En desarrollo: `http://localhost:3000`
   - En producción: `https://tu-dominio.com`
3. En **Redirect URLs** agregar las URLs permitidas:
   ```
   http://localhost:3000/**
   https://tu-dominio.com/**
   ```

> En producción, reemplazá `localhost:3000` con la URL real del deploy.

---

## Flujo de confirmación de registro

Cuando un usuario se registra con `signUp()`, Supabase envía un email con un link de confirmación. El usuario hace click y aterriza en tu app con un token en la URL.

### Ruta de callback

Hay que crear una ruta que procese ese token:

```ts
// src/app/auth/callback/route.ts
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/`)
}
```

### Registrar la URL de callback en Supabase

En **Authentication** → **URL Configuration** → **Redirect URLs** agregar:

```
http://localhost:3000/auth/callback
```

### Configurar la redirección en el signUp

```ts
// src/app/auth/actions.ts
export async function registrar(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    redirect('/auth/registro?error=' + encodeURIComponent(error.message))
  }

  redirect('/auth/verificar-email')
}
```

Agregar la variable al `.env.local`:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

En producción cambiarla por la URL real del deploy.

### Página de "verificá tu email"

```tsx
// src/app/auth/verificar-email/page.tsx
export default function VerificarEmailPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-md px-10 py-8 flex flex-col items-center gap-3 max-w-sm text-center">
        <span className="text-4xl">📧</span>
        <h1 className="text-xl font-semibold text-gray-800">Revisá tu email</h1>
        <p className="text-sm text-gray-500">
          Te enviamos un link de confirmación. Hacé click en el link para activar tu cuenta.
        </p>
      </div>
    </main>
  )
}
```

---

## Flujo de recuperación de contraseña

### Plantilla de email

La plantilla "Reset Password" en Supabase debe enviar el link así:

```
{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery
```

Esto pasa `token_hash` como parámetro de URL en lugar del flujo PKCE con `?code=`. El token no se consume hasta que el usuario hace submit del formulario, por lo que los pre-fetchers de correo no lo gastan.

### Paso 1 — El usuario pide el reset

```ts
// src/app/auth/actions.ts
export async function solicitarResetContrasena(formData: FormData) {
  const email = formData.get('email') as string
  const supabase = await createSupabaseServerClient()

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/nueva-contrasena`,
  })

  // Siempre redirigir, sin revelar si el email existe
  redirect('/auth/reset-enviado')
}
```

### Paso 2 — El usuario abre el link del email

El link llega a `/auth/nueva-contrasena?token_hash=…&type=recovery`.

El Server Component (`src/app/auth/nueva-contrasena/page.tsx`) solo verifica si hay `token_hash` o la cookie de reintento `ftl_recovery` — **no llama a `verifyOtp`**. Si ninguno está presente, redirige a `/auth/recuperar-contrasena?error=link-vencido`. Si hay alguno, renderiza el formulario.

### Paso 3 — El usuario elige su nueva contraseña

El formulario (`src/app/auth/nueva-contrasena/form.tsx`) presenta dos campos de contraseña con validación en vivo y usa `useActionState` con la Server Action `restablecerContrasena`.

La Server Action (`src/app/auth/actions.ts`):

1. Valida que la contraseña tenga ≥ 6 caracteres y que las dos coincidan.
2. Obtiene una sesión efímera (usando `createSupabaseEphemeralClient` de `src/lib/supabase-ephemeral.ts`, que tiene `persistSession: false`):
   - Si existe la cookie `ftl_recovery` → intenta `refreshSession({ refresh_token })`.
   - Si no hay sesión todavía y llegó `token_hash` → llama a `verifyOtp({ token_hash, type: "recovery" })`.
   - Si no puede obtener sesión → devuelve error `linkVencido`.
3. Llama a `client.auth.updateUser({ password })`.
   - Si Supabase rechaza (misma contraseña, débil) → guarda el `refresh_token` actual en `ftl_recovery` (con `maxAge` de 15 minutos) para que el usuario pueda reintentar sin pedir un nuevo link.
   - Si sale bien → `signOut({ scope: "local" })`, borra `ftl_recovery` y `ftl_last_activity`, y redirige a `/auth/login?motivo=contrasena-actualizada`.
4. En ningún paso se escriben las cookies de sesión del sitio.

#### Cookie `ftl_recovery`

| Propiedad | Valor |
|---|---|
| Nombre | `ftl_recovery` |
| `httpOnly` | sí |
| `secure` | sí (en producción) |
| `sameSite` | `strict` |
| `path` | `/auth/nueva-contrasena` |
| `maxAge` | 15 minutos |
| Contenido | `refresh_token` de la sesión efímera de recuperación |

Esta cookie permite que el usuario corrija errores (misma contraseña, contraseña débil) sin necesitar un nuevo link. Se borra en cuanto la contraseña se actualiza con éxito o el refresh falla.

---

## Personalizar las plantillas de email

En Supabase podés editar el HTML que se envía en cada email.

**Authentication** → **Email Templates**

Las plantillas disponibles son:

| Plantilla | Cuándo se usa |
|---|---|
| **Confirm signup** | Confirmación de cuenta nueva |
| **Reset password** | Recuperación de contraseña |
| **Magic Link** | Login sin contraseña |
| **Change Email Address** | Cambio de email |

### Variables disponibles en las plantillas

```
{{ .ConfirmationURL }}   → el link completo con el token
{{ .Email }}            → el email del usuario
{{ .SiteURL }}          → la URL base del proyecto
{{ .Token }}            → solo el token (para construir URLs custom)
```

### Ejemplo de plantilla personalizada para reset de contraseña

```html
<h2>Recuperación de contraseña — Portal Municipal de Empleo</h2>

<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>

<p>
  <a href="{{ .ConfirmationURL }}" style="
    background-color: #0d9488;
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    text-decoration: none;
    font-size: 14px;
  ">
    Crear nueva contraseña
  </a>
</p>

<p style="color: #6b7280; font-size: 12px;">
  Si no solicitaste este cambio, podés ignorar este email.
  El link expira en 24 horas.
</p>
```

---

## Resumen del flujo completo

```
CONFIRMACIÓN DE REGISTRO
  Usuario completa el form → signUp() con emailRedirectTo
  → Supabase envía email vía Gmail SMTP
  → Usuario hace click en el link
  → Aterriza en /auth/callback?code=...
  → exchangeCodeForSession(code) activa la cuenta
  → Redirige a /

RECUPERACIÓN DE CONTRASEÑA
  Usuario ingresa su email → resetPasswordForEmail() con redirectTo
  → Supabase envía email vía Gmail SMTP
  → Usuario hace click en el link
  → Aterriza en /auth/nueva-contrasena?token_hash=...&type=recovery
  → Server Component verifica token_hash (sin consumirlo)
  → Renderiza formulario de doble contraseña
  → Usuario completa el form → Server Action restablecerContrasena()
  → verifyOtp() consume el token en el servidor (cliente efímero, sin sesión en el sitio)
  → updateUser({ password }) actualiza la contraseña
  → Redirige a /auth/login?motivo=contrasena-actualizada
```

---

## Variables de entorno actualizadas

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<tu-anon-key>
SUPABASE_SECRET_KEY=<tu-service-role-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Errores comunes

### El email no llega

1. Verificar que la App Password esté ingresada **sin espacios** en Supabase.
2. Verificar que la cuenta de Gmail tenga la verificación en dos pasos activa.
3. Revisar la carpeta de spam.
4. En **Authentication** → **Settings** verificar que el SMTP esté habilitado (el toggle puede desactivarse solo si hay un error de configuración).
5. Usar el botón **Send test email** para confirmar que la configuración SMTP funciona independientemente del flujo de auth.

### `Error: Invalid login: 535 Authentication failed`

La App Password es incorrecta o venció. Generá una nueva en [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).

### El link del email lleva a una página en blanco o da 404

La ruta `/auth/callback` no existe o tiene un error. Verificar que el archivo `src/app/auth/callback/route.ts` esté creado correctamente.

### `exchangeCodeForSession` falla con `invalid_grant`

El `code` del link ya fue usado o expiró (duran 24 horas). El usuario debe solicitar un nuevo link.

### El usuario queda logueado pero sin fila en la tabla `usuarios`

El insert en `usuarios` que se hace después del `signUp()` falló. Verificar que se esté usando `supabaseAdmin` para ese insert — el cliente normal no puede insertar porque el usuario todavía no confirmó su email y RLS lo bloquea. Ver la guía de auth para el detalle del flujo.
