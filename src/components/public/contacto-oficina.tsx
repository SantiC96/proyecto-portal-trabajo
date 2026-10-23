import Image from "next/image";
import { Clock, Mail, MapPin, Phone } from "lucide-react";

// Datos del footer que tenía el inicio hasta la navegación lateral (decisión
// 031). La oficina no tiene una dirección con calle cargada en el portal.
const EMAIL = "empleo@funes.gob.ar";
const TELEFONO = "(0341) 493-6010";
const TELEFONO_LINK = "+543414936010";

const CLASE_LINK =
  "inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] outline-none hover:text-primary hover:underline focus-visible:shadow-[var(--sombra-foco)]";

/** Contacto de la Oficina de Empleo, al final del inicio. */
export function ContactoOficina() {
  return (
    <section
      aria-labelledby="contacto-oficina-titulo"
      className="flex flex-col gap-5 border-t border-border pt-8 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex items-center gap-4">
        <Image
          src="/images/logo-funes-verde.png"
          alt="Municipalidad de Funes"
          width={120}
          height={34}
          className="h-auto w-[120px] object-contain"
        />
        <h2 id="contacto-oficina-titulo" className="text-base font-bold text-heading">
          Oficina de Empleo
        </h2>
      </div>

      <ul className="flex flex-col gap-x-6 text-[15px] text-muted-foreground-strong sm:flex-row sm:flex-wrap">
        <li className="flex min-h-11 items-center gap-2">
          <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
          Municipalidad de Funes, Santa Fe
        </li>
        <li>
          <a href={`tel:${TELEFONO_LINK}`} className={CLASE_LINK}>
            <Phone className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {TELEFONO}
          </a>
        </li>
        <li>
          <a href={`mailto:${EMAIL}`} className={CLASE_LINK}>
            <Mail className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {EMAIL}
          </a>
        </li>
        <li className="flex min-h-11 items-center gap-2">
          <Clock className="size-4 shrink-0 text-primary" aria-hidden="true" />
          Lunes a viernes de 7:30 a 13:00
        </li>
      </ul>
    </section>
  );
}
