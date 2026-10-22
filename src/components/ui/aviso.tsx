import type { ComponentProps, ReactNode } from "react"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type TonoAviso = "info" | "success" | "warning" | "danger"

const CLASE_TONO: Record<TonoAviso, string> = {
  info: "bg-info text-white",
  success: "bg-success text-white",
  warning: "bg-accent text-accent-foreground",
  danger: "bg-danger text-white",
}

const ICONO: Record<TonoAviso, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
}

type Props = Omit<ComponentProps<"div">, "title"> & {
  tono: TonoAviso
  /** Texto en negrita arriba del contenido. */
  titulo?: ReactNode
  /** Ícono de Lucide; por defecto, el del tono. */
  icono?: LucideIcon
}

/**
 * Aviso o banner de una pantalla: fondo sólido del tono, sin pastel. Los
 * links de adentro van subrayados y heredan el color del texto. Danger se
 * anuncia como alerta; los demás, como estado.
 */
export function Aviso({ tono, titulo, icono, className, children, role, ...props }: Props) {
  const Icono = icono ?? ICONO[tono]
  return (
    <div
      role={role ?? (tono === "danger" ? "alert" : "status")}
      className={cn(
        "flex items-start gap-3 rounded-[var(--radius-lg)] px-4 py-3.5 text-[15px] leading-[1.45]",
        "[&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2",
        CLASE_TONO[tono],
        className,
      )}
      {...props}
    >
      <Icono aria-hidden="true" className="mt-px size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        {titulo && <p className="font-bold">{titulo}</p>}
        {children && <div className={cn(titulo && "mt-1")}>{children}</div>}
      </div>
    </div>
  )
}
