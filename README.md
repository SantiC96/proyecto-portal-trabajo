# Portal de Empleo Funes

Portal web de la Oficina de Empleo de la Municipalidad de Funes. Conecta a las personas que buscan trabajo con las empresas de la ciudad, y le da a la oficina un lugar único para revisar empresas y ofertas, acompañar a cada postulante y derivarlo a las empresas.

- **Sitio publicado:** https://proyecto-portal-trabajo.vercel.app/
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

- Panel de inicio: cómo están sus postulaciones, aviso de invitaciones para responder, últimos movimientos, qué le falta al perfil y ofertas que coinciden con su perfil (con el mismo puntaje que usa la oficina).
- Buscar ofertas por texto, rubro y modalidad, sin necesidad de registrarse.
- Postularse a una oferta eligiendo con cuál de sus CVs (el más reciente viene elegido) y retirarla en cualquier momento salvo si ya fue seleccionado; la retirada queda en el historial y se puede volver a postular mientras la oferta siga abierta.
- Ver el estado de cada postulación, con qué CV se postuló, la pre-entrevista y la entrevista con la empresa.
- Recibir invitaciones de la Oficina de Empleo a ofertas que coinciden con su perfil (aviso y email). En su pantalla de Invitaciones responder "Me interesa" (eligiendo el CV: queda una postulación normal pendiente de revisión) o "No me interesa" (con un motivo opcional); las anteriores quedan en un historial.
- Completar el perfil: datos personales, rubros de interés, información laboral y foto.
- Indicar de dónde es (Funes, una localidad de la zona u otra escrita a mano) al registrarse o desde el perfil. Quien vive en Funes puede subir un comprobante de domicilio (PDF o imagen) para que la oficina lo verifique, y ve su estado: en revisión, verificado o rechazado con el motivo. Cambiar de localidad reinicia la verificación.
- Tener hasta 5 CVs en PDF, verlos y eliminarlos; eliminar un CV no cambia las postulaciones ya hechas con él. Los CVs y fotos eliminados se borran definitivamente a los 30 días, salvo un CV de una postulación en curso.
- Ver los cursos asignados por la oficina, empezarlos y marcarlos como completados.
- Cambiar la contraseña.

### Empresa

- Registrarse con razón social y CUIT, y esperar la aprobación de la oficina.
- Ver el motivo si la solicitud fue rechazada, corregir los datos y reenviarla.
- Publicar ofertas con vacantes y duración (15 a 60 días); cada oferta pasa por revisión de la oficina.
- Guardar una oferta como borrador con lo que haya (al menos el título) y enviarla a revisión cuando esté completa.
- Editar, renovar ofertas vencidas y retirar una oferta en revisión o publicada: los candidatos en proceso quedan cerrados y reciben un aviso.
- Eliminar un borrador, una oferta rechazada o una pendiente sin postulaciones, y restaurarla durante 30 días desde la pestaña "Eliminadas".
- Ver los candidatos que deriva la oficina, con su foto y el CV que eligieron al postularse.
- Coordinar y reprogramar entrevistas, y seleccionar o descartar candidatos.
- Guardar candidatos con una nota para tenerlos en cuenta más adelante.
- Dashboard de indicadores: ofertas por estado, vacantes cubiertas, candidatos derivados, entrevistas y seleccionados del período, con el detalle de cada oferta.
- Mi perfil: logo de la empresa, datos de contacto de la persona responsable y cambio de contraseña; los datos de la empresa se ven sin editar.

### Oficina de Empleo

- Aprobar o rechazar empresas (con motivo) y ver el historial de cada solicitud.
- Aprobar o rechazar ofertas antes de que se publiquen.
- Revisar postulaciones, coordinar una pre-entrevista opcional y derivar a la empresa o descartar.
- Corregir el resultado de una derivación cuando hace falta.
- Consultar la base de postulantes, ordenada por prioridad (primero los de Funes con domicilio verificado), con búsqueda y filtro por rubro, y ver la ficha de cada uno, con sus CVs y el CV de cada postulación.
- Ver la procedencia de cada postulante con un badge ("Funes · Verificado", "Funes · Sin verificar", "Otra localidad: …") en listas y fichas, revisar los comprobantes de domicilio en su propia pantalla o desde la ficha (aprobar, o rechazar con motivo) y ordenar las postulaciones con "Primero verificados de Funes". Las empresas no ven nada de esto.
- Desde una oferta publicada (en su panel o en el listado público de ofertas), buscar postulantes que coinciden con ella aunque no se hayan postulado (rubro, requisitos y título contra su experiencia, disponibilidad y CV), con un nivel de coincidencia y las razones, e invitarlos a postularse. Los ya invitados aparecen al final con su última respuesta ("No interesado" muestra el motivo al pasar el mouse o tocarlo); se puede volver a invitar a quien dijo que no, también desde la ficha del postulante. Si aceptan, la postulación ("Por invitación") se revisa y deriva como cualquier otra. La empresa no ve nada de esto.
- Crear cursos de inserción laboral y asignarlos a quien acumula rechazos.
- Gestionar las cuentas de la oficina: invitar por email, desactivar y reactivar (siempre queda al menos una activa; nadie se desactiva a sí mismo).
- Mi perfil: foto, datos de contacto y cambio de contraseña.

### Autenticación y cuentas

- Registro de postulantes y de empresas con confirmación por email.
- Recuperación de contraseña por email.
- Cierre de sesión automático después de 30 minutos sin actividad.
- Cada rol entra solo a su panel; después de iniciar sesión se vuelve a la página pedida.

### Avisos y emails

- Campanita con avisos para los tres roles (derivaciones, entrevistas, aprobaciones, vencimientos, cursos, invitaciones a ofertas).
- Los avisos importantes también llegan por email.
- Página de avisos de cada rol. Al abrir la campanita o la página, los avisos se marcan como leídos solos; no hay indicadores sobre la foto ni el nombre.

### Dashboard de indicadores de la oficina

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
