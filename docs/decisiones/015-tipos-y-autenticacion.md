# 015 — Tipos generados de la base y autenticación centralizada

**Fecha:** 2026-10-15
**Estado:** Vigente
**Migración:** ninguna (no cambia la base)

---

## Contexto

Los clientes de Supabase no conocían el esquema: cada consulta devolvía filas sin tipo y cada página declaraba a mano el tipo de lo que esperaba recibir (`type OfertaRow = { ... }`), forzado con `as unknown as`, `as Tipo[]` o `.overrideTypes<...>()`. Si una migración cambiaba una columna, TypeScript no avisaba: el error aparecía en producción.

Además, cada server action, página y layout repetía el mismo control (`auth.getUser()`, leer `usuarios.rol`, comparar), con pequeñas diferencias entre copias. Había unas 46 llamadas a `auth.getUser()`.

---

## Decisiones tomadas

### 1. Tipos generados desde la base real

`src/types/database.ts` lo genera el CLI de Supabase y **no se edita a mano**. Los cuatro clientes (`supabase-server.ts`, `supabase-browser.ts`, `supabase-admin.ts`, `supabase-ephemeral.ts`) y el de `proxy.ts` se crean con el genérico `<Database>`, así que `from()`, `select()`, `insert()`, `update()` y `rpc()` quedan tipados: nombres de tabla, columnas, enums, argumentos de funciones y la forma de los joins.

**Por qué generados y no escritos a mano:** el esquema real es la única fuente confiable. Un tipo escrito a mano puede quedar desactualizado sin que nadie lo note; uno generado se rompe en `npm run build` apenas difiere de la base.

### 2. Cómo se regeneran

```bash
npm run db:tipos
```

- **Cuándo:** después de aplicar cada migración (y antes de commitear el código que la usa). Si la migración agrega o cambia columnas, enums o funciones, el build va a marcar los lugares que hay que actualizar.
- **Requisitos:** `SUPABASE_PROJECT_ID` en `.env.local` (el *project ref*, el subdominio de `NEXT_PUBLIC_SUPABASE_URL`) y una sesión del CLI (`npx supabase login`). El project id no se escribe en el repositorio; `supabase/.temp/` (donde `supabase link` lo guarda) está en `.gitignore`.
- El script (`scripts/generar-tipos-db.mjs`) escribe el archivo en UTF-8. **No usar** `npx supabase gen types ... > src/types/database.ts` en PowerShell: guarda el archivo en UTF-16, ESLint lo rechaza como binario y los acentos de los enums (`Pasantía`, `Híbrido`) quedan corruptos.

### 3. Alias en `src/types/db.ts`

Para no repetir `Database["public"]["Tables"]["ofertas"]["Row"]`:

| Alias | Ejemplo |
|---|---|
| `Tabla<T>` | `Tabla<"ofertas">` — fila |
| `Insert<T>`, `Update<T>` | `Insert<"postulaciones">` |
| `Enum<E>` | `Enum<"estado_postulacion">` |
| `Rol` | `Enum<"rol_usuario">` |
| `FilaRpc<F>`, `ArgsRpc<F>`, `RetornoRpc<F>` | `FilaRpc<"estado_cursos_postulantes">` |
| `ConNulos<T, K>` | vuelve a marcar como nulas columnas de una función |
| `ClienteSupabase` | `SupabaseClient<Database>` para funciones que reciben el cliente |
| `esValorEnum(nombre, valor)` | type guard con los valores de `Constants` |

Y alias con nombre para las filas de las funciones RPC que usa la app (`FilaCandidatoParaEmpresa`, `FilaDerivacionDeOfertaEmpresa`, `FilaPostulacionNoSeleccionada`, etc.).

**Reglas para el código nuevo:**

- Los resultados de consultas no se castean. Si hace falta el tipo de una consulta con joins para las props de un componente, se deriva con `QueryData<typeof consulta>` (ver `admin/postulantes/[id]/page.tsx`) o con `Pick<Tabla<...>>`.
- Las props de los componentes que reciben datos de la base usan `Tabla`, `Enum` o `Pick` de ellos, no tipos sueltos duplicados.
- `as unknown as`, `.overrideTypes()` y `any` no se usan.

### 4. Los límites del generador y cómo se resuelven

El generador tiene tres puntos ciegos. Cada uno se resuelve en un solo lugar, con una función de mapeo tipada:

1. **Nulabilidad de las funciones `RETURNS TABLE`.** El generador marca todas las columnas como no nulas. `ConNulos<FilaRpc<F>, "col1" | "col2">` las vuelve a marcar; los alias de `db.ts` ya lo aplican.
2. **Columnas `text` con `CHECK`, que no son enums de Postgres** (`asignaciones_curso.estado`, `historial_aprobacion_empresa.evento`, `modalidad`/`jornada` dentro de `buscar_ofertas_publicas`). Se tipan con un type guard que descarta valores desconocidos: `conEstadoCurso()` y `aEstadoCursos()` en `lib/cursos.ts`, `esEventoHistorial()` en `admin/empresas/page.tsx`, `mapFilaPublica()` en `lib/ofertas.ts`. El `CHECK` de la base garantiza que no se descarta nada en la práctica.
3. **Columnas que completa un trigger.** `candidatos_guardados.empresa_id` es obligatoria para el generador, pero la completa el trigger `candidatos_guardados_set_empresa` y el grant de columna no permite enviarla (migration_028): mandarla haría fallar el insert. `filaGuardado()` en `empresa/(panel)/candidatos-guardados/actions.ts` es el único cast que queda sobre datos de la base, y está documentado ahí.

### 5. Autenticación y permisos: `src/lib/auth.ts`

Módulo `server-only`. Todas las funciones de lectura usan `cache` de React: en una misma request el usuario, la empresa y el postulante se consultan una sola vez aunque los pidan el layout, la página, la navbar y `obtenerSesionActual()`.

| Función | Devuelve | Uso |
|---|---|---|
| `obtenerUsuarioActual()` | `{ id, email, metadata, perfil }` o `null` | `perfil` es la fila de `usuarios` (puede ser `null`) |
| `obtenerEmpresaActual()` | fila de `empresas` o `null` | solo si el rol es `empresa` |
| `obtenerPostulanteActual()` | fila de `postulantes` o `null` | solo si el rol es `postulante` |
| `requerirUsuario()` | `{ ok: true, usuario }` o `NO_AUTENTICADO` | server actions |
| `requerirRol(rol \| roles)` | `{ ok: true, usuario }` o `NO_AUTENTICADO` / `SIN_PERMISO` | server actions |
| `requerirEmpresa({ aprobada })` | `{ ok: true, usuario, empresa }` o error | server actions de empresa |
| `requerirPostulante()` | `{ ok: true, usuario, postulante }` o error | server actions de postulante |
| `requerirUsuarioPagina()` | usuario; sin sesión redirige a `/auth/login` | páginas y layouts |
| `requerirRolPagina(rol, { siNoCorresponde })` | usuario con rol; con otro rol redirige a `/` o, con `"panel"`, al panel de su rol | páginas y layouts |
| `requerirEmpresaPagina(siNoHay)` | fila de `empresas`; sin empresa redirige a `siNoHay` | páginas del panel de empresa |

- Se usa `auth.getUser()`, que valida el token contra Supabase, y nunca `getSession()`.
- Las variantes para server actions devuelven una unión con `ResultadoError` (doc 009): TypeScript obliga a revisar `ok` antes de usar el usuario. El patrón es siempre:

  ```ts
  const auth = await requerirRol("municipalidad");
  if (!auth.ok) return auth;
  // auth.usuario.id, auth.usuario.perfil.rol === "municipalidad"
  ```

- Las variantes para páginas redirigen igual que antes del refactor: sin sesión al login; con otro rol a `/` en layouts y en las páginas de admin, y al panel propio en las páginas del postulante.
- Las páginas de `/admin` repiten el control de rol aunque el layout ya lo haga: los layouts no se vuelven a ejecutar al navegar entre páginas (guía de autenticación de Next). Como la consulta está cacheada, no agrega consultas.
- `obtenerSesionActual()` (`lib/sesion.ts`) se apoya en `obtenerUsuarioActual()`; ya no consulta `usuarios` por su cuenta.
- `proxy.ts` sigue llamando a `auth.getUser()` directamente: corre antes de la request de React, refresca la sesión y no puede usar `cache`.

### 6. Validación de entradas en las server actions

Toda server action valida lo que recibe antes de usarlo, con `src/lib/validaciones.ts`: `esUuid()`/`sonUuids()` para ids, `validarTextoOpcional()` con `LARGO_MAXIMO` para textos libres, `esValorEnum()` para valores de enums, `leerTexto()`/`leerArchivo()` para `FormData` y `validarOfertaRecibida()` para el formulario de ofertas (controla además los tipos, porque a una action se le puede mandar cualquier cosa).

### 7. RLS sigue siendo la protección principal

Los controles de `auth.ts` son una capa más, para devolver errores claros y no hacer consultas que la base va a rechazar. **No reemplazan** a las políticas RLS, los grants de columna ni las funciones `SECURITY DEFINER`, que siguen siendo las que impiden que un usuario lea o modifique datos ajenos aunque llame a la API de Supabase directamente. Un cambio de permisos se hace primero en la base (con una migración) y después se refleja en la app.

---

## Consecuencias

- Una migración que cambia el esquema se detecta en `npm run build` después de `npm run db:tipos`.
- Para agregar un control de permisos nuevo se usa un helper de `auth.ts`; no se vuelve a escribir `auth.getUser()` fuera de `auth.ts` y `proxy.ts`.
- `database.ts` tiene que estar al día: si alguien cambia la base sin regenerarlo, los tipos mienten. Por eso regenerarlo es parte de aplicar una migración.
