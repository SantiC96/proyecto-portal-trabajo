import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumero } from "@/components/indicadores/formato";
import { IconoCuadro } from "@/components/ui/icono-cuadro";

/**
 * Grilla de los cinco cuadros de estado de un panel (postulante y empresa),
 * sin huecos en ningún ancho: en celular 2 por fila y el último a todo el
 * ancho; desde 672 px, 3 arriba y 2 abajo (sobre 6 columnas); desde 1024 px,
 * los cinco en una fila. Va dentro de un `@container`.
 */
export const CLASE_GRILLA_CUADROS = "grid grid-cols-2 gap-4 @2xl:grid-cols-6 @5xl:grid-cols-5";

/** Clases del `li` de cada cuadro según su posición en la grilla de cinco. */
export function claseCeldaCuadro(indice: number): string {
  if (indice < 3) return "@2xl:col-span-2 @5xl:col-span-1";
  if (indice === 3) return "@2xl:col-span-3 @5xl:col-span-1";
  return "col-span-2 @2xl:col-span-3 @5xl:col-span-1";
}

/** Cuadro de estado: tarjeta con un filete superior de 4 px (el color va en `before:bg-*`). */
export const CLASE_CUADRO_ESTADO =
  "tarjeta tarjeta-panel relative flex h-full min-w-0 flex-col gap-3 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1";

/**
 * Cuadro de estado que lleva a la lista filtrada: ícono en un cuadrado del
 * color del estado y ChevronRight arriba, el número (38 px 800) y el nombre.
 */
export function CuadroEstado({
  href,
  etiqueta,
  etiquetaAccesible,
  valor,
  icono,
  claseIcono,
  claseFilete,
}: {
  href: string;
  etiqueta: string;
  /** Nombre accesible del link: "3 ofertas publicadas. Ver lista". */
  etiquetaAccesible: string;
  valor: number;
  icono: LucideIcon;
  /** Fondo del cuadrado del ícono (y el color del ícono si no va blanco). */
  claseIcono: string;
  /** Color del filete: `before:bg-*`. */
  claseFilete: string;
}) {
  return (
    <Link
      href={href}
      aria-label={etiquetaAccesible}
      className={cn(
        CLASE_CUADRO_ESTADO,
        "tarjeta-clickeable outline-none focus-visible:shadow-[var(--sombra-foco)]",
        claseFilete,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <IconoCuadro icono={icono} className={claseIcono} />
        <ChevronRight className="size-5 shrink-0 text-muted-icon" aria-hidden="true" />
      </div>
      <span className="text-[38px] leading-none font-extrabold break-all text-heading tabular-nums">
        {formatNumero(valor)}
      </span>
      <span className="text-sm leading-tight font-bold break-words hyphens-auto text-heading">
        {etiqueta}
      </span>
    </Link>
  );
}
