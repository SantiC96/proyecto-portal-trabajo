import type { ComponentProps, ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TonoFranja = "info" | "ok" | "neutra" | "aviso" | "error";

const CLASE_TONO: Record<TonoFranja, string> = {
  info: "bg-info text-white",
  ok: "bg-success text-white",
  neutra: "bg-surface text-foreground shadow-[inset_0_0_0_1.5px_var(--color-muted-icon)]",
  aviso: "bg-surface text-invitacion-titulo shadow-[inset_0_0_0_2px_var(--color-accent)]",
  error: "bg-danger text-white",
};

const ICONO: Record<TonoFranja, LucideIcon> = {
  info: Info,
  ok: CheckCircle2,
  neutra: Info,
  aviso: AlertTriangle,
  error: AlertCircle,
};

type Props = Omit<ComponentProps<"div">, "title"> & {
  tono: TonoFranja;
  /** Texto en negrita al principio, en la misma línea que el resto. */
  titulo?: ReactNode;
  icono?: LucideIcon;
};

/**
 * Franja informativa dentro de una tarjeta (el estado de una postulación, un
 * aviso sobre la oferta). A diferencia de Aviso, no se anuncia sola: es parte
 * del contenido. Los links de adentro van subrayados y heredan el color.
 */
export function Franja({ tono, titulo, icono, className, children, ...props }: Props) {
  const Icono = icono ?? ICONO[tono];
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-[var(--radius-lg)] px-3.5 py-3 text-[15px] leading-[1.45]",
        "[&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2",
        CLASE_TONO[tono],
        className,
      )}
      {...props}
    >
      <Icono aria-hidden="true" className="size-5 shrink-0" />
      <div className="min-w-0 flex-1 break-words">
        {titulo && <strong className="font-bold">{titulo}</strong>}
        {titulo && children ? " " : null}
        {children}
      </div>
    </div>
  );
}
