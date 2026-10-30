import type { ComponentProps, ReactNode } from "react"
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

// Color de texto de cada tono sobre blanco (AA). El amarillo no llega como
// texto: "warning" usa --color-warning-text.
const CLASE_TEXTO_TONO: Record<TonoBadge, string> = {
  info: "text-info",
  teal: "text-teal",
  success: "text-success",
  neutral: "text-neutral",
  warning: "text-warning-text",
  danger: "text-danger",
  violet: "text-violet",
}

/** El tono como texto de color, para un estado escrito sin pastilla. */
export function claseTextoTono(tono: TonoBadge): string {
  return CLASE_TEXTO_TONO[tono]
}

type Props = ComponentProps<"span"> & {
  tono?: TonoBadge
  /** Variante "estado": un punto del color del texto antes de la etiqueta. */
  estado?: boolean
  icono?: LucideIcon
  /**
   * El texto pasa de línea dentro de la pastilla en lugar de acortarse (un
   * cuadro angosto donde la etiqueta es lo importante, como los indicadores
   * del panel). Mide 26 px con una línea y crece con cada línea más.
   */
  multilinea?: boolean
}

/**
 * Badge de estado: pastilla de 26 px, sin salto de línea. Si no entra en su
 * contenedor, el texto se acorta con puntos suspensivos y, si es texto
 * simple, lleva un title con el texto completo. Con `multilinea`, pasa de
 * línea.
 */
function Badge({
  tono = "neutral",
  estado = false,
  icono: Icono,
  multilinea = false,
  className,
  children,
  title,
  ...props
}: Props) {
  return (
    <span
      data-slot="badge"
      title={title ?? (!multilinea && typeof children === "string" ? children : undefined)}
      className={cn(
        "inline-flex w-fit max-w-full min-w-0 shrink-0 items-center gap-1.5 rounded-[13px] px-2.5 text-[13px] font-bold",
        multilinea ? "min-h-[26px] py-[5px] leading-[1.25]" : "h-[26px] leading-none whitespace-nowrap",
        CLASE_TONO[tono],
        className,
      )}
      {...props}
    >
      {estado && (
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-current" />
      )}
      {Icono && <Icono aria-hidden="true" className="size-3.5 shrink-0" />}
      <span className={multilinea ? "min-w-0 break-words" : "min-w-0 truncate"}>{children}</span>
    </span>
  )
}

export { Badge }

/** Tono del punto de BadgeBanda: los de Badge más "apagado" (retirada). */
export type TonoPuntoBanda = TonoBadge | "apagado"

const CLASE_PUNTO: Record<TonoPuntoBanda, string> = {
  info: "bg-info",
  teal: "bg-teal",
  success: "bg-success",
  neutral: "bg-neutral",
  warning: "bg-accent",
  danger: "bg-danger",
  violet: "bg-violet",
  apagado: "bg-muted-icon",
}

/**
 * Estado al lado del título de una banda verde (EncabezadoPagina `junto`):
 * pastilla blanca de 30 px, radio 15, texto `primary-hover` y un punto de
 * 9 px del color del estado. Sin `tono`, el punto va del color del texto.
 */
export function BadgeBanda({
  tono,
  children,
  className,
}: {
  tono?: TonoPuntoBanda
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-[15px] bg-surface px-3 text-sm font-bold whitespace-nowrap text-primary-hover",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-[9px] shrink-0 rounded-full", tono ? CLASE_PUNTO[tono] : "bg-primary-hover")}
      />
      {children}
    </span>
  )
}
