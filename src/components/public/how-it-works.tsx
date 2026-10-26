import { Building2, UserRound, type LucideIcon } from "lucide-react";
import { AuthLink } from "@/components/auth/auth-link";

type Paso = { destacado: string; resto: string };

type Columna = {
  titulo: string;
  icono: LucideIcon;
  pasos: Paso[];
  accion: { texto: string; href: string };
};

const COLUMNAS: Columna[] = [
  {
    titulo: "Para postulantes",
    icono: UserRound,
    pasos: [
      {
        destacado: "Registrate y cargá tu CV.",
        resto: "Creá tu cuenta completando tus datos personales, experiencia, formación y habilidades.",
      },
      {
        destacado: "Postulate a búsquedas.",
        resto: "Explorá las ofertas vigentes y postulate a las que coincidan con tu perfil e intereses laborales.",
      },
      {
        destacado: "Pre-entrevista municipal.",
        resto: "El equipo municipal revisa tu postulación y coordina una pre-entrevista para conocer mejor tus fortalezas.",
      },
      {
        destacado: "Preselección y contacto.",
        resto: "Tu perfil preseleccionado se envía a la empresa para la entrevista final y la contratación.",
      },
    ],
    accion: { texto: "Crear mi cuenta", href: "/auth/registro" },
  },
  {
    titulo: "Para empresas",
    icono: Building2,
    pasos: [
      { destacado: "Registrá tu razón social", resto: "en el portal." },
      {
        destacado: "La Oficina de Empleo valida tu registro",
        resto: "y publica tus avisos.",
      },
      {
        destacado: "Recibís una preselección",
        resto: "de postulantes calificados, sin costo de intermediación.",
      },
    ],
    accion: { texto: "Registrar mi empresa", href: "/auth/registro?tipo=empresa" },
  },
];

/** Cómo funciona el portal, para quien todavía no tiene cuenta. */
export function HowItWorks() {
  return (
    <section id="como-funciona" aria-labelledby="como-funciona-titulo" className="scroll-mt-20">
      <h2 id="como-funciona-titulo" className="titulo-display text-[26px] leading-tight">
        Cómo funciona
      </h2>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        {COLUMNAS.map(({ titulo, icono: Icono, pasos, accion }) => (
          <article key={titulo} className="tarjeta flex flex-col gap-[22px] p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-white">
                <Icono className="size-6" aria-hidden="true" />
              </span>
              <h3 className="text-[21px] leading-tight font-extrabold">{titulo}</h3>
            </div>
            <ol className="flex flex-col gap-4">
              {pasos.map((paso, i) => (
                <li key={paso.destacado} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="grid size-[30px] shrink-0 place-items-center rounded-full bg-primary text-sm font-extrabold text-white"
                  >
                    {i + 1}
                  </span>
                  <p className="pt-0.5 text-base leading-normal text-foreground">
                    <strong className="font-bold">{paso.destacado}</strong> {paso.resto}
                  </p>
                </li>
              ))}
            </ol>
            <AuthLink href={accion.href} className="btn-primario mt-auto self-start">
              {accion.texto}
            </AuthLink>
          </article>
        ))}
      </div>
    </section>
  );
}
