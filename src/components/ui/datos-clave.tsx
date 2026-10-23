import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DatoClave = {
  etiqueta: string;
  valor: ReactNode;
};

/**
 * Lista de datos en dos columnas: la etiqueta (14 px 700) a la izquierda y el
 * valor (15 px) a la derecha. Cuando la lista mide menos de 384 px, la
 * etiqueta va arriba del valor. Los datos sin valor (null o "") se omiten.
 */
export function DatosClave({ datos, className }: { datos: DatoClave[]; className?: string }) {
  const visibles = datos.filter((d) => d.valor !== null && d.valor !== undefined && d.valor !== "");
  if (visibles.length === 0) return null;
  return (
    <div className={cn("@container", className)}>
      <dl className="grid grid-cols-1 gap-y-3 @sm:grid-cols-[160px_minmax(0,1fr)] @sm:gap-x-4">
        {visibles.map((d) => (
          <Fragment key={d.etiqueta}>
            <dt className="text-sm leading-[1.5] font-bold text-neutral">{d.etiqueta}</dt>
            <dd className="-mt-2.5 min-w-0 text-[15px] leading-[1.45] break-words text-control-foreground @sm:mt-0">
              {d.valor}
            </dd>
          </Fragment>
        ))}
      </dl>
    </div>
  );
}
