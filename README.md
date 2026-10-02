# Portal Municipal de Empleo

Portal web de gestión de empleo para la Municipalidad de Funes. Conecta a postulantes, empresas y la municipalidad en una misma plataforma.

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Supabase

**Tres roles:** postulante · empresa · municipalidad (admin)

## Integrantes

- Santiago Cancio
- Jessica Lopez

---

## Funcionalidades actuales

**Implementadas:**

- Registro de postulantes con DNI (detecta duplicados)
- Login y logout
- Confirmación de cuenta por email (flujo PKCE)
- Recuperación de contraseña por email
- Listado de ofertas laborales desde Supabase
- Filtros client-side: búsqueda de texto, rubro y modalidad
- Detalle de oferta
- Dashboard `/inicio` protegido por sesión (bienvenida al usuario)

**Pendiente:**

- Dashboard empresa (placeholder)
- Dashboard municipalidad / admin (placeholder)
- Sistema de postulaciones
- Registro de empresas

---

## Puesta en marcha

### 1. Clonar e instalar

```bash
git clone https://github.com/SantiC96/proyecto-portal-trabajo.git
cd proyecto-portal-trabajo
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Completar `.env.local` con los valores del proyecto en Supabase:

| Variable | Dónde se obtiene |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API → anon / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role key |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` en desarrollo local |

### 3. Migraciones

Ejecutar en el **SQL Editor de Supabase** en este orden:

```
src/migrations/migration_001_schema.sql
src/migrations/migration_002_telefono_rubro.sql
src/migrations/migration_003_dni_a_postulantes.sql
src/migrations/migration_004_rls.sql
src/migrations/migration_005_limpiar_duplicados.sql
src/migrations/migration_006_trigger_nuevo_usuario.sql
src/migrations/migration_007_campos_ofertas.sql
src/migrations/seed_ofertas.sql          ← después de migration_007
```

### 4. URLs de autenticación en Supabase

En **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** agregar `http://localhost:3000/auth/callback` y `http://localhost:3000/auth/nueva-contrasena`

### 5. Iniciar el servidor

```bash
npm run dev   # http://localhost:3000
```

Otros comandos:

```bash
npm run build   # build de producción
npm run lint    # verificar errores de código
```

---

## Rutas del proyecto

| URL | Archivo | Acceso |
|---|---|---|
| `/` | `src/app/page.tsx` | Pública |
| `/auth/login` | `src/app/auth/login/page.tsx` | Pública |
| `/auth/registro` | `src/app/auth/registro/page.tsx` | Pública |
| `/auth/verificar-email` | `src/app/auth/verificar-email/page.tsx` | Pública |
| `/auth/recuperar-contrasena` | `src/app/auth/recuperar-contrasena/page.tsx` | Pública |
| `/auth/reset-enviado` | `src/app/auth/reset-enviado/page.tsx` | Pública |
| `/auth/nueva-contrasena/formulario` | `src/app/auth/nueva-contrasena/formulario/page.tsx` | Pública (token en URL) |
| `/ofertas` | `src/app/ofertas/page.tsx` | Pública |
| `/ofertas/[id]` | `src/app/ofertas/[id]/page.tsx` | Pública |
| `/inicio` | `src/app/(dashboard)/inicio/page.tsx` | Requiere sesión |
| `/empresa` | `src/app/empresa/page.tsx` | Pública (placeholder) |
| `/admin` | `src/app/admin/page.tsx` | Pública (placeholder) |

> Los Route Handlers `/auth/callback` y `/auth/nueva-contrasena` son internos del flujo de autenticación y no son páginas navegables.

---

## Estructura de carpetas

```
src/
├── app/
│   ├── (dashboard)/          # Páginas que requieren sesión activa
│   │   ├── inicio/           # /inicio — bienvenida al usuario autenticado
│   │   └── layout.tsx        # Guard SSR: redirige a /auth/login sin sesión
│   ├── auth/                 # Flujos de autenticación
│   │   ├── actions.ts        # Server Actions: login, registro, reset, logout
│   │   ├── callback/         # Route Handler: canjea code PKCE (confirmación de email)
│   │   ├── login/
│   │   ├── nueva-contrasena/ # Route Handler + formulario de nueva contraseña
│   │   ├── recuperar-contrasena/
│   │   ├── registro/
│   │   ├── reset-enviado/
│   │   └── verificar-email/
│   ├── admin/                # Placeholder dashboard municipal
│   ├── empresa/              # Placeholder dashboard empresa
│   ├── ofertas/              # Listado y detalle de ofertas
│   ├── globals.css           # Tokens de color + import Tailwind v4
│   ├── layout.tsx            # Layout raíz
│   └── page.tsx              # / — página pública de inicio
├── components/
│   ├── auth/                 # Formularios de login y registro
│   ├── public/               # Componentes de la landing (Navbar, Hero, JobCard…)
│   └── ui/                   # Primitivos shadcn (Button, Input, Calendar)
├── lib/
│   ├── ofertas.ts            # Data access: getOfertasActivas, getCategorias, getOfertaById
│   ├── supabase-admin.ts     # Cliente admin (service role, bypasses RLS)
│   ├── supabase-browser.ts   # Cliente browser
│   ├── supabase-server.ts    # Cliente servidor (respeta RLS + cookies de sesión)
│   └── utils.ts              # cn()
└── migrations/               # SQL a ejecutar en el SQL Editor de Supabase
    ├── migration_001 → migration_007
    └── seed_ofertas.sql

docs/
├── DESIGN_SYSTEM_Portal_Municipal_Empleo.md
├── decisiones/               # Decisiones de arquitectura (ADRs 001–004)
├── guias/                    # Guías técnicas del proyecto
└── clase/                    # Prompts de aprendizaje
```

---

## Flujo de trabajo con Git

- **`main`** — código productivo. Nunca se trabaja directamente acá.
- **`develop`** — rama de integración. Tampoco se commitea directo.
- Ramas de trabajo se crean desde `develop` con prefijos: `feat/`, `fix/`, `refactor/`, `docs/`.
- Todo PR tiene base `develop`. `develop` se mergea a `main` con cada versión lista.

```bash
git checkout develop && git pull origin develop
git checkout -b feat/nombre-tarea
# ... trabajar, commitear ...
git push origin feat/nombre-tarea
# → abrir PR con base develop
```

---

## Documentación

- [`CLAUDE.md`](CLAUDE.md) — convenciones de arquitectura, patrones y reglas del repositorio
- [`docs/DESIGN_SYSTEM_Portal_Municipal_Empleo.md`](docs/DESIGN_SYSTEM_Portal_Municipal_Empleo.md) — tokens, colores, tipografía
- [`docs/guias/`](docs/guias/) — guías técnicas (auth, emails, migraciones, RLS, variables de entorno…)
- [`docs/guias/guia-nextjs-basico.md`](docs/guias/guia-nextjs-basico.md) — conceptos de Next.js 16, HTTP, hooks y Git
- [`docs/decisiones/`](docs/decisiones/) — decisiones de arquitectura (ADRs)
