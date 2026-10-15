import { AlertTriangle, CalendarClock } from "lucide-react";
import { formatFecha } from "@/lib/fechas";
import { estadoVencimiento, textoDiasRestantes } from "@/lib/ofertas-vencimiento";
import { cn } from "@/lib/utils";
import type { Enum } from "@/types/db";

/**
 * "Vence el <fecha>" para una oferta activa, con aviso cuando faltan pocos
 * días y "Venció el <fecha>" cuando ya pasó. No muestra nada para ofertas en
 * otros estados.
 */
export function VencimientoOferta({
  estado,
  venceEn,
  className,
}: {
  estado: Enum<"estado_oferta">;
  venceEn: string | null;
  className?: string;
}) {
  if (estado !== "activa" || !venceEn) return null;
  const { vencida, porVencer, diasRestantes } = estadoVencimiento(estado, venceEn);

  if (vencida) {
    return (
      <p className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-red-700", className)}>
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Venció el {formatFecha(venceEn)}: ya no se ve en el portal
      </p>
    );
  }

  if (porVencer && diasRestantes !== null) {
    return (
      <p className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-amber-700", className)}>
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {textoDiasRestantes(diasRestantes)} (el {formatFecha(venceEn)})
      </p>
    );
  }

  return (
    <p className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Vence el {formatFecha(venceEn)}
    </p>
  );
}
