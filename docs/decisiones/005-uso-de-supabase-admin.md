# 005 — Uso de supabaseAdmin (service role)

## Regla

Por defecto, usar `createSupabaseServerClient()` en todos los Server Components, Server Actions y Route Handlers.
`supabaseAdmin` (service role, omite RLS) solo está justificado en los cinco casos específicos que se listan a continuación.

## Justificación

El service role bypasea completamente las Row Level Security policies definidas en la base de datos.
Usar `supabaseAdmin` donde el server client alcanza hace que las políticas de seguridad sean inefectivas, porque cualquier lógica incorrecta en el código de aplicación puede leer o escribir filas que RLS hubiera bloqueado.

## Usos justificados

| Archivo | Función | Motivo |
|---|---|---|
| `src/app/auth/actions.ts` | `registrarPostulante`, `registrarEmpresa` — insert inicial de perfil | No existe sesión en este momento; el usuario en Auth recién fue creado y sus cookies aún no están presentes |
| `src/app/auth/actions.ts` | `deleteUser` en bloque de cleanup | Rollback de un usuario de Auth cuando la inserción del perfil falló; no hay sesión disponible |
| `src/app/(dashboard)/perfil/actions.ts` | `subirAvatar`, `subirCV` | Llaman a la RPC `activar_archivo_usuario`, que por `migration_010` solo acepta `service_role`; ningún cliente autenticado puede invocarla |
| `src/app/(dashboard)/perfil/actions.ts` | `ajustarAvatar`, `quitarAvatar`, `eliminarCV` | La tabla `archivos_usuario` no tiene política UPDATE para `authenticated`; agregar esa política requiere una nueva migration fuera del alcance de este trabajo |
| `src/app/(dashboard)/perfil/actions.ts` | `cambiarContrasena` — `signInWithPassword` con `persistSession: false` | Verifica la contraseña actual sin sobrescribir las cookies de sesión activas del usuario |

## Lo que NO usa supabaseAdmin

Desde `migration_018`, las siguientes operaciones que antes lo usaban innecesariamente
fueron migradas al server client:

- Lectura de postulaciones, postulantes, empresas y archivos (admin y postulante propio)
- Actualización de perfil (nombre, apellido, teléfono, DNI, domicilio)
- Actualización de rubros del postulante
- Aprobación y rechazo de empresas
- Gestión del estado de postulaciones (municipalidad)
- URLs firmadas para avatares y CVs leídos por la municipalidad (nueva política de storage)
- Obtención de emails de usuarios — reemplazado por RPC `emails_de_usuarios`
