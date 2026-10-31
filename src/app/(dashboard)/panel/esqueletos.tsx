import { cn } from "@/lib/utils";
import { Esqueleto } from "@/components/ui/esqueleto";
import {
  CLASE_CUADRO_ESTADO,
  CLASE_GRILLA_CUADROS,
  claseCeldaCuadro,
} from "@/components/ui/cuadro-estado";

// Misma forma que cada bloque de /panel: los usan los Suspense de la página y
// loading.tsx.

// La grilla y el cuadro de estado son los del componente compartido con el
// panel de la empresa.
export const CLASE_GRILLA_INDICADORES = CLASE_GRILLA_CUADROS;
export const claseCuadroIndicador = claseCeldaCuadro;

/** "Ofertas para vos": la misma grilla que /ofertas (job-directory), con dos columnas como máximo. */
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
          <EsqueletoTarjetaDetallada key={i} className={i === 1 ? "hidden @xl:flex" : undefined} />
        ))}
      </div>
    </div>
  );
}

/**
 * La forma de TarjetaOferta "detallada": ícono, título y empresa arriba a la
 * izquierda; etiquetas arriba a la derecha; dos renglones de descripción;
 * abajo el botón a la izquierda y el lugar a la derecha. Desde @md, como la
 * tarjeta.
 */
function EsqueletoTarjetaDetallada({ className }: { className?: string }) {
  return (
    <div className={cn("tarjeta @container flex flex-col gap-3.5 p-6", className)}>
      <div className="flex flex-col gap-3.5 @md:flex-row @md:items-start @md:justify-between @md:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Esqueleto className="size-11 shrink-0 rounded-xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
            <Esqueleto className="h-6 w-3/4" />
            <Esqueleto className="h-4 w-1/2" />
          </div>
        </div>
        <div className="flex gap-2 @md:flex-col @md:items-end">
          <Esqueleto className="h-7 w-24 rounded-full" />
          <Esqueleto className="h-7 w-28 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Esqueleto className="h-4 w-full" />
        <Esqueleto className="h-4 w-4/5" />
      </div>
      <div className="mt-auto flex flex-col gap-3 pt-1.5 @md:flex-row-reverse @md:items-center @md:justify-between">
        <Esqueleto className="h-4 w-40" />
        <Esqueleto className="h-11 w-32 rounded-[var(--radius-md)]" />
      </div>
    </div>
  );
}
