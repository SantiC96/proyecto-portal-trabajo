# 014 — Notificaciones

**Fecha:** 2026-10-15
**Estado:** Vigente
**Migración:** `migration_038_cursos_sin_abandono_y_notificaciones.sql`

---

## Contexto

La Oficina de Empleo se enteraba de una contratación solo si entraba a buscarla. Hacía falta un aviso, y se espera necesitar otros (ofertas por vencer, cursos completados, solicitudes de empresas). En vez de una tabla por tipo de aviso se creó una tabla genérica.

---

## Decisiones tomadas

### 1. Tabla `public.notificaciones`

| Columna | Tipo | Uso |
|---|---|---|
| `id` | `uuid` PK | |
| `usuario_id` | `uuid` FK → `usuarios(id)` `ON DELETE CASCADE` | destinatario |
| `tipo` | `text` + `CHECK notificaciones_tipo_check` | clase de aviso; hoy solo `'contratacion'` |
| `titulo` | `text` | encabezado corto |
| `mensaje` | `text` | texto completo, ya armado |
| `link` | `text` NULL + `CHECK notificaciones_link_check` | ruta interna (`/admin/...`); nunca una URL externa |
| `clave` | `text` NULL | identificador del hecho que originó el aviso, para no duplicarlo |
| `leida_en` | `timestamptz` NULL | NULL mientras no se leyó |
| `created_at` | `timestamptz` | |

Índices:

- `notificaciones_usuario_leida_idx (usuario_id, leida_en, created_at DESC)`: contador de no leídas y listado.
- `notificaciones_usuario_clave_idx (usuario_id, clave) WHERE clave IS NOT NULL` (único): un mismo hecho genera como máximo un aviso por destinatario. Los que crean avisos usan `ON CONFLICT (usuario_id, clave) WHERE clave IS NOT NULL DO NOTHING`.

**Por qué el texto se guarda armado:** el aviso cuenta lo que pasó en ese momento. Si después cambia el nombre de la empresa o el título de la oferta, el aviso no cambia, y leerlo no necesita joins ni permisos sobre otras tablas.

**Por qué `clave` y no una FK a la derivación:** la tabla tiene que servir para avisos de cualquier origen. `clave` es texto libre con la forma `'<tipo>:<id>'` (por ejemplo `contratacion:<derivacion_id>`).

### 2. Permisos

- RLS activado. Políticas: `SELECT` y `UPDATE` solo sobre las filas con `usuario_id = auth.uid()`.
- Grants: `SELECT` y `UPDATE (leida_en)` para `authenticated`. Nada para `anon`.
- **Nadie inserta ni borra desde el cliente.** Las filas las crean triggers o funciones `SECURITY DEFINER`. Así un usuario no puede fabricar avisos para otro.

### 3. Aviso de contratación

Trigger `derivaciones_notificar_contratacion` (AFTER UPDATE OF `estado_empresa` ON `derivaciones`), con `WHEN` nuevo = `'contratado'` y viejo distinto. La función `derivaciones_notificar_contratacion_fn()` (`SECURITY DEFINER`, `search_path = ''`) inserta un aviso por cada usuario con rol `municipalidad`:

- `titulo`: "Nueva contratación"
- `mensaje`: "<Empresa> contrató a <Nombre Apellido> para <Oferta>" (empresa = `ofertas.empresa_nombre`, lo mismo que muestra el panel)
- `link`: `/admin/postulaciones/<postulacion_id>` (ficha de la postulación)
- `clave`: `contratacion:<derivacion_id>`: si la oficina corrige la derivación y vuelve a quedar en `contratado`, no se repite el aviso.

Funciona tanto si la contratación la marca la empresa como si la corrige la oficina. Los usuarios de la oficina que se den de alta después no reciben avisos viejos.

**Sin backfill:** las contrataciones anteriores a la migración no generan avisos; la sección "Contratado" de `admin/postulaciones` ya las lista.

### 4. Interfaz

- **Campanita** en la navbar (solo rol `municipalidad`): cantidad de no leídas (oculta en 0), últimos 5 avisos con fecha, "Marcar como leída" por aviso y "Marcar todas como leídas". Al abrirla vuelve a pedir los datos al servidor. Hacer clic en un aviso lo marca como leído y lleva a su link.
- **Página** `/admin/notificaciones`: listado completo, paginado (20 por página), con las mismas acciones.
- Los datos iniciales los carga `obtenerSesionActual()` (`src/lib/sesion.ts`) en el layout raíz; las acciones revalidan ese layout.
- Server actions en `src/app/admin/notificaciones/actions.ts`. `abrirNotificacion` solo redirige a rutas internas (`esLinkInterno`), aunque la base ya lo exige con el CHECK.

---

## Cómo agregar un aviso nuevo

1. Migración nueva que reemplace `notificaciones_tipo_check` agregando el tipo:
   ```sql
   ALTER TABLE public.notificaciones DROP CONSTRAINT IF EXISTS notificaciones_tipo_check;
   ALTER TABLE public.notificaciones
     ADD CONSTRAINT notificaciones_tipo_check
     CHECK (tipo IN ('contratacion', '<tipo_nuevo>'));
   ```
2. Un trigger o una función `SECURITY DEFINER` que inserte las filas, con `clave = '<tipo_nuevo>:<id del hecho>'` y `ON CONFLICT ... DO NOTHING`.
3. Si el aviso es para otro rol (empresa o postulante), mostrar la campanita también para ese rol en la navbar y crear su página de listado. La tabla, las políticas y las server actions no cambian: ya filtran por el usuario de la sesión.

---

## Archivos clave

```
src/migrations/migration_038_cursos_sin_abandono_y_notificaciones.sql
src/lib/notificaciones.ts                          — tipos, resumen para la navbar, esLinkInterno
src/app/admin/notificaciones/actions.ts            — marcar leída(s), abrir, refrescar
src/app/admin/notificaciones/page.tsx              — listado paginado
src/components/notificaciones/campana-notificaciones.tsx
```
