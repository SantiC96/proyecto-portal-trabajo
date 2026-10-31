import { cn } from "@/lib/utils";
import {
  CuadrosEsqueleto,
  Esqueleto,
  EsqueletoEnLinea,
  TarjetaOfertaEsqueleto,
  TituloBloqueEsqueleto,
} from "@/components/ui/esqueleto";
import { ETIQUETA_FILTRO, FILTROS_MIS_POSTULACIONES } from "@/lib/mis-postulaciones";
import { CLASE_GRILLA_CUADROS, claseCeldaCuadro } from "@/components/ui/cuadro-estado";
import { CANTIDAD_MOVIMIENTOS } from "@/lib/postulante/panel";

// Ítems de "Completá tu perfil" (obtenerCompletitudPerfil): datos, foto,
// experiencia, disponibilidad, procedencia, rubros y CV.
const ITEMS_PERFIL = 7;

// Misma forma que cada bloque de /panel: los usan los Suspense de la página y
// loading.tsx.

// La grilla y el cuadro de estado son los del componente compartido con el
// panel de la empresa.
export const CLASE_GRILLA_INDICADORES = CLASE_GRILLA_CUADROS;
export const claseCuadroIndicador = claseCeldaCuadro;

/** "Ofertas para vos": la misma grilla que /ofertas (job-directory), con dos columnas como máximo. */
export const CLASE_GRILLA_OFERTAS = "grid grid-cols-1 gap-4 @xl:grid-cols-2";

export function EsqueletoIndicadores() {
  return (
    <CuadrosEsqueleto etiquetas={FILTROS_MIS_POSTULACIONES.map((f) => ETIQUETA_FILTRO[f])} />
  );
}

/**
 * "Últimos movimientos": hasta CANTIDAD_MOVIMIENTOS eventos de LineaDeTiempo
 * con el ícono de 44 px, el título, el detalle y la hora (15 y 13 px) y el
 * badge a la derecha desde 28 rem.
 */
export function EsqueletoMovimientos() {
  return (
    <div aria-busy="true" className="tarjeta tarjeta-panel @container">
      <TituloBloqueEsqueleto titulo="Últimos movimientos" />
      <div aria-hidden="true" className="mt-5 flex flex-col">
        {Array.from({ length: CANTIDAD_MOVIMIENTOS }, (_, i) => (
          <div key={i} className="flex gap-3.5 pb-5 last:pb-0">
            <Esqueleto className="size-11 shrink-0 rounded-xl" />
            <div className="flex min-w-0 flex-1 flex-col items-start gap-2 @md:flex-row @md:justify-between @md:gap-4">
              <div className="w-full min-w-0 text-[15px] leading-[1.45]">
                <p>
                  <EsqueletoEnLinea className="w-3/4" />
                </p>
                <p className="mt-0.5">
                  <EsqueletoEnLinea className="w-1/2" />
                </p>
                <p className="text-[13px]">
                  <EsqueletoEnLinea className="w-20" />
                </p>
              </div>
              <Esqueleto className="h-[26px] w-28 shrink-0 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * "Completá tu perfil": el título depende de los datos; el anillo de 96 px y
 * el texto fijo real; los siete ítems de 44 px y el botón.
 */
export function EsqueletoPerfil() {
  return (
    <div aria-busy="true" className="tarjeta tarjeta-panel flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Esqueleto className="size-10 shrink-0 rounded-[11px]" />
        <Esqueleto className="h-6 w-44" />
      </div>
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="size-24 shrink-0 animate-pulse rounded-full border-[10px] border-secondary-hover motion-reduce:animate-none"
        />
        <p className="min-w-0 text-[15px] leading-[1.45] text-muted-foreground">
          Los perfiles completos y con domicilio verificado en Funes tienen prioridad en la Oficina
          de Empleo.
        </p>
      </div>
      <div aria-hidden="true" className="flex flex-col gap-1.5">
        {Array.from({ length: ITEMS_PERFIL }, (_, i) => (
          <div key={i} className="flex min-h-11 items-center gap-2.5 px-3">
            <Esqueleto className="size-5 shrink-0 rounded-full" />
            <Esqueleto className={cn("h-4", i % 2 ? "w-2/3" : "w-1/2")} />
          </div>
        ))}
      </div>
      <Esqueleto className="mt-auto h-11 w-40 rounded-[var(--radius-md)]" />
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
    <div aria-busy="true" className="@container">
      <TituloBloqueEsqueleto titulo="Ofertas para vos" bajadaVariable />
      <div className={cn("mt-5", CLASE_GRILLA_OFERTAS)}>
        {Array.from({ length: 2 }, (_, i) => (
          <TarjetaOfertaEsqueleto key={i} className={i === 1 ? "hidden @xl:flex" : undefined} />
        ))}
      </div>
    </div>
  );
}
