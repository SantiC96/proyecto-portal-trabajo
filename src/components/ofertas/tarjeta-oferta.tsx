import type { ReactNode } from "react";
import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { EtiquetaRubro } from "@/components/ui/etiqueta-rubro";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  titulo: string;
  empresa: string | null;
  /** Se muestra el primero en verde y "+N" si hay más. */
  rubros: string[];
  modalidad: string;
  lugar: string;
  /** Las ofertas recomendadas no traen la jornada: sin dato no se muestra. */
  jornada?: string | null;
  /** Badges junto a las etiquetas ("Te invitaron", coincidencia). */
  badges?: ReactNode;
  /** Texto del botón que lleva a la oferta. */
  textoAccion?: string;
  accionPrimaria?: boolean;
  /** Otra acción con su propio link (por ejemplo "Buscar postulantes"). */
  accionExtra?: ReactNode;
  className?: string;
};

/**
 * Tarjeta de oferta del inicio y del panel. El título es el link y cubre toda
 * la tarjeta (un solo paso de teclado por oferta); el botón de abajo es solo
 * visual y lleva al mismo lugar. `accionExtra` queda por encima y es su propio link.
 */
export function TarjetaOferta({
  href,
  titulo,
  empresa,
  rubros,
  modalidad,
  lugar,
  jornada,
  badges,
  textoAccion = "Ver oferta",
  accionPrimaria = false,
  accionExtra,
  className,
}: Props) {
  const [rubro, ...otrosRubros] = rubros;

  return (
    <article
      className={cn(
        "tarjeta tarjeta-clickeable group relative flex h-full flex-col gap-3.5 p-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {rubro && (
          <EtiquetaRubro verde title={rubros.join(", ")}>
            <span className="min-w-0 truncate">{rubro}</span>
            {otrosRubros.length > 0 && <span className="shrink-0">+{otrosRubros.length}</span>}
          </EtiquetaRubro>
        )}
        <EtiquetaRubro className="whitespace-nowrap">{modalidad}</EtiquetaRubro>
        {badges}
      </div>

      <div>
        <h3 className="line-clamp-2 text-xl leading-snug font-bold text-heading" title={titulo}>
          <Link
            href={href}
            className="rounded-[var(--radius-xl)] outline-none group-hover:text-primary after:absolute after:inset-0 after:rounded-[var(--radius-xl)] focus-visible:after:shadow-[var(--sombra-foco)]"
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

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
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

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1.5">
        {accionExtra && <div className="relative z-10">{accionExtra}</div>}
        <span aria-hidden="true" className={accionPrimaria ? "btn-primario" : "btn-secundario"}>
          {textoAccion}
        </span>
      </div>
    </article>
  );
}
