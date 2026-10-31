import { Esqueleto } from "@/components/ui/esqueleto";
import { cn } from "@/lib/utils";
import { GRILLA, SUBGRILLA } from "./listado";

/**
 * El listado de postulantes mientras carga: el encabezado real de la tabla
 * (desde 896 px de ancho disponible) y un grupo por prioridad con su franja y
 * su filete en gris, como ListadoPostulantes.
 */
export function EsqueletoListado({ grupos = 2, porGrupo = 3 }: { grupos?: number; porGrupo?: number }) {
  return (
    <div aria-hidden="true" className="@container flex flex-col gap-6">
      <div
        className={cn(
          "flex flex-col gap-5 @4xl:overflow-hidden @4xl:rounded-[var(--radius-xl)] @4xl:border @4xl:border-border @4xl:bg-surface @4xl:shadow-[var(--sombra-tarjeta)]",
          GRILLA,
        )}
      >
        <div
          className={cn(
            "hidden bg-tabla-cabecera py-3 pr-4 pl-[21px] text-xs font-extrabold tracking-[0.06em] text-neutral uppercase",
            SUBGRILLA,
          )}
        >
          <span>Postulante</span>
          <span>DNI</span>
          <span>Localidad</span>
          <span>Rubros</span>
          <span>CV</span>
          <span />
        </div>
        {Array.from({ length: grupos }, (_, g) => (
          <div
            key={g}
            className={cn(
              "relative flex flex-col gap-3 pl-[13px] before:absolute before:inset-y-0 before:left-0 before:w-[5px] before:rounded-full before:bg-secondary-hover @4xl:pl-0 @4xl:before:rounded-none",
              SUBGRILLA,
            )}
          >
            <div className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-tabla-cabecera px-4 py-2.5 @4xl:col-span-full @4xl:rounded-none @4xl:border-t @4xl:border-tabla-borde @4xl:py-3 @4xl:pr-4 @4xl:pl-[21px]">
              <Esqueleto className="h-6 w-24 rounded-[6px]" />
              <Esqueleto className="h-4 w-48 max-w-full" />
            </div>
            <div className={cn("flex flex-col gap-3", SUBGRILLA)}>
              {Array.from({ length: porGrupo }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex flex-col gap-3 rounded-[var(--radius-xl)] border border-border bg-surface p-4 shadow-[var(--sombra-tarjeta)]",
                    "@4xl:min-h-[69px] @4xl:items-center @4xl:rounded-none @4xl:border-x-0 @4xl:border-b-0 @4xl:border-tabla-borde @4xl:py-3.5 @4xl:pr-4 @4xl:pl-[21px] @4xl:shadow-none",
                    SUBGRILLA,
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Esqueleto className="size-10 shrink-0 rounded-full" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <Esqueleto className="h-4 w-3/4" />
                      <Esqueleto className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Esqueleto className="h-4 w-20" />
                  <Esqueleto className="h-4 w-24" />
                  <div className="flex gap-1.5">
                    <Esqueleto className="h-7 w-20 rounded-full" />
                    <Esqueleto className="h-7 w-14 rounded-full" />
                  </div>
                  <Esqueleto className="h-4 w-16" />
                  <Esqueleto className="h-11 w-full rounded-[var(--radius-md)] @4xl:h-10 @4xl:w-28" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
