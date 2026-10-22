import type { TonoBadge } from "@/components/ui/badge";
import type { EstadoDerivacionEmpresa } from "@/lib/derivacion-estados";
import type { Enum } from "@/types/db";

// Etiquetas y textos de estado que ve el postulante: Mis postulaciones y su
// panel (/panel). La oficina usa los suyos (src/lib/admin/postulacion-estados.ts).

export type EstadoPostulacion = Enum<"estado_postulacion">;

export type BadgeMiPostulacion = { label: string; tono: TonoBadge };

/**
 * Único badge de cada postulación en Mis postulaciones y en el panel. Combina
 * el estado de la postulación, el resultado de la empresa y el estado de la
 * oferta, en este orden de prioridad:
 *   1. Retirada por el postulante.
 *   2. Seleccionado (la empresa lo contrató).
 *   3. No seleccionado (por la oficina o por la empresa).
 *   4. Oferta cerrada: la empresa la retiró (en la postulación o en la
 *      derivación), quedó cerrada (por ejemplo, al cubrirse las vacantes) o el
 *      postulante ya no la puede ver (eliminada o inexistente).
 *   5. El estado en curso: recibida, en revisión o enviada a la empresa.
 * Una oferta en revisión o rechazada no cambia el badge: Mis postulaciones lo
 * avisa debajo.
 */
export function badgePostulacion({
  estado,
  estadoEmpresa,
  ofertaEstado,
  ofertaNoVisible,
}: {
  estado: EstadoPostulacion;
  estadoEmpresa?: EstadoDerivacionEmpresa | null;
  ofertaEstado?: Enum<"estado_oferta"> | null;
  ofertaNoVisible?: boolean;
}): BadgeMiPostulacion {
  if (estado === "retirada_postulante") {
    return { label: "Retirada", tono: "neutral" };
  }
  if (estadoEmpresa === "contratado") {
    return { label: "Seleccionado", tono: "success" };
  }
  if (estado === "rechazada_municipalidad" || estadoEmpresa === "rechazado") {
    return { label: "No seleccionado", tono: "neutral" };
  }
  if (
    estado === "oferta_retirada" ||
    estadoEmpresa === "oferta_retirada" ||
    ofertaEstado === "cerrada" ||
    ofertaNoVisible
  ) {
    return { label: "Oferta cerrada", tono: "neutral" };
  }
  switch (estado) {
    case "en_revision":
      return { label: "En revisión", tono: "info" };
    case "derivada":
      return { label: "Enviada a la empresa", tono: "teal" };
    default:
      return { label: "Recibida", tono: "neutral" };
  }
}

export const AVISO_OFERTA_RETIRADA =
  "La empresa retiró la oferta. Tu postulación quedó cerrada; podés seguir postulándote a otras ofertas.";

export const TEXTO_SELECCIONADO = "¡Fuiste seleccionado para este puesto!";
export const TEXTO_NO_SELECCIONADO = "No fuiste seleccionado para este puesto.";

/** Ancla de cada postulación en Mis postulaciones. */
export function anclaPostulacion(postulacionId: string): string {
  return `postulacion-${postulacionId}`;
}
