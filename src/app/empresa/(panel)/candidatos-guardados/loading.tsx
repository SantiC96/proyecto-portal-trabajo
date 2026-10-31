import { ContenedorEsqueleto, EncabezadoEsqueleto } from "@/components/ui/esqueleto";
import { EsqueletoGuardados } from "./esqueleto";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex flex-col gap-6">
      <EncabezadoEsqueleto
        volver="/empresa"
        className="-mt-2"
        titulo="Candidatos guardados"
        bajada="Perfiles que guardaste para futuras búsquedas."
      />
      <EsqueletoGuardados />
    </ContenedorEsqueleto>
  );
}
