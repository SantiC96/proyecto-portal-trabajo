import {
  ContenedorEsqueleto,
  DetalleEsqueleto,
  Esqueleto,
} from "@/components/ui/esqueleto";
import { BotonVolver } from "@/components/ui/boton-volver";

const TARJETA = "rounded-[var(--radius-lg)] border border-border bg-white p-5 shadow-xs";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="w-full">
      <BotonVolver href="/empresa/candidatos-guardados" />
      <Esqueleto className="mt-4 h-7 w-64 max-w-full sm:h-8" />

      <DetalleEsqueleto
        className="mt-8"
        lateralEnCelular="primero"
        principal={
          <>
            <div aria-hidden="true" className={TARJETA}>
              <Esqueleto className="h-5 w-40" />
              <div className="mt-3 flex flex-wrap gap-2">
                <Esqueleto className="h-7 w-24 rounded-full" />
                <Esqueleto className="h-7 w-32 rounded-full" />
              </div>
            </div>
            <div aria-hidden="true" className={TARJETA}>
              <Esqueleto className="h-5 w-48" />
              <div className="mt-4 flex flex-col gap-3">
                <Esqueleto className="h-4 w-full" />
                <Esqueleto className="h-4 w-4/5" />
                <Esqueleto className="h-4 w-3/5" />
              </div>
            </div>
          </>
        }
        lateral={
          <div className={TARJETA}>
            <Esqueleto className="size-[72px] rounded-full" />
            <p className="mt-5 font-semibold text-foreground">Datos de contacto</p>
            <div aria-hidden="true" className="mt-4 flex flex-col gap-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Esqueleto className="mt-0.5 size-4 shrink-0" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Esqueleto className="h-3 w-16" />
                    <Esqueleto className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        }
      />
    </ContenedorEsqueleto>
  );
}
