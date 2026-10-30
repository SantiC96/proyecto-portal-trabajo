import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
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
      <EncabezadoPagina
        banda
        titulo={
          <>
            <span className="sr-only">Panel</span>
            <span
              aria-hidden="true"
              className="inline-block h-[38px] w-56 max-w-full animate-pulse rounded-md bg-primary-foreground/20 align-middle sm:h-[52px]"
            />
          </>
        }
        bajada="Este es el resumen de tus postulaciones."
        acciones={<AccionesPanel />}
      />
      <EsqueletoIndicadores />
      <ColumnasPanel>
        <EsqueletoMovimientos />
        <EsqueletoPerfil />
      </ColumnasPanel>
      <EsqueletoOfertas />
    </div>
  );
}
