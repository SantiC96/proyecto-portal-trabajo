import type { TonoBadge } from "@/components/ui/badge";
import { ESTILO_ETAPA } from "@/lib/estados-postulacion";
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

// Colores de estado: los mismos que ve el postulante y la empresa
// (src/lib/estados-postulacion.ts). La oferta retirada por la empresa tampoco
// es un rechazo: va como cerrada.
export const BADGE_ESTADO_VISIBLE: Record<EstadoVisiblePostulacion, BadgePostulacion> = {
  recibida: { label: "Recibida", tono: ESTILO_ETAPA.recibida.tono },
  en_revision: { label: "En revisión", tono: ESTILO_ETAPA.revision.tono },
  derivada: { label: "Derivada", tono: ESTILO_ETAPA.derivada.tono },
  contratado: { label: "Contratado", tono: ESTILO_ETAPA.seleccionado.tono },
  no_seleccionado_empresa: { label: "No seleccionado (por la empresa)", tono: ESTILO_ETAPA.cerrado.tono },
  no_seleccionado_oficina: { label: "No seleccionado (por la oficina)", tono: ESTILO_ETAPA.cerrado.tono },
  oferta_retirada: { label: "Cerrada (la empresa retiró la oferta)", tono: ESTILO_ETAPA.cerrado.tono },
  retirada_postulante: { label: "Retirada por el postulante", tono: ESTILO_ETAPA.cerrado.tono },
};

/** Filete izquierdo de la fila (Tabla con filete): el color del estado. */
export const FILETE_ESTADO_VISIBLE: Record<EstadoVisiblePostulacion, string> = {
  recibida: ESTILO_ETAPA.recibida.filete,
  en_revision: ESTILO_ETAPA.revision.filete,
  derivada: ESTILO_ETAPA.derivada.filete,
  contratado: ESTILO_ETAPA.seleccionado.filete,
  no_seleccionado_empresa: ESTILO_ETAPA.cerrado.filete,
  no_seleccionado_oficina: ESTILO_ETAPA.cerrado.filete,
  oferta_retirada: ESTILO_ETAPA.cerrado.filete,
  retirada_postulante: ESTILO_ETAPA.cerrado.filete,
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
