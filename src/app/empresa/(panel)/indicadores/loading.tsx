import { ContenedorEsqueleto, EncabezadoEsqueleto } from "@/components/ui/esqueleto";
import { SelectorPeriodoEsqueleto } from "@/components/indicadores/esqueletos";
import { EsqueletoIndicadoresEmpresa } from "./esqueleto-indicadores-empresa";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex flex-col gap-6">
      <EncabezadoEsqueleto
        volver="/empresa"
        className="-mt-2"
        titulo="Indicadores"
        bajada="Cómo les va a tus ofertas y a tus candidatos."
        acciones={<SelectorPeriodoEsqueleto />}
      />
      <EsqueletoIndicadoresEmpresa />
    </ContenedorEsqueleto>
  );
}
