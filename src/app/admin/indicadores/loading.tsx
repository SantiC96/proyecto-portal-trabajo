import { ContenedorEsqueleto, EncabezadoEsqueleto } from "@/components/ui/esqueleto";
import { SelectorPeriodoEsqueleto } from "@/components/indicadores/esqueletos";
import { EsqueletoIndicadores } from "./esqueleto-indicadores";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex flex-col gap-6">
      <EncabezadoEsqueleto
        volver="/admin"
        className="-mt-2"
        titulo="Indicadores"
        bajada="Cómo viene funcionando el Portal de Empleo, para informar al municipio."
        acciones={<SelectorPeriodoEsqueleto />}
      />
      <EsqueletoIndicadores />
    </ContenedorEsqueleto>
  );
}
