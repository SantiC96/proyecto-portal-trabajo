import type { ReactNode } from "react";
import Link from "next/link";
import { Briefcase, CalendarDays, Clock, MapPin } from "lucide-react";
import { EtiquetaRubro } from "@/components/ui/etiqueta-rubro";
import { cn } from "@/lib/utils";

type Props = {
  /**
   * "compacta": carrusel del inicio; sin descripción.
   * "detallada": /ofertas, "Ofertas para vos" del panel y la vista previa del
   * formulario; con la descripción.
   */
  variante?: "compacta" | "detallada";
  href: string;
  titulo: string;
  empresa: string | null;
  /** Se muestra el primero en verde y "+N" si hay más. */
  rubros: string[];
  modalidad: string;
  lugar: string;
  /** Solo en la variante detallada, en 2 renglones; sin dato no se muestra. */
  descripcion?: string | null;
  /** Sin dato no se muestra. */
  jornada?: string | null;
  /**
   * Cuándo se publicó, ya armado en el servidor ("Publicada hace 3 días",
   * formatAntiguedadPublicacion). Por ahora solo lo pasa el carrusel del inicio.
   */
  publicada?: string | null;
  /** Badges junto a las etiquetas ("Te invitaron", coincidencia). */
  badges?: ReactNode;
  /** Texto del botón que lleva a la oferta. */
  textoAccion?: string;
  /** Otra acción con su propio link (por ejemplo "Buscar postulantes"). */
  accionExtra?: ReactNode;
  className?: string;
};

/**
 * Tarjeta de oferta. El título es el link y cubre toda la tarjeta (un solo
 * paso de teclado por oferta); el botón de abajo es solo visual y lleva al
 * mismo lugar. `accionExtra` queda por encima y es su propio link.
 *
 * Compacta: etiquetas, título, lugar y botón apilados, con el ícono en la
 * esquina. Detallada: desde 448 px de ancho interno (@md, container query) va
 * en dos columnas: título y etiquetas arriba, la descripción a lo ancho, y
 * abajo el botón a la izquierda y el lugar y la jornada a la derecha. Más
 * angosta, una columna.
 */
export function TarjetaOferta({
  variante = "compacta",
  href,
  titulo,
  empresa,
  rubros,
  modalidad,
  lugar,
  descripcion,
  jornada,
  publicada,
  badges,
  textoAccion = "Ver oferta",
  accionExtra,
  className,
}: Props) {
  const icono = (
    <span aria-hidden="true" className="tarjeta-oferta-icono">
      <Briefcase size={22} strokeWidth={2} />
    </span>
  );
  const encabezado = <TituloEmpresa href={href} titulo={titulo} empresa={empresa} />;
  const etiquetas = <Etiquetas rubros={rubros} modalidad={modalidad} />;
  const fechaPublicada = publicada && <Publicada texto={publicada} />;
  const datos = (clase?: string) => <LugarJornada lugar={lugar} jornada={jornada} className={clase} />;
  const boton = (
    <span aria-hidden="true" className="btn-primario tarjeta-oferta-boton">
      {textoAccion}
    </span>
  );

  if (variante === "compacta") {
    return (
      <article
        className={cn(
          "tarjeta tarjeta-oferta tarjeta-oferta-compacta group flex h-full flex-col gap-3.5 p-6",
          className,
        )}
      >
        {icono}

        <div className="tarjeta-oferta-etiquetas flex flex-wrap items-center gap-2">
          {etiquetas}
          {badges}
          {publicada && <Publicada texto={publicada} className="ml-auto whitespace-nowrap" />}
        </div>

        {encabezado}

        {datos()}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1.5">
          {accionExtra && <div className="relative z-10">{accionExtra}</div>}
          {boton}
        </div>
      </article>
    );
  }

  const resumen = resumirDescripcion(descripcion);

  return (
    <article
      className={cn(
        "tarjeta tarjeta-oferta group @container flex h-full flex-col gap-3.5 p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-3.5 @md:flex-row @md:items-start @md:justify-between @md:gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {icono}
          {encabezado}
        </div>

        <div className="tarjeta-oferta-etiquetas flex min-w-0 flex-col gap-2 @md:max-w-[45cqw] @md:shrink-0 @md:items-end">
          <div className="flex max-w-full flex-wrap items-center gap-2 @md:justify-end">
            {etiquetas}
          </div>
          {(badges || publicada) && (
            <div className="flex max-w-full flex-wrap items-center gap-2 @md:justify-end">
              {badges}
              {fechaPublicada}
            </div>
          )}
        </div>
      </div>

      {resumen && (
        <p className="tarjeta-oferta-descripcion line-clamp-2 text-[15px] leading-normal text-muted-foreground">
          {resumen}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-3 pt-1.5 @md:flex-row @md:flex-wrap @md:items-center @md:justify-between">
        {datos("@md:order-last @md:ml-auto @md:justify-end")}

        <div className="flex flex-col gap-2 @md:flex-row @md:flex-wrap @md:items-center">
          {accionExtra && (
            <div className="relative z-10 flex flex-col @md:block">{accionExtra}</div>
          )}
          {boton}
        </div>
      </div>
    </article>
  );
}

function TituloEmpresa({ href, titulo, empresa }: { href: string; titulo: string; empresa: string | null }) {
  return (
    <div className="min-w-0">
      <h3 className="line-clamp-2 text-xl leading-snug font-bold text-heading" title={titulo}>
        <Link
          href={href}
          className="rounded-[var(--radius-xl)] outline-none group-hover:text-primary after:absolute after:inset-0 after:rounded-[var(--radius-xl)]"
        >
          {titulo}
        </Link>
      </h3>
      {empresa && (
        <p className="mt-1 truncate text-[15px] font-semibold text-texto-bajada" title={empresa}>
          {empresa}
        </p>
      )}
    </div>
  );
}

function Etiquetas({ rubros, modalidad }: { rubros: string[]; modalidad: string }) {
  const [rubro, ...otrosRubros] = rubros;
  return (
    <>
      {rubro && (
        <EtiquetaRubro verde className="tarjeta-oferta-rubro" title={rubros.join(", ")}>
          <span className="min-w-0 truncate">{rubro}</span>
          {otrosRubros.length > 0 && <span className="shrink-0">+{otrosRubros.length}</span>}
        </EtiquetaRubro>
      )}
      <EtiquetaRubro className="whitespace-nowrap">{modalidad}</EtiquetaRubro>
    </>
  );
}

function Publicada({ texto, className }: { texto: string; className?: string }) {
  return (
    <span className={cn("flex items-center gap-1.5 text-[13px] text-muted-foreground", className)}>
      <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
      {texto}
    </span>
  );
}

function LugarJornada({
  lugar,
  jornada,
  className,
}: {
  lugar: string;
  jornada?: string | null;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground", className)}>
      <li className="flex min-w-0 items-center gap-1.5">
        <MapPin className="size-4 shrink-0" aria-hidden="true" />
        <span className="sr-only">Lugar: </span>
        <span className="truncate">{lugar}</span>
      </li>
      {jornada && (
        <li className="flex items-center gap-1.5">
          <Clock className="size-4 shrink-0" aria-hidden="true" />
          <span className="sr-only">Jornada: </span>
          {jornada}
        </li>
      )}
    </ul>
  );
}

/**
 * La descripción en un solo renglón lógico: saltos de línea y espacios de más
 * como un espacio. El corte visible es el line-clamp; el tope de caracteres
 * solo evita mandar la descripción completa al navegador (sobra para dos
 * renglones en la tarjeta más ancha).
 */
const LARGO_RESUMEN = 400;

function resumirDescripcion(descripcion: string | null | undefined): string {
  const texto = (descripcion ?? "").replace(/\s+/g, " ").trim();
  return texto.length > LARGO_RESUMEN ? texto.slice(0, LARGO_RESUMEN) : texto;
}
