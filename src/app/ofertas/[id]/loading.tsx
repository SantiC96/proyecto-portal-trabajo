import { BotonVolver } from "@/components/ui/boton-volver";
import {
  ContenedorEsqueleto,
  DetalleEsqueleto,
  Esqueleto,
} from "@/components/ui/esqueleto";

const TARJETA = "tarjeta flex flex-col gap-4 px-4 py-[18px] sm:p-6";

function Renglones({ cantidad }: { cantidad: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      {Array.from({ length: cantidad }, (_, i) => (
        <Esqueleto key={i} className={i === cantidad - 1 ? "h-4 w-3/5" : "h-4 w-full"} />
      ))}
    </div>
  );
}

/** La misma forma que /ofertas/[id]: la oferta y la tarjeta lateral a la par; los textos debajo. */
export default function Loading() {
  return (
    <ContenedorEsqueleto como="main" className="flex-1">
      <BotonVolver href="/ofertas" destacado />
      <DetalleEsqueleto
        className="mt-4"
        separacion="gap-4 @4xl:gap-7"
        principal={
          <div aria-hidden="true" className={TARJETA}>
            <div className="flex items-start gap-4">
              <Esqueleto className="size-16 shrink-0 rounded-2xl" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Esqueleto className="h-7 w-3/4 sm:h-9" />
                <Esqueleto className="h-5 w-1/3" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Esqueleto className="h-7 w-24 rounded-full" />
              <Esqueleto className="h-7 w-20 rounded-full" />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
              <Esqueleto className="h-5 w-28" />
              <Esqueleto className="h-5 w-24" />
              <Esqueleto className="h-5 w-36" />
            </div>
          </div>
        }
        lateral={
          <div aria-hidden="true" className={TARJETA}>
            <Esqueleto className="h-6 w-40" />
            <Renglones cantidad={2} />
            <Esqueleto className="mt-auto h-11 w-full rounded-[var(--radius-md)]" />
          </div>
        }
        debajo={
          <div className="tarjeta flex flex-col gap-6 px-4 py-[18px] sm:p-6">
            <section className="flex flex-col gap-2.5">
              <h2 className="text-lg font-extrabold text-heading">Descripción</h2>
              <Renglones cantidad={4} />
            </section>
            <section className="flex flex-col gap-2.5">
              <h2 className="text-lg font-extrabold text-heading">Requisitos</h2>
              <Renglones cantidad={3} />
            </section>
          </div>
        }
      />
    </ContenedorEsqueleto>
  );
}
