import type { TonoBadge } from "@/components/ui/badge";
import type { EstadoDerivacionEmpresa } from "@/lib/derivacion-estados";
import type { Enum, FilaIndicadoresPostulante } from "@/types/db";

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

/**
 * Se puede retirar mientras el proceso siga abierto: recibida, en revisión o
 * derivada con la empresa todavía sin resultado. Un seleccionado o un proceso
 * cerrado no se retiran (retirar_postulacion, migration_053).
 */
export function sePuedeRetirar(
  estado: EstadoPostulacion,
  estadoEmpresa: EstadoDerivacionEmpresa | null | undefined,
): boolean {
  if (estado === "recibida" || estado === "en_revision") return true;
  return estado === "derivada" && (estadoEmpresa === "pendiente" || estadoEmpresa === "en_proceso");
}

// ── Filtro por estado (?estado=) ────────────────────────────────────────────

export const FILTROS_MIS_POSTULACIONES = [
  "en-revision",
  "derivadas",
  "seleccionadas",
  "no-seleccionadas",
  "retiradas",
] as const;

export type FiltroMisPostulaciones = (typeof FILTROS_MIS_POSTULACIONES)[number];

/** El filtro de la URL, o null (todas) si falta o no es válido. */
export function leerFiltroMisPostulaciones(
  valor: string | string[] | undefined,
): FiltroMisPostulaciones | null {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return FILTROS_MIS_POSTULACIONES.find((f) => f === texto) ?? null;
}

/**
 * Qué postulaciones entran en cada filtro: las mismas condiciones que cada
 * número de indicadores_postulante() (migration_058, BLOQUE 3), para que el
 * cuadro del panel y la lista filtrada den lo mismo.
 *   estados        postulaciones.estado que entran sin mirar la derivación.
 *   derivadaCon    además, las 'derivada' cuyo resultado de la empresa
 *                  (derivaciones.estado_empresa, null sin derivación) cumple
 *                  la condición.
 * Las cerradas porque la empresa retiró la oferta no entran en ninguno.
 */
export const CRITERIO_FILTRO: Record<
  FiltroMisPostulaciones,
  {
    estados: EstadoPostulacion[];
    derivadaCon?: (estadoEmpresa: EstadoDerivacionEmpresa | null) => boolean;
  }
> = {
  "en-revision": { estados: ["recibida", "en_revision"] },
  derivadas: { estados: [], derivadaCon: derivadaSinResultado },
  seleccionadas: { estados: [], derivadaCon: (e) => e === "contratado" },
  "no-seleccionadas": { estados: ["rechazada_municipalidad"], derivadaCon: (e) => e === "rechazado" },
  retiradas: { estados: ["retirada_postulante"] },
};

function derivadaSinResultado(estadoEmpresa: EstadoDerivacionEmpresa | null): boolean {
  return estadoEmpresa === null || estadoEmpresa === "pendiente" || estadoEmpresa === "en_proceso";
}

/** Columna de indicadores_postulante() con el número de cada filtro. */
export const INDICADOR_FILTRO: Record<
  FiltroMisPostulaciones,
  Exclude<keyof FilaIndicadoresPostulante, "invitaciones_pendientes">
> = {
  "en-revision": "en_revision",
  derivadas: "derivadas_sin_resultado",
  seleccionadas: "contratadas",
  "no-seleccionadas": "no_seleccionadas",
  retiradas: "retiradas",
};

/** Etiqueta de cada filtro: la misma en el cuadro del panel y en la pastilla. */
export const ETIQUETA_FILTRO: Record<FiltroMisPostulaciones, string> = {
  "en-revision": "En revisión",
  derivadas: "Enviadas a la empresa",
  seleccionadas: "Seleccionadas",
  "no-seleccionadas": "No seleccionadas",
  retiradas: "Retiradas",
};

/** Cantidad con su estado, en singular o plural: "3 postulaciones en revisión". */
export function cantidadConEstado(filtro: FiltroMisPostulaciones, cantidad: number): string {
  const uno = cantidad === 1;
  const sustantivo = uno ? "postulación" : "postulaciones";
  const estado: Record<FiltroMisPostulaciones, string> = {
    "en-revision": "en revisión",
    derivadas: uno ? "enviada a la empresa" : "enviadas a la empresa",
    seleccionadas: uno ? "seleccionada" : "seleccionadas",
    "no-seleccionadas": uno ? "no seleccionada" : "no seleccionadas",
    retiradas: uno ? "retirada" : "retiradas",
  };
  return `${cantidad} ${sustantivo} ${estado[filtro]}`;
}

/** Estado vacío de Mis postulaciones con un filtro sin resultados. */
export const VACIO_FILTRO: Record<FiltroMisPostulaciones, string> = {
  "en-revision": "No tenés postulaciones en revisión.",
  derivadas: "No tenés postulaciones enviadas a la empresa.",
  seleccionadas: "No tenés postulaciones seleccionadas.",
  "no-seleccionadas": "No tenés postulaciones no seleccionadas.",
  retiradas: "No tenés postulaciones retiradas.",
};

/** Ancla de cada postulación en Mis postulaciones. */
export function anclaPostulacion(postulacionId: string): string {
  return `postulacion-${postulacionId}`;
}
