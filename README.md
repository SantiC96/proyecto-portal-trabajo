# Portal de Empleo Funes

Portal web de la Oficina de Empleo de la Municipalidad de Funes. Conecta a las personas que buscan trabajo con empresas de la ciudad y permite que la Oficina acompañe el proceso de intermediación laboral.

- **Sitio publicado:** https://proyecto-portal-trabajo.vercel.app/
- **Repositorio:** https://github.com/SantiC96/proyecto-portal-trabajo
- **Documentación técnica:** [docs/documentacion-tecnica.md](docs/documentacion-tecnica.md)

## Integrantes

- Santiago Cancio
- Jessica Lopez

## Stack y tecnologías

- **Next.js 16** con App Router, **React 19** y **TypeScript**.
- **Supabase** para PostgreSQL, autenticación y almacenamiento de archivos.
- **Row Level Security (RLS)**, permisos por columna y funciones SQL para proteger los datos y validar operaciones.
- **Tailwind CSS 4** y **shadcn/ui** con componentes basados en Base UI React.
- **Recharts** para gráficos y **Lucide** para íconos.
- **Nodemailer y Gmail SMTP** para emails; una cola en la base de datos y una tarea programada procesan los envíos.
- **Vercel** para hosting y despliegue.
- Interfaz responsive con enfoque **mobile-first**.

## Puesta en marcha local

Requisitos: Node.js y npm.

```bash
npm install
npm run dev
```

Comandos disponibles:

```bash
npm run lint
npm run build
```

## Documentación

- [Documentación técnica](docs/documentacion-tecnica.md)
- [Sistema de diseño](docs/DESIGN_SYSTEM_Portal_Municipal_Empleo.md)
- [Guía de autenticación](docs/guias/guia-auth-supabase.md)
- [Guía de migraciones](docs/guias/guia-migraciones-supabase.md)
- [Guía de emails](docs/guias/guia-emails-supabase.md)

## MVP original

El alcance inicial contempla un portal público de ofertas y tres actores: postulantes, empresas y Oficina de Empleo. La Oficina mantiene la intermediación: revisa las ofertas y participa en la selección de candidatos antes de derivarlos a una empresa.

- **Postulantes:** registrarse, completar su perfil y CV con varios rubros de interés, buscar y filtrar ofertas, postularse y consultar sus postulaciones.
- **Empresas:** registrarse y esperar la aprobación de la Oficina, publicar ofertas, consultar su estado, coordinar entrevistas, contratar postulantes y editar sus datos.
- **Oficina de Empleo:** aprobar empresas y ofertas, buscar postulantes por rubro, gestionar la preselección y las pre-entrevistas, consultar el historial de postulaciones, derivar a cursos introductorios tras tres postulaciones sin selección y generar reportes.

## Módulos adicionales incorporados al MVP

### Postulantes

- Búsqueda ampliada por texto, rubros y modalidades, exploración por rubro y recomendaciones según el perfil.
- Retiro de postulaciones y posibilidad de volver a postularse mientras la oferta siga abierta.
- Invitaciones de la Oficina a ofertas, con respuestas de interés o rechazo, selección de CV, motivo opcional e historial.
- Panel de actividad con postulaciones recientes, invitaciones pendientes y completitud del perfil.
- Perfil ampliado con experiencia, disponibilidad, foto y localidad; comprobante de domicilio para postulantes de Funes.
- Hasta cinco CVs por cuenta, selección al postularse y conservación de los archivos asociados a postulaciones existentes; eliminación definitiva a los 30 días, salvo CVs asociados a postulaciones en curso.
- Gestión de cursos de inserción laboral: creación por la Oficina, asignación a postulantes y seguimiento de su progreso.

### Empresas

- Aprobación de solicitudes, con motivo de rechazo y opción de corregir y reenviar.
- Ofertas en borrador, renovación, retiro y eliminación con opción de restauración durante 30 días.
- Candidatos guardados con notas.
- Perfil con logo y datos de contacto.
- Panel de indicadores con ofertas, vacantes, derivaciones, entrevistas y resultados por período.

### Oficina de Empleo

- Búsqueda de postulantes para una oferta, con nivel y motivos de coincidencia, e invitación directa.
- Historial de solicitudes de empresas, revisión de comprobantes y prioridad para postulantes de Funes con domicilio verificado.
- Corrección del resultado de una derivación y gestión de cuentas de la Oficina por invitación, desactivación y reactivación.
- Indicadores por período, con tendencias, comparaciones y detalle de la actividad.
- Modo de datos ficticios para demostraciones de los indicadores.

### Funcionalidades transversales

- Confirmación de email, recuperación de contraseña, control de sesión por rol y cierre por inactividad tras 30 minutos.
- Retorno a la página solicitada después del inicio de sesión.
- Centro de avisos por rol y emails para eventos importantes; los avisos se marcan como leídos al consultarlos.
- Página pública de preguntas frecuentes, con contenido adaptado al rol.