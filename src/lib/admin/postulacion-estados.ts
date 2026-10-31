import type { TonoBadge } from "@/components/ui/badge";
import type { EstadoDerivacionEmpresa } from "@/lib/derivacion-estados";
import type { Enum } from "@/types/db";

export type EstadoPostulacion = Enum<"estado_postulacion">;

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
  | "no_seleccionado_oficina"
  /** La empresa retiró la oferta (migration_051). No es un rechazo. */
  | "oferta_retirada"
  /** El postulante retiró su postulación (migration_053). No es un rechazo. */
  | "retirada_postulante";

export type BadgePostulacion = {
  label: string;
  tono: TonoBadge;
};

// Colores de estado de la oficina (ronda 9): recibida gris, en revisión azul,
// derivada teal, contratado verde, no seleccionado rojo y retirada gris claro.
// La oferta retirada por la empresa tampoco es un rechazo: va como retirada.
export const BADGE_ESTADO_VISIBLE: Record<EstadoVisiblePostulacion, BadgePostulacion> = {
  recibida: { label: "Recibida", tono: "neutral" },
  en_revision: { label: "En revisión", tono: "info" },
  derivada: { label: "Derivada", tono: "teal" },
  contratado: { label: "Contratado", tono: "success" },
  no_seleccionado_empresa: { label: "No seleccionado (por la empresa)", tono: "danger" },
  no_seleccionado_oficina: { label: "No seleccionado (por la oficina)", tono: "danger" },
  oferta_retirada: { label: "Cerrada (la empresa retiró la oferta)", tono: "apagado" },
  retirada_postulante: { label: "Retirada por el postulante", tono: "apagado" },
};

/** Filete izquierdo de la fila (Tabla con filete): el color del estado. */
export const FILETE_ESTADO_VISIBLE: Record<EstadoVisiblePostulacion, string> = {
  recibida: "before:bg-neutral",
  en_revision: "before:bg-info",
  derivada: "before:bg-teal",
  contratado: "before:bg-success",
  no_seleccionado_empresa: "before:bg-danger",
  no_seleccionado_oficina: "before:bg-danger",
  oferta_retirada: "before:bg-muted-icon",
  retirada_postulante: "before:bg-muted-icon",
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
    case "oferta_retirada":
      return "oferta_retirada";
    case "retirada_postulante":
      return "retirada_postulante";
    case "derivada":
      if (estadoEmpresa === "contratado") return "contratado";
      if (estadoEmpresa === "rechazado") return "no_seleccionado_empresa";
      if (estadoEmpresa === "oferta_retirada") return "oferta_retirada";
      return "derivada";
  }
}

export function badgePostulacion(
  estado: EstadoPostulacion,
  estadoEmpresa: EstadoDerivacionEmpresa | null | undefined
): BadgePostulacion {
  return BADGE_ESTADO_VISIBLE[estadoVisiblePostulacion(estado, estadoEmpresa)];
}
