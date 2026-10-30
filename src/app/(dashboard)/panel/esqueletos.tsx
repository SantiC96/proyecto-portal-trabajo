import { cn } from "@/lib/utils";
import { Esqueleto, EsqueletoTarjeta } from "@/components/ui/esqueleto";

// Misma forma que cada bloque de /panel: los usan los Suspense de la página y
// loading.tsx.

/**
 * Grilla de los cinco cuadros de estado, sin huecos en ningún ancho:
 * en celular 2 por fila y el último a todo el ancho; desde 672 px, 3 arriba
 * y 2 abajo (sobre 6 columnas); desde 1024 px, los cinco en una fila.
 */
export const CLASE_GRILLA_INDICADORES = "grid grid-cols-2 gap-4 @2xl:grid-cols-6 @5xl:grid-cols-5";

export function claseCuadroIndicador(indice: number): string {
  if (indice < 3) return "@2xl:col-span-2 @5xl:col-span-1";
  if (indice === 3) return "@2xl:col-span-3 @5xl:col-span-1";
  return "col-span-2 @2xl:col-span-3 @5xl:col-span-1";
}

/** Cuadro de estado: tarjeta con un filete superior de 4 px (el color va en `before:bg-*`). */
export const CLASE_CUADRO_ESTADO =
  "tarjeta tarjeta-panel relative flex h-full min-w-0 flex-col gap-3 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1";

/** "Ofertas para vos": dos columnas como máximo, para que las tarjetas respiren. */
export const CLASE_GRILLA_OFERTAS = "grid grid-cols-1 gap-4 @xl:grid-cols-2";

export const CANTIDAD_INDICADORES = 5;

export function EsqueletoIndicadores() {
  return (
    <div aria-busy="true" aria-label="Cargando tus indicadores" className="@container">
      <div className={CLASE_GRILLA_INDICADORES}>
        {Array.from({ length: CANTIDAD_INDICADORES }, (_, i) => (
          <div
            key={i}
            className={cn(CLASE_CUADRO_ESTADO, "before:bg-secondary-hover", claseCuadroIndicador(i))}
          >
            <Esqueleto className="size-10 rounded-[11px]" />
            <Esqueleto className="h-[38px] w-12" />
            <Esqueleto className="h-4 w-24 max-w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EsqueletoTituloBloque({ ancho }: { ancho: string }) {
  return (
    <div className="flex items-center gap-3">
      <Esqueleto className="size-10 shrink-0 rounded-[11px]" />
      <Esqueleto className={cn("h-6", ancho)} />
    </div>
  );
}

export function EsqueletoMovimientos() {
  return (
    <div aria-busy="true" aria-label="Cargando tus últimos movimientos" className="tarjeta tarjeta-panel">
      <EsqueletoTituloBloque ancho="w-48" />
      <div className="mt-5 flex flex-col gap-5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-start gap-3.5">
            <Esqueleto className="size-11 shrink-0 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Esqueleto className="h-4 w-3/4" />
              <Esqueleto className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EsqueletoPerfil() {
  return (
    <div aria-busy="true" aria-label="Cargando tu perfil" className="tarjeta tarjeta-panel flex flex-col gap-5">
      <EsqueletoTituloBloque ancho="w-44" />
      <div className="flex items-center gap-4">
        <Esqueleto className="size-24 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Esqueleto className="h-4 w-full" />
          <Esqueleto className="h-4 w-2/3" />
        </div>
      </div>
      {Array.from({ length: 4 }, (_, i) => (
        <Esqueleto key={i} className="h-4 w-2/3" />
      ))}
    </div>
  );
}

/**
 * Movimientos y perfil, en dos columnas desde 768 px de ancho disponible. Las
 * dos tarjetas terminan a la misma altura: la más corta crece con su contenido arriba.
 */
export function ColumnasPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="@container">
      <div className="grid grid-cols-1 items-stretch gap-7 @3xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {children}
      </div>
    </div>
  );
}

export function EsqueletoOfertas() {
  return (
    <div aria-busy="true" aria-label="Cargando ofertas para vos" className="@container">
      <EsqueletoTituloBloque ancho="w-44" />
      <div className={cn("mt-5", CLASE_GRILLA_OFERTAS)}>
        {Array.from({ length: 2 }, (_, i) => (
          <EsqueletoTarjeta key={i} className={i === 1 ? "hidden p-6 @xl:block" : "p-6"} />
        ))}
      </div>
    </div>
  );
}
