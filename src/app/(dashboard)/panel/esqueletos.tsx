import { cn } from "@/lib/utils";
import { Esqueleto, EsqueletoTarjeta } from "@/components/ui/esqueleto";

// Misma forma que cada bloque de /panel: los usan los Suspense de la página y
// loading.tsx.

/**
 * Grilla de los cinco cuadros de indicadores, sin huecos en ningún ancho:
 * en celular 2 por fila y el último a todo el ancho; desde 672 px, 3 arriba
 * y 2 abajo (sobre 6 columnas); desde 1024 px, los cinco en una fila.
 */
export const CLASE_GRILLA_INDICADORES = "grid grid-cols-2 gap-4 @2xl:grid-cols-6 @5xl:grid-cols-5";

export function claseCuadroIndicador(indice: number): string {
  if (indice < 3) return "@2xl:col-span-2 @5xl:col-span-1";
  if (indice === 3) return "@2xl:col-span-3 @5xl:col-span-1";
  return "col-span-2 @2xl:col-span-3 @5xl:col-span-1";
}

export const CANTIDAD_INDICADORES = 5;

export function EsqueletoIndicadores() {
  return (
    <div aria-busy="true" aria-label="Cargando tus indicadores" className="@container">
      <div className={CLASE_GRILLA_INDICADORES}>
        {Array.from({ length: CANTIDAD_INDICADORES }, (_, i) => (
          <div key={i} className={cn("tarjeta flex flex-col gap-2.5 p-5", claseCuadroIndicador(i))}>
            <Esqueleto className="h-[26px] w-24 rounded-[13px]" />
            <div className="@container">
              <div className="flex flex-col items-start gap-2.5 @[7.5rem]:flex-row @[7.5rem]:items-center @[7.5rem]:gap-3">
                <Esqueleto className="size-10 shrink-0 rounded-[var(--radius-md)]" />
                <Esqueleto className="h-9 w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EsqueletoMovimientos() {
  return (
    <div aria-busy="true" aria-label="Cargando tus últimos movimientos" className="tarjeta p-6">
      <Esqueleto className="h-6 w-48" />
      <div className="mt-4 flex flex-col gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Esqueleto className="size-10 shrink-0 rounded-full" />
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
    <div aria-busy="true" aria-label="Cargando tu perfil" className="tarjeta flex flex-col gap-4 p-6">
      <Esqueleto className="h-6 w-44" />
      <Esqueleto className="h-4 w-full" />
      <Esqueleto className="h-2.5 w-full rounded-[5px]" />
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
      <Esqueleto className="h-6 w-44" />
      <Esqueleto className="mt-2 h-4 w-64" />
      <div className="mt-5 grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <EsqueletoTarjeta
            key={i}
            className={i === 1 ? "hidden p-6 @xl:block" : i === 2 ? "hidden p-6 @4xl:block" : "p-6"}
          />
        ))}
      </div>
    </div>
  );
}
