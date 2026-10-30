import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Acceso a otra sección desde un panel (toda la tarjeta es un link): ícono en
 * un cuadrado verde de 44 px, título de 17 px 800, descripción de 14 px y
 * chevron. En hover, el borde se pone verde; con `elevable` (panel de la
 * empresa), sube 2 px con sombra.
 */
export function TarjetaAcceso({
  href,
  icono,
  titulo,
  descripcion,
  detalle,
  claseIcono = "bg-primary text-primary-foreground",
  elevable = false,
}: {
  href: string;
  icono: ReactNode;
  titulo: string;
  descripcion: string;
  /** Un dato extra debajo de la descripción (cursos activos, postulantes registrados). */
  detalle?: string;
  /** Fondo y color del cuadrado del ícono. */
  claseIcono?: string;
  elevable?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "tarjeta flex h-full items-center gap-4 p-5 no-underline outline-none focus-visible:shadow-[var(--sombra-foco)]",
        elevable
          ? "tarjeta-clickeable"
          : "transition-colors duration-150 hover:border-primary",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-[var(--radius-lg)]",
          claseIcono,
        )}
      >
        {icono}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] leading-snug font-extrabold text-heading">{titulo}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{descripcion}</span>
        {detalle && (
          <span className="mt-1 block text-[13px] font-semibold text-muted-foreground-strong">
            {detalle}
          </span>
        )}
      </span>
      <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-icon" />
    </Link>
  );
}
