import { ContenedorEsqueleto, EncabezadoEsqueleto } from "@/components/ui/esqueleto";
import { AccionesPanel } from "./bloques";
import {
  ColumnasPanel,
  EsqueletoIndicadores,
  EsqueletoMovimientos,
  EsqueletoOfertas,
  EsqueletoPerfil,
} from "./esqueletos";

export default function Loading() {
  return (
    <ContenedorEsqueleto className="flex flex-col gap-7">
      <EncabezadoEsqueleto
        volver="/"
        className="-mt-3"
        bajada="Este es el resumen de tus postulaciones."
        acciones={<AccionesPanel />}
      />
      <EsqueletoIndicadores />
      <ColumnasPanel>
        <EsqueletoMovimientos />
        <EsqueletoPerfil />
      </ColumnasPanel>
      <EsqueletoOfertas />
    </ContenedorEsqueleto>
  );
}
