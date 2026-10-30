import { CheckCircle2, CircleCheck, Clock, MapPin, type LucideIcon } from "lucide-react";
import {
  detalleSinVerificar,
  textoChipLocalidad,
  varianteLocalidad,
  type EstadoComprobante,
  type NivelPrioridad,
  type VarianteLocalidad,
} from "@/lib/procedencia";
import { Badge, Chip, type TonoChip } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  nivel: NivelPrioridad;
  localidad: string | null;
  /** Estado del comprobante vigente (solo cuenta en el nivel 2). */
  comprobante: EstadoComprobante | null;
  className?: string;
};

/**
 * Procedencia y nivel de prioridad de un postulante (migration_055). Solo
 * para la oficina: la empresa no ve nada de esto (decisión 027). El texto
 * dice lo mismo que el color, así que no depende de distinguirlo.
 *   1  "Funes · Verificado" (verde)
 *   2  "Funes · Sin verificar" (amarillo) y el estado del comprobante
 *   3  "Otra localidad: …" o "Localidad sin informar" (gris)
 */
export function BadgeProcedencia({ nivel, localidad, comprobante, className }: Props) {
  if (nivel === 1) {
    return (
      <Badge tono="success" icono={CheckCircle2} className={className}>
        Funes · Verificado
      </Badge>
    );
  }

  if (nivel === 2) {
    return (
      <span className={cn("inline-flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
        <Badge tono="warning" icono={Clock}>
          Funes · Sin verificar
        </Badge>
        <span className="text-xs text-muted-foreground-strong">
          {detalleSinVerificar(comprobante)}
        </span>
      </span>
    );
  }

  const texto = localidad ? `Otra localidad: ${localidad}` : "Localidad sin informar";
  return (
    <Badge tono="neutral" icono={MapPin} title={texto} className={className}>
      {/* Recortado a la vista; completo con el mouse (title) y para el lector de pantalla. */}
      <span aria-hidden="true" className="max-w-[14rem] truncate sm:max-w-[18rem]">
        {texto}
      </span>
      <span className="sr-only">{texto}</span>
    </Badge>
  );
}

const CHIP_LOCALIDAD: Record<VarianteLocalidad, { tono: TonoChip; icono: LucideIcon }> = {
  verificado: { tono: "verde", icono: CircleCheck },
  "sin-verificar": { tono: "amarillo", icono: Clock },
  "otra-localidad": { tono: "gris", icono: MapPin },
};

/**
 * Chip de localidad de las pantallas de la oficina (ronda 9): un Chip de
 * 26 px. La variante sale del nivel de prioridad (varianteLocalidad), igual
 * que BadgeProcedencia.
 */
export function ChipLocalidad({
  nivel,
  localidad,
  className,
}: {
  nivel: NivelPrioridad;
  localidad: string | null;
  className?: string;
}) {
  const { tono, icono } = CHIP_LOCALIDAD[varianteLocalidad(nivel)];
  const texto = textoChipLocalidad(nivel, localidad);
  return (
    <Chip tono={tono} icono={icono} title={texto} className={className}>
      {texto}
    </Chip>
  );
}
