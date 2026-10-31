import {
  ContenedorEsqueleto,
  DetalleEsqueleto,
  Esqueleto,
  TarjetaEsqueleto,
} from "@/components/ui/esqueleto";
import { BotonVolver } from "@/components/ui/boton-volver";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="w-full">
      <BotonVolver href="/empresa/ofertas" destacado />

      <div aria-hidden="true" className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Esqueleto className="size-[72px] shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <Esqueleto className="my-[3px] h-[26px] w-56 max-w-full sm:h-8" />
              <Esqueleto className="h-7 w-28 rounded-full" />
            </div>
            <Esqueleto className="h-4 w-72 max-w-full" />
          </div>
        </div>
        <Esqueleto className="h-11 w-full shrink-0 rounded-[var(--radius-md)] sm:w-36" />
      </div>

      <DetalleEsqueleto
        className="mt-8"
        lateralEnCelular="al-final"
        principal={
          <>
            <TarjetaEsqueleto titulo="Contacto" icono={false} panel={false} lineas={3} />
            <TarjetaEsqueleto icono={false} panel={false} lineas={4} />
          </>
        }
        lateral={<TarjetaEsqueleto titulo="Gestión" icono={false} panel={false} lineas={5} />}
        debajo={<Esqueleto className="h-11 w-full rounded-[var(--radius-md)] sm:w-52" />}
      />
    </ContenedorEsqueleto>
  );
}
