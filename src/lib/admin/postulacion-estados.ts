import type { EstadoDerivacionEmpresa } from "@/lib/derivacion-estados";

export type EstadoPostulacion =
  | "recibida"
  | "en_revision"
  | "derivada"
  | "rechazada_municipalidad";

/**
 * Estado que ve la oficina: combina postulaciones.estado con el resultado de
 * la empresa (derivaciones.estado_empresa), porque una postulación derivada
 * sigue en "derivada" aunque la empresa ya haya contratado o rechazado.
 */
export type EstadoVisiblePostulacion =
  | "recibida"
  | "en_revision"
  | "derivada"
  | "contratado"
  | "no_seleccionado_empresa"
  | "no_seleccionado_oficina";

export type BadgePostulacion = {
  label: string;
  variant: "secondary" | "outline" | "default" | "destructive";
  className?: string;
};

// Colores alineados con los contadores de las pestañas de /admin/postulaciones.
export const BADGE_ESTADO_VISIBLE: Record<EstadoVisiblePostulacion, BadgePostulacion> = {
  recibida: { label: "Recibida", variant: "secondary" },
  en_revision: {
    label: "En revisión",
    variant: "outline",
    className: "text-blue-700",
  },
  derivada: { label: "Derivada", variant: "default" },
  contratado: {
    label: "Contratado",
    variant: "outline",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  no_seleccionado_empresa: {
    label: "No seleccionado (por la empresa)",
    variant: "destructive",
  },
  no_seleccionado_oficina: {
    label: "No seleccionado (por la oficina)",
    variant: "destructive",
  },
};

export function estadoVisiblePostulacion(
  estado: EstadoPostulacion,
  estadoEmpresa: EstadoDerivacionEmpresa | null | undefined
): EstadoVisiblePostulacion {
  switch (estado) {
    case "recibida":
    case "en_revision":
      return estado;
    case "rechazada_municipalidad":
      return "no_seleccionado_oficina";
    case "derivada":
      if (estadoEmpresa === "contratado") return "contratado";
      if (estadoEmpresa === "rechazado") return "no_seleccionado_empresa";
      return "derivada";
  }
}

export function badgePostulacion(
  estado: EstadoPostulacion,
  estadoEmpresa: EstadoDerivacionEmpresa | null | undefined
): BadgePostulacion {
  return BADGE_ESTADO_VISIBLE[estadoVisiblePostulacion(estado, estadoEmpresa)];
}
