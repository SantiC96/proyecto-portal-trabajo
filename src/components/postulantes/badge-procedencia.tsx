import { CheckCircle2, Clock, MapPin } from "lucide-react";
import {
  detalleSinVerificar,
  type EstadoComprobante,
  type NivelPrioridad,
} from "@/lib/procedencia";
import { cn } from "@/lib/utils";

type Props = {
  nivel: NivelPrioridad;
  localidad: string | null;
  /** Estado del comprobante vigente (solo cuenta en el nivel 2). */
  comprobante: EstadoComprobante | null;
  className?: string;
};

const BASE =
  "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium";

/**
 * Procedencia y nivel de prioridad de un postulante (migration_055). Solo
 * para la oficina: la empresa no ve nada de esto (decisión 027). El texto
 * dice lo mismo que el color, así que no depende de distinguirlo.
 *   1  "Funes · Verificado" (verde)
 *   2  "Funes · Sin verificar" (ámbar) y el estado del comprobante
 *   3  "Otra localidad: …" o "Localidad sin informar" (gris)
 */
export function BadgeProcedencia({ nivel, localidad, comprobante, className }: Props) {
  if (nivel === 1) {
    return (
      <span className={cn(BASE, "border-emerald-200 bg-emerald-50 text-emerald-800", className)}>
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Funes · Verificado
      </span>
    );
  }

  if (nivel === 2) {
    return (
      <span className={cn("inline-flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
        <span className={cn(BASE, "border-amber-200 bg-amber-50 text-amber-900")}>
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Funes · Sin verificar
        </span>
        <span className="text-xs text-muted-foreground-strong">
          {detalleSinVerificar(comprobante)}
        </span>
      </span>
    );
  }

  const texto = localidad ? `Otra localidad: ${localidad}` : "Localidad sin informar";
  return (
    <span
      title={texto}
      className={cn(BASE, "border-gray-200 bg-gray-100 text-gray-700", className)}
    >
      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {/* Recortado a la vista; completo con el mouse (title) y para el lector de pantalla. */}
      <span aria-hidden="true" className="max-w-[14rem] truncate sm:max-w-[18rem]">
        {texto}
      </span>
      <span className="sr-only">{texto}</span>
    </span>
  );
}
