import {
  ContenedorEsqueleto,
  EncabezadoEsqueleto,
  Esqueleto,
  PastillasEsqueleto,
} from "@/components/ui/esqueleto";
import { PESTANAS_COMPROBANTES } from "@/lib/admin/filtro-comprobantes";
import { LABEL_PESTANA } from "./listado";
import { EsqueletoComprobantes } from "./esqueleto";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex flex-col gap-6">
      <EncabezadoEsqueleto
        volver="/admin"
        className="-mt-2"
        botonesBlancos
        titulo="Comprobantes de domicilio"
        bajada="Al aprobarlo, el postulante pasa a «De Funes verificado»."
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <PastillasEsqueleto etiquetas={PESTANAS_COMPROBANTES.map((p) => LABEL_PESTANA[p])} />
        <Esqueleto className="h-4 w-28 shrink-0" />
      </div>
      <EsqueletoComprobantes />
    </ContenedorEsqueleto>
  );
}
