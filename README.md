# Portal de Empleo Funes

Portal web de la Oficina de Empleo de la Municipalidad de Funes. Conecta a las personas que buscan trabajo con las empresas de la ciudad, y le da a la oficina un lugar único para revisar empresas y ofertas, acompañar a cada postulante y derivarlo a las empresas.

- **Sitio publicado:** URL_DEL_SITIO
- **Repositorio:** https://github.com/SantiC96/proyecto-portal-trabajo
- **Documentación técnica:** [docs/documentacion-tecnica.md](docs/documentacion-tecnica.md)

## Integrantes

- Santiago Cancio
- Jessica Lopez

## Usuarios demo

| Rol | Email | Contraseña | Qué probar |
|---|---|---|---|
| Postulante | PENDIENTE_DATOS_DEMO | PENDIENTE_DATOS_DEMO | Completar el perfil, subir el CV, postularse a una oferta y seguir su estado. |
| Empresa | PENDIENTE_DATOS_DEMO | PENDIENTE_DATOS_DEMO | Publicar una oferta, ver los candidatos derivados y coordinar una entrevista. |
| Oficina de Empleo | PENDIENTE_DATOS_DEMO | PENDIENTE_DATOS_DEMO | Aprobar empresas y ofertas, derivar postulaciones, asignar cursos y ver indicadores. |

## Funcionalidades

### Postulante

- Buscar ofertas por texto, rubro y modalidad, sin necesidad de registrarse.
- Postularse a una oferta y retirar la postulación mientras no fue revisada.
- Ver el estado de cada postulación, la pre-entrevista y la entrevista con la empresa.
- Completar el perfil: datos personales, rubros de interés, información laboral, foto y CV en PDF.
- Ver los cursos asignados por la oficina, empezarlos y marcarlos como completados.
- Cambiar la contraseña.

### Empresa

- Registrarse con razón social y CUIT, y esperar la aprobación de la oficina.
- Ver el motivo si la solicitud fue rechazada, corregir los datos y reenviarla.
- Publicar ofertas con vacantes y duración (15 a 60 días); cada oferta pasa por revisión de la oficina.
- Editar, cerrar, eliminar (si no se publicó) y renovar ofertas vencidas.
- Ver los candidatos que deriva la oficina, con su CV y foto.
- Coordinar y reprogramar entrevistas, y seleccionar o descartar candidatos.
- Guardar candidatos con una nota para tenerlos en cuenta más adelante.

### Oficina de Empleo

- Aprobar o rechazar empresas (con motivo) y ver el historial de cada solicitud.
- Aprobar o rechazar ofertas antes de que se publiquen.
- Revisar postulaciones, coordinar una pre-entrevista opcional y derivar a la empresa o descartar.
- Corregir el resultado de una derivación cuando hace falta.
- Consultar la base de postulantes con filtros (rubro, con CV, esperando curso) y ver la ficha de cada uno.
- Crear cursos de inserción laboral y asignarlos a quien acumula rechazos.

### Autenticación y cuentas

- Registro de postulantes y de empresas con confirmación por email.
- Recuperación de contraseña por email.
- Cierre de sesión automático después de 30 minutos sin actividad.
- Cada rol entra solo a su panel; después de iniciar sesión se vuelve a la página pedida.

### Avisos y emails

- Campanita con avisos para los tres roles (derivaciones, entrevistas, aprobaciones, vencimientos, cursos).
- Los avisos importantes también llegan por email.
- Página de avisos con marcar como leído y marcar todos.

### Dashboard de indicadores

- Postulantes, ofertas vigentes y empresas por estado.
- Postulaciones, derivaciones, contrataciones y cursos del período elegido.
- Tasa de contratación, días promedio hasta la derivación y gráficos por mes y por rubro.

## Cómo está construido

- **Next.js 16 (App Router) con React 19 y TypeScript**, publicado en Vercel. Las páginas se arman en el servidor y los cambios pasan por server actions.
- **Supabase** como base de datos (Postgres), autenticación y almacenamiento de archivos (CV y fotos en buckets privados).
- **Seguridad por roles en la base:** Row Level Security, permisos por columna y funciones SQL que validan rol, propiedad y estado.
- **Emails por Gmail (SMTP)** con una cola en la base y un cron diario de respaldo.
- **Git** con `main` (producción) y `develop` (integración), ramas `feat/`, `fix/`, `refactor/`, `docs/` y pull requests.

El detalle (arquitectura, base de datos, seguridad, storage, puesta en marcha y deploy) está en la [documentación técnica](docs/documentacion-tecnica.md).
