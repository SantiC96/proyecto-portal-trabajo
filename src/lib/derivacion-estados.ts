import type { Enum } from "@/types/db";

export type EstadoDerivacionEmpresa = Enum<"estado_empresa">;

export const DERIVACION_ESTADO_LABEL: Record<EstadoDerivacionEmpresa, string> = {
  pendiente: "Por contactar",
  en_proceso: "Entrevista coordinada",
  contratado: "Seleccionado",
  rechazado: "No seleccionado",
};

export const DERIVACION_ESTADO_STYLE: Record<
  EstadoDerivacionEmpresa,
  string
> = {
  pendiente: "bg-amber-100 text-amber-800",
  en_proceso: "bg-blue-100 text-blue-800",
  contratado: "bg-emerald-100 text-emerald-800",
  rechazado: "bg-gray-100 text-gray-600",
};

export function esFinalEmpresa(estado: EstadoDerivacionEmpresa): boolean {
  return estado === "contratado" || estado === "rechazado";
}

/**
 * Días después de la entrevista a partir de los cuales una derivación que
 * sigue en "Por contactar" o "Entrevista coordinada" se considera sin
 * resultado de la empresa (recordatorio de contratación, migration_037).
 */
export const DIAS_SIN_RESULTADO = 3;
