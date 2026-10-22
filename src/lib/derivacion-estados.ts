import type { TonoBadge } from "@/components/ui/badge";
import type { Enum } from "@/types/db";

export type EstadoDerivacionEmpresa = Enum<"estado_empresa">;

export const DERIVACION_ESTADO_LABEL: Record<EstadoDerivacionEmpresa, string> = {
  pendiente: "Por contactar",
  en_proceso: "Entrevista coordinada",
  contratado: "Seleccionado",
  rechazado: "No seleccionado",
  oferta_retirada: "Cerrada (oferta retirada)",
  retirada_postulante: "Se retiró",
};

export const DERIVACION_ESTADO_TONO: Record<EstadoDerivacionEmpresa, TonoBadge> = {
  pendiente: "warning",
  en_proceso: "info",
  contratado: "success",
  rechazado: "neutral",
  oferta_retirada: "neutral",
  retirada_postulante: "neutral",
};

/**
 * También son finales "oferta_retirada" (la empresa retiró la oferta,
 * migration_051) y "retirada_postulante" (el candidato retiró su postulación,
 * migration_053).
 */
export function esFinalEmpresa(estado: EstadoDerivacionEmpresa): boolean {
  return (
    estado === "contratado" ||
    estado === "rechazado" ||
    estado === "oferta_retirada" ||
    estado === "retirada_postulante"
  );
}

/**
 * Días después de la entrevista a partir de los cuales una derivación que
 * sigue en "Por contactar" o "Entrevista coordinada" se considera sin
 * resultado de la empresa (recordatorio de contratación, migration_037).
 */
export const DIAS_SIN_RESULTADO = 3;
