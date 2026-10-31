import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

/**
 * Etiqueta de rubro, requisito o categoría. No es un estado: va en blanco con
 * borde, para no competir con los badges de estado. La variante verde marca
 * una coincidencia o un rubro elegido.
 */
export function EtiquetaRubro({
  verde = false,
  className,
  ...props
}: ComponentProps<"span"> & { verde?: boolean }) {
  return (
    <span
      className={cn(
        // break-words: una palabra larga pasa de línea en lugar de salirse.
        "inline-flex min-h-[26px] max-w-full min-w-0 items-center gap-1.5 rounded-[13px] bg-surface px-2.5 py-0.5 text-[13px] font-semibold break-words",
        verde
          ? "text-primary-hover shadow-[inset_0_0_0_1.5px_var(--color-primary)]"
          : "text-muted-foreground-strong shadow-[inset_0_0_0_1.5px_var(--color-muted-icon)]",
        className,
      )}
      {...props}
    />
  )
}
