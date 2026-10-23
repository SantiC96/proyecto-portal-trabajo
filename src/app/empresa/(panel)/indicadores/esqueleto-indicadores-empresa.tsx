import { EsqueletoGrafico, EsqueletoNumeros } from "@/components/indicadores/esqueletos";

/** Misma estructura que el contenido de /empresa/indicadores. */
export function EsqueletoIndicadoresEmpresa() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando indicadores">
      <EsqueletoNumeros />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <EsqueletoGrafico />
        <EsqueletoGrafico />
      </div>
      <EsqueletoGrafico className="h-[420px]" />
    </div>
  );
}
