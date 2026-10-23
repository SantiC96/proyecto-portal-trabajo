import { EsqueletoGrafico, EsqueletoNumeros } from "@/components/indicadores/esqueletos";

/** Misma estructura que el contenido de /admin/indicadores. */
export function EsqueletoIndicadores() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando indicadores">
      <EsqueletoNumeros />
      <EsqueletoGrafico />
      <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-3">
        <EsqueletoGrafico className="h-[460px]" />
        <EsqueletoGrafico className="h-[460px]" />
        <EsqueletoGrafico className="h-[460px]" />
      </div>
      <EsqueletoGrafico className="h-[220px]" />
    </div>
  );
}
