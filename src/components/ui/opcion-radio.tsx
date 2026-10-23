import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = Omit<ComponentProps<"input">, "type" | "children"> & {
  children: ReactNode;
  /** Algo a la derecha de la fila que no es parte del label (por ejemplo "Ver CV"). */
  extra?: ReactNode;
  classNameFila?: string;
};

/**
 * Opción tipo radio de un diálogo: fila con borde de 1,5 px y radio 12. La
 * elegida lleva borde verde y fondo opcion-elegida. Toda la fila es el label.
 */
export function OpcionRadio({ children, extra, classNameFila, className, ...props }: Props) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-lg)] border-[1.5px] border-border-campo bg-surface transition-colors duration-150",
        "has-[:checked]:border-primary has-[:checked]:bg-opcion-elegida has-[:focus-visible]:shadow-[var(--sombra-foco)]",
        "has-[:disabled]:opacity-60",
        classNameFila,
      )}
    >
      <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 px-4 py-3 has-[:disabled]:cursor-not-allowed">
        <input
          type="radio"
          className={cn("size-[18px] shrink-0 accent-primary outline-none", className)}
          {...props}
        />
        <span className="min-w-0 flex-1">{children}</span>
      </label>
      {extra && <div className="shrink-0 pr-2">{extra}</div>}
    </div>
  );
}
