import { ChevronRight } from "lucide-react";
import { Esqueleto, EsqueletoEnLinea, LineaBanda } from "@/components/ui/esqueleto";

/**
 * Lista de TarjetaCurso mientras carga, con sus medidas: el cuadrado de 40 px
 * en verde claro, el nombre (17 px) con el badge de 26 px al lado, la fecha
 * (14 px, a 4 px), la descripción en una línea (15 px, a 10 px) y la pista
 * real ("Ver curso ›") a la derecha; abajo en el celular.
 */
export function EsqueletoCursos({ cantidad = 3, pista }: { cantidad?: number; pista: string }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3 sm:gap-4">
      {Array.from({ length: cantidad }, (_, i) => (
        <div
          key={i}
          className="tarjeta tarjeta-panel grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4"
        >
          <span className="size-10 shrink-0 animate-pulse rounded-[11px] bg-primary/15 motion-reduce:animate-none" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <p className="w-48 max-w-full text-[17px] leading-snug">
                <EsqueletoEnLinea className="w-full" />
              </p>
              <Esqueleto className="h-[26px] w-24 rounded-full" />
            </div>
            <p className="mt-1 text-sm">
              <EsqueletoEnLinea className="w-36" />
            </p>
            <p className="mt-2.5 text-[15px] leading-normal">
              <EsqueletoEnLinea className="w-4/5" />
            </p>
          </div>
          <span className="col-start-2 inline-flex items-center gap-1 text-[15px] font-bold whitespace-nowrap text-primary sm:col-start-3 sm:row-start-1 sm:self-center">
            {pista}
            <ChevronRight className="size-4" />
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * La franja verde de Mis cursos ("N cursos completados") mientras carga: el
 * cuadrado del ícono y el número en blanco semitransparente, el rótulo real.
 */
export function EsqueletoResumenCursos() {
  return (
    <div aria-hidden="true" className="banda-resumen flex items-center gap-4">
      <LineaBanda className="size-14 shrink-0 rounded-2xl" />
      <p className="flex flex-col">
        <LineaBanda className="block h-[34px] w-10" />
        <span className="mt-1 text-[15px] font-semibold text-sidebar-texto">cursos completados</span>
      </p>
    </div>
  );
}

/** Mis cursos mientras carga: la franja del resumen y las tarjetas. */
export function EsqueletoMisCursos() {
  return (
    <div className="flex flex-col gap-6">
      <EsqueletoResumenCursos />
      <EsqueletoCursos pista="Ver curso" />
    </div>
  );
}
