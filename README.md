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
| Postulante | santicancio2@gmail.com | Password123 | Completar el perfil, subir el CV, postularse a una oferta, responder una invitación y seguir el estado de cada postulación. |
| Empresa | santiago.cancio96@gmail.com | Password123 | Publicar una oferta, ver los candidatos derivados, coordinar una entrevista, guardar candidatos y ver los indicadores. |
| Empresa | scancio637@gmail.com | Password123 | Lo mismo que la otra empresa, con otras ofertas y otros candidatos. |
| Oficina de Empleo | user@admin.com | Password123 | Aprobar empresas, ofertas y comprobantes de domicilio, derivar postulaciones, invitar postulantes a ofertas, asignar cursos y ver los indicadores. |

## Funcionalidades

### Postulante

- Panel de inicio: cómo están sus postulaciones, aviso de invitaciones para responder, últimos movimientos, qué le falta al perfil y ofertas que coinciden con su perfil (con el mismo puntaje que usa la oficina).
- Buscar ofertas por texto, rubros y modalidades, sin necesidad de registrarse. Se pueden elegir varios rubros y varias modalidades a la vez (alcanza con que la oferta tenga uno de los rubros y una de las modalidades elegidas); si no hay resultados, el listado avisa cuántas ofertas hay de esos rubros en otra modalidad.
- En el listado de ofertas, "Explorá por rubro": tarjetas con los rubros que tienen más ofertas vigentes (con sesión de postulante, primero los de su perfil) y un panel "Todos los rubros" con buscador para elegir varios a la vez. Los filtros activos se ven como chips que se quitan con un toque.
- Inicio con buscador (puesto o palabra clave y rubro, lleva al listado de ofertas), accesos por rubro y un carrusel con las últimas 10 ofertas publicadas.
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

### Preguntas frecuentes

- Página pública `/preguntas-frecuentes` (en la navegación sin sesión y en el footer) con las preguntas agrupadas en "Postulantes", "Empresas" y "Sobre el portal", en desplegables, y al final el teléfono y el correo de la Oficina. Con sesión de postulante se ven "Postulantes" y "Sobre el portal"; con sesión de empresa, "Empresas" y "Sobre el portal" (sin sesión y para la Oficina, las tres). El link "Ver todas las preguntas" (`?ver=todas`) muestra las tres.

### Avisos y emails

- Campanita con avisos para los tres roles (derivaciones, entrevistas, aprobaciones, vencimientos, cursos, invitaciones a ofertas).
- Los avisos importantes también llegan por email.
- Página de avisos de cada rol. Al abrir la campanita o la página, los avisos se marcan como leídos solos; no hay indicadores sobre la foto ni el nombre.

### Dashboard de indicadores de la oficina

- Selector de período desplegable: últimos 30 días, últimos 90 días, este año o desde el inicio.
- Postulantes registrados, ofertas vigentes, postulaciones nuevas y contrataciones, cada una con su mini línea de tendencia y la variación contra el período anterior de la misma duración.
- Evolución general (postulaciones y contrataciones por día, semana o mes), estado de las postulaciones del período, ofertas vigentes por área, las últimas cinco postulaciones y un resumen con derivaciones, contrataciones y tasa de contratación.
- Más abajo, postulaciones por rubro, resultado de las derivaciones, empresas por estado y el proceso de la Oficina (pre-entrevistas, no seleccionados, días hasta la derivación y cursos). Las tarjetas que están fuera de la pantalla aparecen al llegar con el scroll.

### Datos de ejemplo en los indicadores

Para presentaciones, la variable de entorno de servidor `INDICADORES_DE_EJEMPLO=true` hace que las pantallas de indicadores de la oficina y de la empresa muestren datos ficticios (dos años de uso en la oficina). **La pantalla no muestra ninguna marca de que son datos de ejemplo**: se ve igual que con los datos reales, así que hay que apagar el modo después de cada presentación. No escribe en la base ni manda correos, y el resto del portal sigue con los datos reales. Sin la variable, o con otro valor, todo funciona como siempre.

- **Local:** agregar `INDICADORES_DE_EJEMPLO=true` a `.env.local` y reiniciar `npm run dev`. Para apagarlo, borrar la línea y reiniciar.
- **Vercel:** en *Settings → Environment Variables*, agregar `INDICADORES_DE_EJEMPLO` = `true` y volver a desplegar. Para apagarlo, borrar la variable y volver a desplegar: el cambio no aplica hasta el próximo deploy.

## Cómo está construido

- **Next.js 16 (App Router) con React 19 y TypeScript**, publicado en Vercel. Las páginas se arman en el servidor y los cambios pasan por server actions.
- **Supabase** como base de datos (Postgres), autenticación y almacenamiento de archivos (CV y fotos en buckets privados).
- **Seguridad por roles en la base:** Row Level Security, permisos por columna y funciones SQL que validan rol, propiedad y estado.
- **Emails por Gmail (SMTP)** con una cola en la base y un cron diario de respaldo.
- **Interfaz con Tailwind CSS y shadcn/ui:** verde institucional, Public Sans y estados en colores sólidos según el [design system](docs/DESIGN_SYSTEM_Portal_Municipal_Empleo.md). Los gráficos de los indicadores usan los charts de shadcn/ui sobre **Recharts**.
- **Navegación lateral por rol:** sidebar a la izquierda (contraíble) y, en el celular, barra superior con panel; las pantallas de `/auth` van sin navegación.
- **Footer en todas las pantallas con navegación** (no en `/auth`): marca, datos de la Oficina de Empleo (dirección con link a Google Maps, horario, teléfono y correo), Instagram y Facebook de la Municipalidad y enlaces según la sesión. Los datos de la Oficina están en un solo lugar: `src/lib/oficina.ts`.
- **Git** con `main` (producción) y `develop` (integración), ramas `feat/`, `fix/`, `refactor/`, `docs/` y pull requests.

El detalle (arquitectura, base de datos, seguridad, storage, puesta en marcha y deploy) está en la [documentación técnica](docs/documentacion-tecnica.md).
