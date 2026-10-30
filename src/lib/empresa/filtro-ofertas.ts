import { CircleCheck, CircleX, Archive, Clock, FilePen, Search, type LucideIcon } from "lucide-react";
import type { ValorParam } from "@/lib/paginacion";
import type { EstadoOfertaEmpresa } from "@/lib/oferta-estados";
import type { Enum } from "@/types/db";

// Filtro por estado de Mis ofertas (?estado=) y cuadros del panel de la
// empresa. Los dos usan estos criterios para que los números coincidan.

export const FILTROS_OFERTAS = [
  "publicada",
  "pendiente",
  "rechazada",
  "cerrada",
  "vencida",
  "borrador",
] as const;

export type FiltroOfertas = (typeof FILTROS_OFERTAS)[number];

export function leerFiltroOfertas(valor: ValorParam): FiltroOfertas | null {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return FILTROS_OFERTAS.find((f) => f === texto) ?? null;
}

/**
 * Condición de cada filtro. "Vencida" no es un estado de la base: es una
 * oferta activa con vence_en pasado (estadoVencimiento). Una activa sin
 * vence_en se muestra como publicada, igual que en la lista.
 */
export const CRITERIO_FILTRO_OFERTAS: Record<
  FiltroOfertas,
  { estado: Enum<"estado_oferta">; vence?: "vigente" | "vencida" }
> = {
  publicada: { estado: "activa", vence: "vigente" },
  pendiente: { estado: "pendiente_aprobacion" },
  rechazada: { estado: "rechazada" },
  cerrada: { estado: "cerrada" },
  vencida: { estado: "activa", vence: "vencida" },
  borrador: { estado: "borrador" },
};

/** Lo mínimo de una consulta de PostgREST que necesita aplicarFiltroOfertas. */
interface ConsultaFiltrable<Q> {
  eq(columna: "estado", valor: Enum<"estado_oferta">): Q;
  lte(columna: "vence_en", valor: string): Q;
  or(filtros: string): Q;
}

/** Aplica el filtro a una consulta sobre `ofertas`; `ahora` en ISO. */
export function aplicarFiltroOfertas<Q extends ConsultaFiltrable<Q>>(
  consulta: Q,
  filtro: FiltroOfertas,
  ahora: string,
): Q {
  const { estado, vence } = CRITERIO_FILTRO_OFERTAS[filtro];
  const conEstado = consulta.eq("estado", estado);
  if (vence === "vencida") return conEstado.lte("vence_en", ahora);
  if (vence === "vigente") return conEstado.or(`vence_en.is.null,vence_en.gt."${ahora}"`);
  return conEstado;
}

/** Pastillas de Mis ofertas. */
export const ETIQUETA_FILTRO_OFERTAS: Record<FiltroOfertas, string> = {
  publicada: "Publicadas",
  pendiente: "Pendientes de revisión",
  rechazada: "Rechazadas",
  cerrada: "Cerradas",
  vencida: "Vencidas",
  borrador: "Borradores",
};

/** Título del estado vacío de cada filtro. */
export const VACIO_FILTRO_OFERTAS: Record<FiltroOfertas, string> = {
  publicada: "No tenés ofertas publicadas.",
  pendiente: "No tenés ofertas pendientes de revisión.",
  rechazada: "No tenés ofertas rechazadas.",
  cerrada: "No tenés ofertas cerradas.",
  vencida: "No tenés ofertas vencidas.",
  borrador: "No tenés ofertas en borrador.",
};

/**
 * Filete e ícono de cada estado de una oferta. El color es el de su badge
 * (ESTADO_OFERTA_EMPRESA_TONO); en el cuadrado amarillo el ícono va oscuro.
 */
export const ACENTO_ESTADO_OFERTA: Record<
  EstadoOfertaEmpresa,
  { filete: string; fondoIcono: string; icono: LucideIcon }
> = {
  activa: { filete: "before:bg-success", fondoIcono: "bg-success", icono: CircleCheck },
  pendiente_aprobacion: {
    filete: "before:bg-accent",
    fondoIcono: "bg-accent text-accent-foreground",
    icono: Search,
  },
  rechazada: { filete: "before:bg-danger", fondoIcono: "bg-danger", icono: CircleX },
  cerrada: { filete: "before:bg-neutral", fondoIcono: "bg-neutral", icono: Archive },
  vencida: { filete: "before:bg-danger", fondoIcono: "bg-danger", icono: Clock },
  borrador: { filete: "before:bg-neutral", fondoIcono: "bg-neutral", icono: FilePen },
};
