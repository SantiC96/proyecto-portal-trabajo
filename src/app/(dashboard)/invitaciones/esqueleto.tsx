import { Esqueleto, EsqueletoEnLinea } from "@/components/ui/esqueleto";
import { SinPendientes } from "./seccion-invitaciones";

/**
 * Invitaciones mientras cargan. Arriba, un bloque neutro del alto del estado
 * vacío (SinPendientes real, invisible, debajo del gris): sirve tanto si hay
 * pendientes como si no. Debajo, "Respondidas" real con las pastillas del
 * resumen en gris y tres filas con la forma de FilaRespondida.
 */
export function EsqueletoInvitaciones({ filas = 3 }: { filas?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-8">
      <div className="relative">
        <div className="invisible">
          <SinPendientes titulo="No tenés invitaciones pendientes" />
        </div>
        <Esqueleto className="absolute inset-0 rounded-[var(--radius-xl)]" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-lg font-extrabold text-heading sm:text-xl">Respondidas</p>
          <div className="flex flex-wrap gap-2">
            <Esqueleto className="h-8 w-28 rounded-full" />
            <Esqueleto className="h-8 w-32 rounded-full" />
            <Esqueleto className="h-8 w-24 rounded-full" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: filas }, (_, i) => (
            <div
              key={i}
              className="tarjeta flex items-start gap-3.5 rounded-[var(--radius-lg)] px-4 py-3.5 sm:items-center"
            >
              <Esqueleto className="size-10 shrink-0 rounded-[11px]" />
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px]">
                    <EsqueletoEnLinea className="w-3/5" />
                  </p>
                  <p className="text-sm">
                    <EsqueletoEnLinea className="w-4/5 sm:w-2/5" />
                  </p>
                </div>
                <Esqueleto className="h-[26px] w-24 shrink-0 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
