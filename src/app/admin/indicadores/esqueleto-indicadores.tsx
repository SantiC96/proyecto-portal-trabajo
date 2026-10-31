import { Esqueleto } from "@/components/ui/esqueleto";
import { EsqueletoGrafico } from "@/components/indicadores/esqueletos";

const RADIO = "rounded-[var(--radius-indicador)]";

/** Tarjeta de tendencia (fila de arriba): ícono y nombre, el número con su línea y la variación. */
function TendenciaEsqueleto() {
  return (
    <div aria-hidden="true" className={`tarjeta flex h-[172px] flex-col p-5 ${RADIO}`}>
      <div className="flex items-center gap-3">
        <Esqueleto className="size-[46px] shrink-0 rounded-[13px]" />
        <Esqueleto className="h-5 w-32" />
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <Esqueleto className="h-[38px] w-20" />
        <Esqueleto className="h-10 w-24" />
      </div>
      <Esqueleto className="mt-auto h-4 w-40" />
    </div>
  );
}

/** Misma estructura que el contenido de /admin/indicadores. */
export function EsqueletoIndicadores() {
  return (
    <div className="flex flex-col gap-4 lg:gap-6" aria-busy="true">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <TendenciaEsqueleto key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-[1.85fr_1fr]">
        <EsqueletoGrafico tipo="area" className={`h-[440px] ${RADIO}`} />
        <EsqueletoGrafico tipo="dona" className={`h-[440px] ${RADIO}`} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-[1fr_1.3fr_0.95fr]">
        <EsqueletoGrafico tipo="barras" className={`h-[400px] ${RADIO}`} />
        <EsqueletoGrafico tipo="barras" className={`h-[400px] ${RADIO}`} />
        <EsqueletoGrafico tipo="barras" className={`h-[400px] ${RADIO}`} />
      </div>
    </div>
  );
}
