import Image from "next/image";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { OFICINA } from "@/lib/oficina";
import { cn } from "@/lib/utils";

const CLASE_LINK =
  "inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] outline-none hover:text-primary hover:underline focus-visible:shadow-[var(--sombra-foco)]";

/**
 * Contacto de la Oficina de Empleo dentro del contenido (el pie de todas las
 * pantallas es el Footer). `enTarjeta`: en una tarjeta del panel (cuenta de
 * empresa en revisión o rechazada).
 */
export function ContactoOficina({ enTarjeta = false }: { enTarjeta?: boolean }) {
  return (
    <section
      aria-labelledby="contacto-oficina-titulo"
      className={cn(
        "flex flex-col gap-5",
        enTarjeta
          ? "tarjeta px-4 py-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between"
          : "border-t border-border pt-8 lg:flex-row lg:items-center lg:justify-between",
      )}
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
          {OFICINA.nombre}
        </h2>
      </div>

      <ul className="flex flex-col gap-x-6 text-[15px] text-muted-foreground-strong sm:flex-row sm:flex-wrap">
        <li>
          <a
            href={OFICINA.direccion.href}
            target="_blank"
            rel="noopener noreferrer"
            className={CLASE_LINK}
          >
            <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {OFICINA.direccion.texto}
            <span className="sr-only"> (abre Google Maps en otra pestaña)</span>
          </a>
        </li>
        <li>
          <a href={OFICINA.telefono.href} className={CLASE_LINK}>
            <Phone className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {OFICINA.telefono.texto}
          </a>
        </li>
        <li>
          <a href={OFICINA.correo.href} className={cn(CLASE_LINK, "break-all")}>
            <Mail className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {OFICINA.correo.texto}
          </a>
        </li>
        <li className="flex min-h-11 items-center gap-2">
          <Clock className="size-4 shrink-0 text-primary" aria-hidden="true" />
          {OFICINA.horario.texto}
        </li>
      </ul>
    </section>
  );
}
