import Image from "next/image";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { OFICINA } from "@/lib/oficina";
import { cn } from "@/lib/utils";

const CLASE_LINK =
  "inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] outline-none hover:text-primary hover:underline focus-visible:shadow-[var(--sombra-foco)]";

// 44 px de alto para tocarlo sin que el recuadro crezca (margen negativo).
const CLASE_LINK_RECUADRO =
  "-my-2.5 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] break-words text-primary underline-offset-2 outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]";

/**
 * Contacto de la Oficina de Empleo dentro del contenido (el pie de todas las
 * pantallas es el Footer). `enTarjeta`: en una tarjeta del panel (cuenta de
 * empresa rechazada).
 *
 * `recuadros` (cuenta de empresa en revisión): tarjeta con el escudo verde de
 * 52 px, el título, `bajada` y los cuatro datos en recuadros grises (4
 * columnas desde xl, 2 desde sm, 1 en el celular), cada uno con su ícono
 * verde, la etiqueta y el valor; el teléfono y el email son links.
 */
export function ContactoOficina({
  enTarjeta = false,
  recuadros = false,
  bajada,
}: {
  enTarjeta?: boolean;
  recuadros?: boolean;
  bajada?: string;
}) {
  if (recuadros) {
    const datos = [
      {
        Icono: MapPin,
        etiqueta: "Dirección",
        valor: (
          <a
            href={OFICINA.direccion.href}
            target="_blank"
            rel="noopener noreferrer"
            className={CLASE_LINK_RECUADRO}
          >
            {OFICINA.direccion.texto}
            <span className="sr-only"> (abre Google Maps en otra pestaña)</span>
          </a>
        ),
      },
      {
        Icono: Phone,
        etiqueta: "Teléfono",
        valor: (
          <a href={OFICINA.telefono.href} className={CLASE_LINK_RECUADRO}>
            {OFICINA.telefono.texto}
          </a>
        ),
      },
      {
        Icono: Mail,
        etiqueta: "Email",
        valor: (
          <a href={OFICINA.correo.href} className={cn(CLASE_LINK_RECUADRO, "break-all")}>
            {OFICINA.correo.texto}
          </a>
        ),
      },
      { Icono: Clock, etiqueta: "Horario", valor: OFICINA.horario.texto },
    ];
    return (
      <section
        aria-labelledby="contacto-oficina-titulo"
        className="tarjeta tarjeta-panel flex flex-col gap-5"
      >
        <div className="flex items-center gap-4">
          <Image
            src="/images/escudo-verde.png"
            alt=""
            width={330}
            height={344}
            className="h-auto w-[52px] shrink-0"
          />
          <div className="min-w-0">
            <h2 id="contacto-oficina-titulo" className="text-lg leading-snug font-extrabold text-heading">
              {OFICINA.nombre}
            </h2>
            {bajada && <p className="mt-0.5 text-[15px] text-muted-foreground-strong">{bajada}</p>}
          </div>
        </div>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {datos.map(({ Icono, etiqueta, valor }) => (
            <div
              key={etiqueta}
              className="flex min-w-0 items-start gap-3 rounded-[14px] border border-secondary-hover bg-tabla-fila-hover p-3.5"
            >
              <Icono aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <dt className="text-xs font-semibold text-muted-foreground">{etiqueta}</dt>
                <dd className="mt-0.5 text-[15px] leading-snug font-bold break-words text-heading">
                  {valor}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </section>
    );
  }

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
