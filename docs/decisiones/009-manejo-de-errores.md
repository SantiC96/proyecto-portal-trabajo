# 009 — Manejo de errores en server actions

## Contexto

Antes de este cambio, cada server action devolvía estructuras ad-hoc: algunos retornaban `{ error: string }`, otros lanzaban excepciones, y los componentes mezclaban strings con flags booleanos (`sinCV`, `linkVencido`). Los errores internos se logueaban con `console.error` directamente en los actions, lo que podía filtrar mensajes de Postgres —incluyendo datos sensibles— a los logs de producción o incluso a la respuesta del cliente.

---

## Decisiones tomadas

### 1. Tipo `Resultado<T>` como contrato único de los server actions

**Decisión:** todos los server actions devuelven `Resultado<T>`:

```ts
type Resultado<T = void> =
  | { ok: true; data?: T; mensaje?: string }
  | { ok: false; codigo: CodigoError; mensaje: string; ref?: string; campo?: string }
```

Los helpers `ok()`, `err()`, `errCampo()`, `errConRef()` y `fromSupabaseError()` construyen los valores. `errCampo(campo, mensaje)` marca un error de validación (`DATOS_INVALIDOS`) de un campo del formulario: `campo` es el nombre de la propiedad que recibe la action (ver 7d). El tipo `ResultadoError` nombra la rama error; permite que funciones internas con payload custom en el ok (`{ ok: true; userId: string }`) devuelvan la misma rama error sin forzar a TypeScript a incluir la rama ok genérica en la unión.

**Razonamiento:**
- Un contrato uniforme elimina la necesidad de conocer la forma exacta de cada action.
- El discriminante `ok` es suficiente para que TypeScript estreche el tipo sin aserciones.
- `Resultado<never>` reservado como sinónimo de "sólo puede ser error", pero no se usa en anotaciones de funciones propias para evitar la ambigüedad de la rama ok (ver punto anterior).

---

### 2. Catálogo cerrado de `CodigoError`

**Decisión:** los códigos válidos son exactamente estos once:

| Código | Cuándo se usa |
|---|---|
| `NO_AUTENTICADO` | No hay sesión activa |
| `SIN_PERMISO` | Sesión existe pero el rol no tiene acceso |
| `DATOS_INVALIDOS` | Validación de formulario o inputs mal formados |
| `NO_ENCONTRADO` | El recurso no existe (o no es visible para el usuario) |
| `CONFLICTO` | Duplicado: CUIT ya registrado, oferta ya aprobada, etc. |
| `ESTADO_INVALIDO` | La acción no corresponde al estado actual del recurso |
| `REGLA_DE_NEGOCIO` | Violación de una regla de negocio definida en la DB (P0001) |
| `ARCHIVO_INVALIDO` | Tipo o tamaño de archivo rechazado |
| `SIN_CV` | El postulante intenta postularse sin CV cargado |
| `TOKEN_VENCIDO` | Link de recuperación de contraseña expirado o ya usado |
| `ERROR_INTERNO` | Cualquier error inesperado no contemplado |

**Razonamiento:**
- El catálogo cerrado evita que se inventen códigos por conveniencia. Si un escenario no encaja, la regla es discutirlo antes de agregar un código.
- Los códigos viajan en la respuesta JSON y son visibles en browser dev tools; eso es intencional (facilita el soporte) siempre que no aparezcan en pantalla.

---

### 3. Orden de verificación obligatorio en cada action

Todos los actions siguen este orden; saltear un paso se considera un defecto de seguridad:

1. **Sesión activa** → `NO_AUTENTICADO`
2. **Rol correcto** → `SIN_PERMISO` (no delegar esto solo a RLS)
3. **Validación de datos** → `DATOS_INVALIDOS`
4. **Estado del recurso** → `ESTADO_INVALIDO`
5. **Operación sobre la base de datos**

**Razonamiento:** RLS es una segunda línea de defensa, no la primera. Un action que confíe únicamente en RLS para rechazar a un usuario con rol incorrecto no documenta la intención y puede generar mensajes de error crípticos en producción.

---

### 4. Política de logs: `logError` y nunca `console.*`

**Decisión:** toda llamada a `console.*` dentro de `src/` está prohibida por regla ESLint (`no-console: error`), con excepción de `src/lib/logger.ts`. El logger es server-only (`import "server-only"`).

`logError(contexto, error, extra?)` genera un ref de 6 caracteres y:

- **En producción:** escribe JSON con `{ ref, contexto, pgCode?, ...extra }`. Nunca incluye el objeto de error completo, mensajes de Postgres (salvo P0001, ver punto 5), emails, DNI, tokens, rutas firmadas ni URLs de Storage.
- **En desarrollo:** escribe el error completo para facilitar el debugging.
- Devuelve el `ref` para incluirlo en la respuesta al cliente.

`next.config.ts` activa `compiler.removeConsole` en producción como capa adicional para el código del navegador.

**Razonamiento:** los logs de producción pueden ser leídos por personas ajenas al desarrollo (DevOps, plataforma de hosting). Filtrar datos sensibles en el origen es más seguro que depender de reglas de ofuscación en la plataforma.

---

### 5. Traducción de errores de Supabase/Postgres

**Decisión:** `fromSupabaseError(e)` mapea los códigos de la base de datos así:

| Código PG | `CodigoError` resultante |
|---|---|
| `23505` (unique violation) | `CONFLICTO` |
| `42501` o mensaje RLS | `SIN_PERMISO` |
| `P0001` (RAISE en función) | `REGLA_DE_NEGOCIO` con el mensaje original de la DB |
| Cualquier otro | `ERROR_INTERNO` con mensaje genérico |

La excepción `P0001` es deliberada: las funciones PostgreSQL del proyecto usan `RAISE EXCEPTION` con mensajes en español pensados para el usuario. Reutilizarlos evita duplicar la lógica en el backend de aplicación.

**Nunca** se reenvía al cliente el mensaje crudo de Postgres para otros códigos; solo viaja el mensaje genérico del catálogo.

---

### 6. Cuándo y cómo se muestra la `ref` al usuario

**Decisión:**

- Para cualquier error **distinto de `ERROR_INTERNO`**, se muestra solo `mensaje`. La `ref` no aparece.
- Para `ERROR_INTERNO` únicamente, se muestra debajo del mensaje en texto pequeño gris:

  > Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código: `<ref>`

- El código (`SIN_PERMISO`, `DATOS_INVALIDOS`, etc.) **nunca aparece en pantalla**; viaja en el payload para browser dev tools.

`toErrorAccion(result): ErrorAccion | null` encapsula esta lógica. Los componentes reciben `ErrorAccion = { mensaje: string; ref?: string }` y nunca acceden directamente al `codigo`.

**Razonamiento:**
- Mostrar la `ref` solo en errores internos le da al usuario algo accionable sin exponer información técnica en casos donde el problema es suyo (contraseña incorrecta, formulario inválido).
- Ocultar el código en pantalla evita que un usuario malintencionado aprenda si sus intentos de acceso no autorizado están acercándose al objetivo (`SIN_PERMISO` vs `NO_AUTENTICADO`).

---

---

### 7. Feedback al usuario: toasts de éxito y error

**Decisión:** se usa [sonner](https://sonner.emilkowalski.se/) como sistema de notificaciones. El `<Toaster>` vive en el root layout con `richColors`, `closeButton`, `duration={4000}` y `position="bottom-right"` (en móvil se mueve a la parte superior vía `mobileBreakpoint={640}`).

#### 7a. Helper `mostrarAviso(resultado, fallbackExito?)`

`src/lib/avisos.ts` expone `mostrarAviso(resultado)` — un helper client-side que recibe un `Resultado` y dispara el toast correspondiente:

- **Éxito:** `toast.success(resultado.mensaje ?? fallbackExito)` — fallback: `"Hecho"`.
- **Error `ERROR_INTERNO`:** `toast.error(mensaje, { description: "... indicá este código: <ref>" })`.
- **Cualquier otro error:** `toast.error(resultado.mensaje)` — sin descripción adicional.

Este helper es la única forma de mostrar toasts desde acciones. Los componentes no llaman a `toast.success()` o `toast.error()` directamente.

#### 7b. Mensajes de éxito en server actions

Todos los server actions devuelven un mensaje humano en la rama ok mediante `okMsg(mensaje)` (helper nuevo en `resultado.ts`). Ejemplos:

| Action | Mensaje |
|---|---|
| `postularme` | `"¡Te postulaste! Podés ver el estado en Mis postulaciones."` |
| `retirarPostulacion` | `"Postulación retirada."` |
| `crearOferta` | `"Oferta enviada a revisión."` |
| `cerrarOferta` | `"Oferta cerrada."` |
| `aprobarEmpresa` | `"Empresa aprobada."` |
| `derivarPostulacion` | `"Postulación derivada a la empresa."` |
| `actualizarPerfil` | `"Perfil actualizado."` |
| … | Ver acciones individuales para el texto exacto |

#### 7c. Toasts en redirecciones (param `?aviso=`)

Cuando una acción termina en una redirección a otra página (alta de oferta, reenvío de solicitud, creación de curso), el toast se muestra en la página destino usando el componente `AvisoUrl`:

- La acción redirige con `?aviso=<clave>` (ej. `?aviso=enviada`).
- `src/components/ui/aviso-url.tsx` lee el param al montar, muestra el toast correspondiente y limpia el param de la URL con `router.replace`.
- Páginas que incluyen `<AvisoUrl>`: `empresa/ofertas`, `empresa` (panel), `admin/cursos/[id]`.

**Razonamiento:** un toast disparado antes de un `redirect()` se pierde porque el browser navega antes de que el componente monte. El param `?aviso=` persiste la intención de mostrar feedback a través de la navegación.

#### 7d. Formularios

Los formularios mantienen errores de validación inline (junto al campo o debajo del form). El éxito se muestra via toast (`mostrarAviso`) y no como banner persistente en pantalla.

**Campos obligatorios** (`src/components/ui/obligatorio.tsx`, `src/lib/use-errores-campo.ts`):

- El label lleva `<Obligatorio />`: un asterisco rojo con "(obligatorio)" oculto para lectores de pantalla. No se agrega una leyenda "* Campo obligatorio" en el formulario.
- Los formularios llevan `noValidate` (los diálogos sin `<form>` validan igual) y no usan el globo del navegador: al enviar, `useErroresCampo().validar({...})` marca "Este campo es obligatorio." (`MENSAJE_OBLIGATORIO`) debajo de cada obligatorio vacío o solo con espacios, enfoca el primero y no envía.
- El mensaje va en `<ErrorCampo />`, y el control lleva `aria-invalid` y `aria-describedby` (`ariaErrorCampo()`); el error se borra cuando el usuario cambia el campo.
- El servidor sigue validando lo mismo. Si devuelve `campo`, `tomarDelServidor(resultado, campos)` lo muestra debajo de ese campo; si no, el error va donde iba (arriba del botón).

---

## Archivos clave

```
src/lib/resultado.ts           — tipos y helpers (incluye okMsg)
src/lib/logger.ts              — logger server-only
src/lib/avisos.ts              — helper mostrarAviso (client-side)
src/lib/use-errores-campo.ts   — errores por campo y validación de obligatorios (client-side)
src/components/ui/obligatorio.tsx — asterisco y mensaje de error de campo
src/components/ui/aviso-url.tsx — toasts en páginas destino de redirecciones
src/lib/auth-errors.ts         — traducción de errores de Supabase Auth
eslint.config.mjs              — regla no-console
next.config.ts                 — removeConsole en producción
```
