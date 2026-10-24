import { Esqueleto, EsqueletoTitulo } from "@/components/ui/esqueleto";
import { cn } from "@/lib/utils";

/** Encabezado de una pantalla de indicadores: título, bajada y selector de período. */
export function EsqueletoEncabezadoIndicadores() {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="flex flex-col gap-2">
        <EsqueletoTitulo />
        <Esqueleto className="h-4 w-72 max-w-full" />
      </div>
      <Esqueleto className="h-24 w-full rounded-[var(--radius-lg)] sm:h-12 sm:w-[480px]" />
    </div>
  );
}

/** Cuatro tarjetas de número. */
export function EsqueletoNumeros() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Esqueleto key={i} className="h-[184px] rounded-[var(--radius-xl)]" />
      ))}
    </div>
  );
}

/** Una tarjeta de gráfico. */
export function EsqueletoGrafico({ className }: { className?: string }) {
  return <Esqueleto className={cn("h-[380px] rounded-[var(--radius-xl)]", className)} />;
}
