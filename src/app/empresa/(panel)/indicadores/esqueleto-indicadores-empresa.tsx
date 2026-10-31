import { EsqueletoGrafico, EsqueletoNumeros } from "@/components/indicadores/esqueletos";

/** Misma estructura que el contenido de /empresa/indicadores: números, dos donas y las barras por oferta. */
export function EsqueletoIndicadoresEmpresa() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <EsqueletoNumeros />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <EsqueletoGrafico tipo="dona" />
        <EsqueletoGrafico tipo="dona" />
      </div>
      <EsqueletoGrafico tipo="barras" className="h-[420px]" />
    </div>
  );
}
