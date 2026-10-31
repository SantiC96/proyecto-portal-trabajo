import { Calendar } from "lucide-react";
import { Esqueleto, GraficoEsqueleto, NumerosEsqueleto } from "@/components/ui/esqueleto";
import { cn } from "@/lib/utils";

/**
 * El selector de período sobre la banda (SelectorPeriodoDesplegable `enBanda`)
 * mientras carga: el rótulo real y el botón blanco de 48 px con el período en gris.
 */
export function SelectorPeriodoEsqueleto() {
  return (
    <div aria-hidden="true" className="w-full sm:w-auto">
      <span className="mb-1.5 block text-[13px] font-semibold text-primary-foreground">Período</span>
      <div className="flex h-12 w-full items-center gap-2.5 rounded-[var(--radius-lg)] bg-surface px-4 sm:w-auto sm:min-w-[232px]">
        <Calendar className="size-5 shrink-0 text-primary" />
        <Esqueleto className="h-4 flex-1" />
      </div>
    </div>
  );
}

/** Cuatro tarjetas de número (GrillaNumeros). */
export function EsqueletoNumeros() {
  return <NumerosEsqueleto cantidad={4} />;
}

/** Una tarjeta de gráfico. */
export function EsqueletoGrafico({
  tipo = "dona",
  className,
}: {
  tipo?: "dona" | "barras" | "area";
  className?: string;
}) {
  return <GraficoEsqueleto tipo={tipo} className={cn("h-[380px]", className)} />;
}
