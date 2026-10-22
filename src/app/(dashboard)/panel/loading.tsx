import { Esqueleto } from "@/components/ui/esqueleto";
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
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Esqueleto className="h-9 w-56" />
          <Esqueleto className="mt-3 h-4 w-72 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-3">
          <AccionesPanel />
        </div>
      </div>
      <EsqueletoIndicadores />
      <ColumnasPanel>
        <EsqueletoMovimientos />
        <EsqueletoPerfil />
      </ColumnasPanel>
      <EsqueletoOfertas />
    </div>
  );
}
