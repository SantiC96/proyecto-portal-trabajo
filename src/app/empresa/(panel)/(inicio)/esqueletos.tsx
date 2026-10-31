import { Badge } from "@/components/ui/badge";
import { Esqueleto, EsqueletoEnLinea } from "@/components/ui/esqueleto";
import { DERIVACION_ESTADO_LABEL, DERIVACION_ESTADO_TONO } from "@/lib/derivacion-estados";

/**
 * "Candidatos por contactar" mientras carga: filas separadas por una línea
 * con el círculo de 40 px, el nombre (16 px) y la oferta (14 px) en gris, y
 * el badge "Pendiente" y "Ver candidato" reales (son fijos en esta lista).
 */
export function EsqueletoPorContactar({ filas = 3 }: { filas?: number }) {
  return (
    <div aria-hidden="true" inert className="mt-4 divide-y divide-tabla-borde">
      {Array.from({ length: filas }, (_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Esqueleto className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <p className="text-base leading-snug">
                <EsqueletoEnLinea className="w-40 max-w-full" />
              </p>
              <p className="mt-0.5 text-sm">
                <EsqueletoEnLinea className="w-56 max-w-full" />
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Badge tono={DERIVACION_ESTADO_TONO.pendiente} estado>
              {DERIVACION_ESTADO_LABEL.pendiente}
            </Badge>
            <span className="btn-secundario btn-chico w-full whitespace-nowrap sm:w-auto">
              Ver candidato
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
