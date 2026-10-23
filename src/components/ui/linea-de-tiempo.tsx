import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type EventoLinea = {
  /** Clave estable del evento. */
  clave: string;
  titulo: ReactNode;
  /** Quién y cuándo, si se sabe. */
  detalle?: ReactNode;
};

/**
 * Historial en orden: un punto de 12 px por evento unido por una línea
 * vertical. El último (el más reciente) va en verde con un anillo.
 */
export function LineaDeTiempo({ eventos, className }: { eventos: EventoLinea[]; className?: string }) {
  return (
    <ol className={cn("flex flex-col", className)}>
      {eventos.map((e, i) => {
        const ultimo = i === eventos.length - 1;
        return (
          <li key={e.clave} className="relative flex gap-3.5 pb-5 last:pb-0">
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
                ultimo
                  ? "bg-primary shadow-[0_0_0_4px_rgb(0_104_51/0.18)]"
                  : "bg-muted-icon",
              )}
            />
            <div className="min-w-0">
              <p className="text-[15px] leading-[1.45] font-bold text-heading">{e.titulo}</p>
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
