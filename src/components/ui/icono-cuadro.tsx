import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TAMANO = {
  40: "size-10 rounded-[11px] [&_svg]:size-5",
  44: "size-11 rounded-xl [&_svg]:size-[22px]",
  56: "size-14 rounded-2xl [&_svg]:size-7",
} as const;

/**
 * Ícono blanco de lucide en un cuadrado de color (por defecto, `primary`):
 * títulos de sección, estados y movimientos del postulante. Es decorativo:
 * el texto de al lado dice lo mismo.
 */
export function IconoCuadro({
  icono: Icono,
  tamano = 40,
  className,
}: {
  icono: LucideIcon;
  tamano?: keyof typeof TAMANO;
  /** El fondo (`bg-info`, `bg-teal`…) y lo que haga falta. */
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center bg-primary text-primary-foreground",
        TAMANO[tamano],
        className,
      )}
    >
      <Icono />
    </span>
  );
}
