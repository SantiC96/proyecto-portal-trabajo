import { Calendar, FileText } from "lucide-react";
import { Esqueleto, EsqueletoEnLinea } from "@/components/ui/esqueleto";

/**
 * La lista de Mis postulaciones mientras carga, con la tarjeta típica de
 * MisPostulacionesLista: el título (18 px, leading-snug) y la empresa; el
 * badge de 26 px, la fecha y el CV con sus íconos reales; la acción de 44 px
 * y debajo una franja de una línea (el aviso que suele aparecer). Cada línea
 * va dentro de un renglón con el mismo tamaño de letra que el real, así mide
 * lo mismo (un bloque suelto en un flex mediría solo su alto). Desde 768 px
 * de ancho disponible, las mismas tres columnas.
 */
export function EsqueletoMisPostulaciones({ filas = 3 }: { filas?: number }) {
  return (
    <div aria-hidden="true" className="@container">
      <div className="flex flex-col gap-4 @3xl:grid @3xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] @3xl:gap-x-6">
        {Array.from({ length: filas }, (_, i) => (
          <div
            key={i}
            className="tarjeta tarjeta-panel relative flex flex-col gap-4 overflow-hidden pl-[21px] before:absolute before:inset-y-0 before:left-0 before:w-[5px] before:bg-secondary-hover sm:pl-[29px] @3xl:col-span-full @3xl:grid @3xl:grid-cols-subgrid @3xl:items-center @3xl:gap-y-4"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-lg leading-snug">
                <EsqueletoEnLinea className="w-3/4" />
              </p>
              <p className="text-[15px]">
                <EsqueletoEnLinea className="w-1/2" />
              </p>
            </div>
            <div className="flex min-w-0 flex-col items-start gap-2 text-sm">
              <Esqueleto className="h-[26px] w-32 rounded-full" />
              <p className="flex w-full items-center gap-1.5">
                <Calendar className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <EsqueletoEnLinea className="w-24" />
                </span>
              </p>
              <p className="flex w-full items-center gap-1.5">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <EsqueletoEnLinea className="w-40 max-w-full" />
                </span>
              </p>
            </div>
            <Esqueleto className="h-11 w-full rounded-[var(--radius-md)] @3xl:w-44" />
            <div className="min-w-0 @3xl:col-span-full @3xl:max-w-[680px]">
              <div className="flex w-full max-w-md items-start gap-2.5 rounded-[var(--radius-lg)] bg-secondary-hover/60 px-3.5 py-3 text-[15px] leading-[1.45]">
                <Esqueleto className="size-5 shrink-0 rounded-full" />
                <span className="min-w-0 flex-1">
                  <EsqueletoEnLinea className="w-3/4" />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
