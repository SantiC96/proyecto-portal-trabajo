import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type EventoLinea = {
  /** Clave estable del evento. */
  clave: string;
  titulo: ReactNode;
  /** Quién y cuándo, si se sabe. */
  detalle?: ReactNode;
  /**
   * Solo para mostrar pasos (lo hecho, el paso actual y lo que falta). Sin
   * estado, el último evento es el resaltado.
   */
  estado?: "hecho" | "actual" | "pendiente";
};

/**
 * Historial en orden: un punto de 12 px por evento unido por una línea
 * vertical. El último (el más reciente) va en verde con un anillo. Con
 * `estado`, el resaltado es el paso "actual" y los "pendiente" van con el
 * punto hueco y el texto en gris.
 */
export function LineaDeTiempo({ eventos, className }: { eventos: EventoLinea[]; className?: string }) {
  return (
    <ol className={cn("flex flex-col", className)}>
      {eventos.map((e, i) => {
        const ultimo = i === eventos.length - 1;
        const actual = e.estado ? e.estado === "actual" : ultimo;
        const pendiente = e.estado === "pendiente";
        return (
          <li
            key={e.clave}
            aria-current={e.estado === "actual" ? "step" : undefined}
            className="relative flex gap-3.5 pb-5 last:pb-0"
          >
            {!ultimo && (
              <span
                aria-hidden="true"
                className="absolute top-[18px] bottom-0 left-[5px] w-0.5 bg-border"
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                "relative mt-[5px] size-3 shrink-0 rounded-full",
                actual
                  ? "bg-primary shadow-[0_0_0_4px_rgb(0_104_51/0.18)]"
                  : pendiente
                    ? "border-2 border-muted-icon bg-surface"
                    : "bg-muted-icon",
              )}
            />
            <div className="min-w-0">
              <p
                className={cn(
                  "text-[15px] leading-[1.45] font-bold",
                  pendiente ? "text-muted-foreground" : "text-heading",
                )}
              >
                {e.titulo}
                {pendiente && <span className="sr-only"> (pendiente)</span>}
              </p>
              {e.detalle && (
                <p className="mt-0.5 text-sm break-words text-muted-foreground">{e.detalle}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
