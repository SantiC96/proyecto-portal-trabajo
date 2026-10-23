import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tarjeta de trabajo pendiente del panel (toda la tarjeta es un link): ícono
 * en un cuadrado verde, la cantidad en una pastilla (amarilla si hay
 * pendientes, gris si no), el título y la acción con flecha.
 */
export function TarjetaPendiente({
  href,
  icono: Icono,
  titulo,
  accion,
  cantidad,
  className,
}: {
  href: string;
  icono: LucideIcon;
  titulo: string;
  /** Texto del link de abajo: "Revisar postulaciones". */
  accion: string;
  cantidad: number;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "tarjeta flex h-full flex-col gap-3.5 p-5 no-underline outline-none transition-colors duration-150 hover:border-primary focus-visible:shadow-[var(--sombra-foco)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-lg)] bg-primary text-primary-foreground"
        >
          <Icono className="size-[22px]" />
        </span>
        <span
          role="img"
          aria-label={`${cantidad} ${cantidad === 1 ? "pendiente" : "pendientes"}`}
          className={cn(
            "inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-xl leading-none font-extrabold tabular-nums",
            cantidad > 0
              ? "bg-accent text-accent-foreground"
              : "bg-pastilla-gris text-texto-pestana",
          )}
        >
          {cantidad}
        </span>
      </div>
      <span className="text-[17px] leading-snug font-extrabold text-heading">{titulo}</span>
      <span className="mt-auto inline-flex items-center gap-1.5 text-[15px] font-bold text-primary">
        {accion}
        <ArrowRight aria-hidden="true" className="size-[18px]" />
      </span>
    </Link>
  );
}
