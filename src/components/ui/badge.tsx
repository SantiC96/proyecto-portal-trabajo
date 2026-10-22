import type { ComponentProps } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Tonos de estado del portal. Fondo sólido con texto blanco; "warning" va en
 * amarillo con texto oscuro. No se usan colores pastel. La tabla de qué tono
 * lleva cada estado está en docs/DESIGN_SYSTEM_Portal_Municipal_Empleo.md.
 */
export type TonoBadge =
  | "info"
  | "teal"
  | "success"
  | "neutral"
  | "warning"
  | "danger"
  | "violet"

const CLASE_TONO: Record<TonoBadge, string> = {
  info: "bg-info text-white",
  teal: "bg-teal text-white",
  success: "bg-success text-white",
  neutral: "bg-neutral text-white",
  warning: "bg-accent text-accent-foreground",
  danger: "bg-danger text-white",
  violet: "bg-violet text-white",
}

/** Fondo y texto de un tono, para un elemento que no es un Badge (un botón, un aviso corto). */
export function claseTono(tono: TonoBadge): string {
  return CLASE_TONO[tono]
}

type Props = ComponentProps<"span"> & {
  tono?: TonoBadge
  /** Variante "estado": un punto del color del texto antes de la etiqueta. */
  estado?: boolean
  icono?: LucideIcon
}

/** Badge de estado: pastilla de 26 px, sin salto de línea. */
function Badge({
  tono = "neutral",
  estado = false,
  icono: Icono,
  className,
  children,
  ...props
}: Props) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex h-[26px] w-fit max-w-full shrink-0 items-center gap-1.5 overflow-hidden rounded-[13px] px-2.5 text-[13px] leading-none font-bold whitespace-nowrap",
        CLASE_TONO[tono],
        className,
      )}
      {...props}
    >
      {estado && (
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-current" />
      )}
      {Icono && <Icono aria-hidden="true" className="size-3.5 shrink-0" />}
      {children}
    </span>
  )
}

export { Badge }
