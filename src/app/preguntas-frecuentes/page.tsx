import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { Acordeon, ItemAcordeon } from "@/components/ui/acordeon";
import { obtenerUsuarioActual, type Rol } from "@/lib/auth";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { OFICINA } from "@/lib/oficina";
import { DURACIONES_OFERTA } from "@/lib/ofertas-vencimiento";
import { BotonVolver } from "@/components/ui/boton-volver";

export const metadata: Metadata = {
  title: "Preguntas frecuentes | Portal de Empleo Funes",
  description:
    "Respuestas sobre cómo registrarte, postularte, publicar ofertas y contactar a la Oficina de Empleo de la Municipalidad de Funes.",
};

const LINK = "font-semibold text-primary underline underline-offset-2 hover:text-primary-hover";

const DURACIONES = DURACIONES_OFERTA.join(", ").replace(/, (\d+)$/, " o $1");

type Pregunta = { pregunta: string; respuesta: ReactNode };
type IdSeccion = "postulantes" | "empresas" | "sobre-el-portal";
type Seccion = { id: IdSeccion; titulo: string; preguntas: Pregunta[] };

// Las respuestas salen de cómo funciona el portal (código, README y
// docs/decisiones). Si cambia una regla, hay que cambiarla también acá.
const SECCIONES: Seccion[] = [
  {
    id: "postulantes",
    titulo: "Postulantes",
    preguntas: [
      {
        pregunta: "¿Cómo me registro?",
        respuesta: (
          <p>
            Tocá «Registrarme» y elegí «Busco trabajo». Completá tus datos (nombre, apellido, DNI,
            teléfono, domicilio y de dónde sos), tu email y una contraseña. Después confirmá el
            email con el link que te mandamos y ya podés completar tu perfil y postularte.
          </p>
        ),
      },
      {
        pregunta: "¿Por qué tengo que confirmar el email?",
        respuesta: (
          <p>
            El link del correo activa tu cuenta: hasta que lo abrís, no podés usarla. Si no ves el
            correo en unos minutos, revisá la carpeta de spam o correo no deseado y marcalo como
            «No es spam» para recibir los próximos avisos.
          </p>
        ),
      },
      {
        pregunta: "¿Qué es el comprobante de domicilio y para qué sirve?",
        respuesta: (
          <p>
            Si vivís en Funes, podés subir cualquier documento donde figure tu dirección en la
            ciudad, por ejemplo una factura de un servicio (PDF, JPG, PNG o WEBP, hasta 5 MB). Es
            opcional: lo revisa la Oficina de Empleo y, con el comprobante aprobado, tenés
            prioridad. Lo subís al registrarte o desde tu perfil, donde ves si está en revisión,
            verificado o rechazado (con el motivo). Si cambiás de localidad, la verificación
            empieza de nuevo.
          </p>
        ),
      },
      {
        pregunta: "¿Qué necesito para postularme a una oferta?",
        respuesta: (
          <p>
            Una cuenta de postulante y al menos un CV cargado en tu perfil. Al postularte elegís
            con cuál de tus CVs (viene elegido el más reciente).
          </p>
        ),
      },
      {
        pregunta: "¿Cuántos CVs puedo subir?",
        respuesta: (
          <p>
            Hasta 5, en PDF de hasta 5 MB cada uno. Podés verlos y eliminarlos desde tu perfil;
            eliminar un CV no cambia las postulaciones que ya hiciste con él.
          </p>
        ),
      },
      {
        pregunta: "¿Cómo sé en qué estado está mi postulación?",
        respuesta: (
          <p>
            En «Mis postulaciones» ves el estado de cada una (Recibida, En revisión, Enviada a la
            empresa, Seleccionado, No seleccionado, Oferta cerrada o Retirada), con qué CV te
            postulaste y, si la hay, la pre-entrevista con la Oficina o la entrevista con la
            empresa. Los cambios también te llegan como aviso en la campanita y, los importantes,
            por email.
          </p>
        ),
      },
      {
        pregunta: "¿Puedo retirar una postulación?",
        respuesta: (
          <p>
            Sí, desde «Mis postulaciones», salvo que ya te hayan seleccionado o que el proceso ya
            haya terminado. La postulación retirada queda en tu historial y, si la oferta sigue
            abierta, podés volver a postularte.
          </p>
        ),
      },
    ],
  },
  {
    id: "empresas",
    titulo: "Empresas",
    preguntas: [
      {
        pregunta: "¿Cómo registro mi empresa?",
        respuesta: (
          <p>
            Tocá «Registrarme» y elegí «Quiero publicar ofertas». Completá los datos de la empresa
            (razón social, CUIT y rubro) y los de la persona responsable de la cuenta, y confirmá
            el email con el link que te mandamos.
          </p>
        ),
      },
      {
        pregunta: "¿Cuánto tarda la aprobación de mi empresa?",
        respuesta: (
          <p>
            Una vez que confirmás el email, la Oficina de Empleo revisa tu solicitud. El proceso
            tarda entre 1 y 3 días hábiles y te avisamos cuando está lista. Si la rechaza, ves el
            motivo en tu panel, corregís los datos y la volvés a enviar.
          </p>
        ),
      },
      {
        pregunta: "¿Cómo publico una oferta?",
        respuesta: (
          <p>
            Desde «Publicar oferta», con tu empresa ya aprobada. Indicás las vacantes y cuánto
            tiempo queda publicada ({DURACIONES} días). Si no tenés todo, podés guardarla como
            borrador (alcanza con el título) y enviarla a revisión cuando esté completa.
          </p>
        ),
      },
      {
        pregunta: "¿Por qué la Oficina revisa mi oferta?",
        respuesta: (
          <p>
            Todas las ofertas pasan por la Oficina de Empleo antes de publicarse: la aprueba o la
            rechaza con un motivo. Si la rechaza, ves el motivo, la corregís y la volvés a enviar.
          </p>
        ),
      },
      {
        pregunta: "¿Cómo veo a los candidatos?",
        respuesta: (
          <p>
            La Oficina de Empleo revisa las postulaciones y te deriva a los candidatos. Los ves en
            cada una de tus ofertas, con su foto, sus datos de contacto y el CV que eligieron al
            postularse. Desde ahí coordinás la entrevista (presencial u online) y seleccionás o
            descartás a cada uno. También podés guardar candidatos con una nota para tenerlos en
            cuenta más adelante.
          </p>
        ),
      },
      {
        pregunta: "¿Tiene costo recibir candidatos?",
        respuesta: (
          <p>
            No. La preselección de candidatos que hace la Oficina de Empleo no tiene costo de
            intermediación.
          </p>
        ),
      },
      {
        pregunta: "¿Puedo retirar una oferta?",
        respuesta: (
          <p>
            Sí, mientras está en revisión o publicada. Los candidatos que estaban en proceso quedan
            cerrados y reciben un aviso. Si una oferta vence, podés renovarla.
          </p>
        ),
      },
    ],
  },
  {
    id: "sobre-el-portal",
    titulo: "Sobre el portal",
    preguntas: [
      {
        pregunta: "¿Qué es el Portal de Empleo?",
        respuesta: (
          <p>
            Es el portal de la Oficina de Empleo de la Municipalidad de Funes. Conecta a las
            personas que buscan trabajo con las empresas de la ciudad: la Oficina revisa las
            empresas y las ofertas, acompaña a cada postulante y lo deriva a las empresas.
          </p>
        ),
      },
      {
        pregunta: "¿Necesito una cuenta para ver las ofertas?",
        respuesta: (
          <p>
            No. Podés buscar en{" "}
            <Link href="/ofertas" className={LINK}>
              Ofertas
            </Link>{" "}
            por puesto, rubro y modalidad sin registrarte. Para postularte sí necesitás una cuenta
            de postulante.
          </p>
        ),
      },
      {
        pregunta: "¿Cómo me entero de las novedades?",
        respuesta: (
          <p>
            Con la campanita de la navegación, que muestra tus avisos (postulaciones, entrevistas,
            aprobaciones, vencimientos, cursos e invitaciones). Los avisos importantes también te
            llegan por email.
          </p>
        ),
      },
      {
        pregunta: "¿Por qué se cerró mi sesión?",
        respuesta: (
          <p>
            Por seguridad, la sesión se cierra sola después de 30 minutos sin actividad y al
            cerrar el navegador. Iniciá sesión de nuevo y seguís donde estabas.
          </p>
        ),
      },
      {
        pregunta: "Me olvidé la contraseña, ¿qué hago?",
        respuesta: (
          <p>
            En{" "}
            <Link href="/auth/login" className={LINK}>
              Iniciar sesión
            </Link>{" "}
            tocá «¿Olvidaste tu contraseña?», escribí tu email y te mandamos un link para elegir
            una nueva.
          </p>
        ),
      },
      {
        pregunta: "¿Dónde queda la Oficina de Empleo y cuándo atiende?",
        respuesta: (
          <p>
            En{" "}
            <a href={OFICINA.direccion.href} target="_blank" rel="noopener noreferrer" className={LINK}>
              {OFICINA.direccion.texto}
              <span className="sr-only"> (abre Google Maps en otra pestaña)</span>
            </a>
            . Atiende de {OFICINA.horario.texto.toLowerCase()}.
          </p>
        ),
      },
    ],
  },
];

// Las secciones que ve cada rol de entrada; sin sesión y para la Oficina, todas.
// No restringe nada: la página es pública y ?ver=todas muestra las tres.
const POR_ROL: Partial<Record<Rol, { secciones: IdSeccion[]; quienes: string }>> = {
  postulante: { secciones: ["postulantes", "sobre-el-portal"], quienes: "los postulantes" },
  empresa: { secciones: ["empresas", "sobre-el-portal"], quienes: "las empresas" },
};

export default async function PreguntasFrecuentesPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string | string[] }>;
}) {
  const [{ ver }, usuario] = await Promise.all([searchParams, obtenerUsuarioActual()]);
  const rol = usuario?.perfil?.rol;
  const delRol = rol ? POR_ROL[rol] : undefined;
  const verTodas = ver === "todas";

  const secciones =
    delRol && !verTodas ? SECCIONES.filter(({ id }) => delRol.secciones.includes(id)) : SECCIONES;
  const bajada = delRol
    ? `Lo que más nos consultan ${delRol.quienes} sobre el Portal de Empleo.`
    : "Lo que más nos consultan sobre el Portal de Empleo.";

  return (
    <main className="flex flex-1 flex-col gap-10">
      <div className="flex flex-col gap-4">
        <BotonVolver href="/" destacado />
        <EncabezadoPagina titulo="Preguntas frecuentes" bajada={bajada} />
      </div>

      {secciones.map(({ id, titulo, preguntas }) => (
        <section key={id} aria-labelledby={`faq-${id}`} className="flex flex-col gap-4">
          <h2 id={`faq-${id}`} className="text-xl text-heading">
            {titulo}
          </h2>
          <Acordeon>
            {preguntas.map(({ pregunta, respuesta }) => (
              <ItemAcordeon key={pregunta} titulo={pregunta}>
                {respuesta}
              </ItemAcordeon>
            ))}
          </Acordeon>
        </section>
      ))}

      {delRol && (
        <p className="-mt-4 text-[15px]">
          <Link
            href={verTodas ? "/preguntas-frecuentes" : "/preguntas-frecuentes?ver=todas"}
            className={`${LINK} inline-flex min-h-11 items-center`}
          >
            {verTodas ? "Ver solo las mías" : "Ver todas las preguntas"}
          </Link>
        </p>
      )}

      <section aria-labelledby="faq-contacto" className="tarjeta flex flex-col gap-4 px-4 py-5 sm:p-6">
        <div>
          <h2 id="faq-contacto" className="text-xl text-heading">
            ¿No encontraste lo que buscabas?
          </h2>
          <p className="mt-1.5 text-[15px] text-muted-foreground-strong">
            Comunicate con la {OFICINA.nombre}, de {OFICINA.horario.texto.toLowerCase()}.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a href={OFICINA.telefono.href} className="btn-secundario">
            <Phone aria-hidden="true" />
            {OFICINA.telefono.texto}
          </a>
          <a href={OFICINA.correo.href} className="btn-secundario break-all">
            <Mail aria-hidden="true" />
            {OFICINA.correo.texto}
          </a>
        </div>
      </section>
    </main>
  );
}
