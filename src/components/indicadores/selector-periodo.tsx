import Link from "next/link";
import { PERIODOS, hrefPeriodo, type Periodo } from "@/lib/indicadores-periodo";
import { cn } from "@/lib/utils";

const ETIQUETA: Record<Periodo, string> = {
  "30d": "Últimos 30 días",
  "90d": "Últimos 90 días",
  anio: "Este año",
  todo: "Todo",
};

/**
 * Control segmentado del período de los indicadores. Cada opción es un link
 * (el período vive en la URL, ?periodo=); la elegida va en blanco con texto
 * verde y se marca con aria-current, porque aria-pressed no es válido en un
 * link. En el celular ocupa todo el ancho, en dos filas.
 */
export function SelectorPeriodo({
  ruta,
  periodo,
  className,
}: {
  ruta: string;
  periodo: Periodo;
  className?: string;
}) {
  return (
    <nav
      aria-label="Período"
      className={cn(
        "grid w-full grid-cols-2 gap-1 rounded-[var(--radius-lg)] bg-secondary-hover p-1 sm:inline-flex sm:w-auto",
        className,
      )}
    >
      {PERIODOS.map((p) => {
        const activo = p === periodo;
        return (
          <Link
            key={p}
            href={hrefPeriodo(ruta, p)}
            scroll={false}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-3.5 text-center text-sm leading-tight font-bold whitespace-nowrap no-underline outline-none transition-colors duration-150 focus-visible:shadow-[var(--sombra-foco)] sm:min-h-10",
              activo
                ? "bg-surface text-primary shadow-[0_1px_3px_rgb(15_42_27/0.12)]"
                : "text-control-foreground hover:bg-surface/60 hover:text-primary",
            )}
          >
            {ETIQUETA[p]}
          </Link>
        );
      })}
    </nav>
  );
}
