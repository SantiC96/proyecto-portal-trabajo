# Plantillas de correo de Supabase

Los correos de la cuenta (confirmar el registro, recuperar la contraseña e
invitar a una cuenta de la Oficina) los manda Supabase con las plantillas de
su panel (**Authentication → Email Templates**), no el portal. Estos archivos
tienen el mismo diseño que los avisos del portal (`armarEmail`, decisión 034).

| Plantilla de Supabase | Archivo | Asunto sugerido | Link que usa |
|---|---|---|---|
| Confirm signup | `confirmar-registro.html` | Confirmá tu cuenta del Portal de Empleo Funes | `{{ .ConfirmationURL }}` |
| Reset Password | `recuperar-contrasena.html` | Recuperá tu contraseña del Portal de Empleo Funes | `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery` |
| Invite user | `invitacion.html` | Te invitaron a la Oficina de Empleo del Portal de Empleo Funes | `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite` |

De dónde sale cada link:

- **Confirm signup:** `signUp` (`registrarPostulante` y `registrarEmpresa` en
  `src/app/auth/actions.ts`) pasa `emailRedirectTo: <sitio>/auth/callback`, y
  `src/app/auth/callback/route.ts` espera `?code=` (flujo PKCE, el de
  `@supabase/ssr`). `{{ .ConfirmationURL }}` pasa por Supabase, confirma el
  email y redirige a `/auth/callback?code=…`.
- **Reset Password:** `resetPasswordForEmail` (`solicitarResetContrasena`)
  pasa `redirectTo: <sitio>/auth/nueva-contrasena`; la página espera
  `token_hash` y `type=recovery` (guía de emails, decisión de no consumir el
  token al abrir el link).
- **Invite user:** `inviteUserByEmail` (`src/app/admin/cuentas/actions.ts`)
  pasa `redirectTo: <sitio>/auth/aceptar-invitacion`; la página espera
  `token_hash` y `type=invite` (decisión 023).

No se usan **Magic Link** ni **Change Email Address**: el portal no llama a
`signInWithOtp` ni cambia el email con `updateUser`. Esas plantillas quedan
como están.

## Notas

- El logo se carga de `{{ .SiteURL }}/images/logo-funes-blanco.png`: la *Site
  URL* del panel tiene que ser la del sitio publicado (sin `/` al final).
- "El link vence en 1 hora" sale de **Authentication → Providers → Email →
  Email OTP Expiration**, que está en 3600 segundos. Es un solo valor para los
  tres correos (confirmar el registro, recuperar la contraseña y la
  invitación). Si se cambia en Supabase, corregir el texto en
  `scripts/vista-previa-emails.mjs` y volver a generar.
- No editar los HTML a mano. El diseño está en `src/lib/emails/diseno.ts` y
  los textos en `scripts/vista-previa-emails.mjs`; se regeneran con
  `npm run emails:supabase`. Para verlos con datos de prueba:
  `npm run emails:vista-previa` y abrir `emails-vista-previa/index.html`.
- Cómo copiarlos al panel: sección "Aplicar las plantillas" de
  [la guía de emails](../../guias/guia-emails-supabase.md#aplicar-las-plantillas).
