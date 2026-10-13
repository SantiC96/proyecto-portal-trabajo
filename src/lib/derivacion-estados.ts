export type EstadoDerivacionEmpresa =
  | "pendiente"
  | "en_proceso"
  | "contratado"
  | "rechazado";

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
