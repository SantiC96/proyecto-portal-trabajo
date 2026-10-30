import { Esqueleto, EsqueletoTitulo } from "@/components/ui/esqueleto";
import { EsqueletoGrafico } from "@/components/indicadores/esqueletos";

const RADIO = "rounded-[var(--radius-indicador)]";

/** Encabezado de /admin/indicadores: título grande, bajada y el selector de período. */
export function EsqueletoEncabezadoIndicadoresOficina() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <EsqueletoTitulo />
        <Esqueleto className="h-4 w-80 max-w-full" />
      </div>
      <Esqueleto className="h-[50px] w-full rounded-[var(--radius-xl)] sm:w-[232px]" />
    </div>
  );
}

/** Misma estructura que el contenido de /admin/indicadores. */
export function EsqueletoIndicadores() {
  return (
    <div className="flex flex-col gap-4 lg:gap-6" aria-busy="true" aria-label="Cargando indicadores">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Esqueleto key={i} className={`h-[172px] ${RADIO}`} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-[1.85fr_1fr]">
        <EsqueletoGrafico className={`h-[440px] ${RADIO}`} />
        <EsqueletoGrafico className={`h-[440px] ${RADIO}`} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-[1fr_1.3fr_0.95fr]">
        <EsqueletoGrafico className={`h-[400px] ${RADIO}`} />
        <EsqueletoGrafico className={`h-[400px] ${RADIO}`} />
        <EsqueletoGrafico className={`h-[400px] ${RADIO}`} />
      </div>
    </div>
  );
}
