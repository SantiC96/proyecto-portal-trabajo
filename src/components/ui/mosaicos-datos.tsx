import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Mosaico = {
  etiqueta: string;
  icono: LucideIcon;
  valor: ReactNode;
  /** Texto largo (los rubros): ocupa todo el ancho. */
  ancho?: boolean;
};

/**
 * Datos en mosaicos: 3 columnas (1 en el celular), cada uno con borde, fondo
 * `tabla-fila-hover`, el ícono verde en un cuadrado de 38 px, la etiqueta
 * (12 px) y el valor (15 px 700). Los datos sin valor (null o "") se omiten.
 */
export function MosaicosDatos({ datos, className }: { datos: Mosaico[]; className?: string }) {
  const visibles = datos.filter((d) => d.valor !== null && d.valor !== undefined && d.valor !== "");
  if (visibles.length === 0) return null;
  return (
    <dl className={cn("grid grid-cols-1 gap-3 sm:grid-cols-3", className)}>
      {visibles.map(({ etiqueta, icono: Icono, valor, ancho }) => (
        <div
          key={etiqueta}
          className={cn(
            "flex min-w-0 items-center gap-3 rounded-[14px] border border-secondary-hover bg-tabla-fila-hover p-3",
            ancho && "sm:col-span-3",
          )}
        >
          <span
            aria-hidden="true"
            className="grid size-[38px] shrink-0 place-items-center rounded-[10px] bg-primary/10 text-primary"
          >
            <Icono className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <dt className="text-xs font-semibold text-muted-foreground">{etiqueta}</dt>
            <dd className="mt-0.5 text-[15px] leading-snug font-bold break-words text-heading">{valor}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
