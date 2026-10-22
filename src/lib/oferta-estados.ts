import type { TonoBadge } from "@/components/ui/badge";
import type { Enum } from "@/types/db";

/**
 * Estado de la oferta tal como lo ve la empresa: una oferta activa cuyo
 * vence_en ya pasó se muestra como "Vencida" (ver estadoVencimiento).
 */
export type EstadoOfertaEmpresa = Enum<"estado_oferta"> | "vencida";

export const ESTADO_OFERTA_EMPRESA_LABEL: Record<EstadoOfertaEmpresa, string> = {
  pendiente_aprobacion: "Pendiente de revisión",
  activa: "Publicada",
  rechazada: "Rechazada",
  cerrada: "Cerrada",
  borrador: "Borrador",
  vencida: "Vencida",
};

export const ESTADO_OFERTA_EMPRESA_TONO: Record<EstadoOfertaEmpresa, TonoBadge> = {
  pendiente_aprobacion: "warning",
  activa: "success",
  rechazada: "danger",
  cerrada: "neutral",
  borrador: "neutral",
  // Dejó de estar publicada sin que nadie la cerrara: pide una acción.
  vencida: "danger",
};

export type OfertaEstadoBadge = {
  label: string;
  descripcion?: string;
  tono: TonoBadge;
};

// Returns null for "activa" (no badge needed) and for null/undefined estado.
export function getOfertaEstadoBadge(estado: string | undefined): OfertaEstadoBadge | null {
  switch (estado) {
    case "activa":
    case undefined:
    case null:
      return null;
    case "pendiente_aprobacion":
      return {
        label: "Oferta en revisión",
        descripcion: "La empresa modificó esta oferta y la oficina la está revisando.",
        tono: "warning",
      };
    case "rechazada":
      return {
        label: "Oferta rechazada",
        tono: "danger",
      };
    case "cerrada":
      return {
        label: "Oferta cerrada",
        tono: "neutral",
      };
    default:
      return {
        label: "Oferta no disponible",
        tono: "neutral",
      };
  }
}

/**
 * Acciones de la empresa sobre una oferta de Mis ofertas, según el estado
 * (migration_051 y 052). Única fuente para el listado y el detalle.
 * Cada oferta muestra un solo botón de baja, para no confundir Eliminar con
 * Retirar, y nunca uno que la base vaya a rechazar:
 *   Eliminar  borrador, o rechazada o pendiente sin postulaciones (borrado
 *             lógico: se puede restaurar durante DIAS_RESTAURACION_OFERTA).
 *   Retirar   pendiente o rechazada con postulaciones, o activa (también
 *             vencida). La oferta queda cerrada y se cierran los procesos
 *             abiertos.
 *   Continuar borrador: lleva al formulario, que guarda o envía a revisión.
 *   Editar    activa o rechazada.
 */
export function accionesDisponibles(
  estado: string,
  cantidadPostulaciones: number
): {
  mostrarEliminar: boolean;
  mostrarRetirar: boolean;
  mostrarContinuar: boolean;
  mostrarEditar: boolean;
  mostrarCandidatosPorContactar: boolean;
} {
  const ninguna = {
    mostrarEliminar: false,
    mostrarRetirar: false,
    mostrarContinuar: false,
    mostrarEditar: false,
    mostrarCandidatosPorContactar: false,
  };
  switch (estado) {
    case "borrador":
      return { ...ninguna, mostrarEliminar: true, mostrarContinuar: true };
    case "pendiente_aprobacion":
      return {
        ...ninguna,
        mostrarEliminar: cantidadPostulaciones === 0,
        mostrarRetirar: cantidadPostulaciones > 0,
      };
    case "activa":
      return { ...ninguna, mostrarRetirar: true, mostrarEditar: true, mostrarCandidatosPorContactar: true };
    case "rechazada":
      // Tiene postulaciones si estuvo publicada, la empresa la editó y la
      // oficina rechazó la nueva versión: se retira para cerrar esos procesos.
      return {
        ...ninguna,
        mostrarEditar: true,
        mostrarEliminar: cantidadPostulaciones === 0,
        mostrarRetirar: cantidadPostulaciones > 0,
      };
    default: // cerrada
      return ninguna;
  }
}

/** Días para restaurar una oferta eliminada (ofertas_dias_restauracion(), migration_051). */
export const DIAS_RESTAURACION_OFERTA = 30;

/** Días que le quedan a una oferta eliminada antes de la purga (0 si ya no se puede restaurar). */
export function diasParaRestaurar(eliminadaEn: string, ahora: Date = new Date()): number {
  const limite = new Date(eliminadaEn).getTime() + DIAS_RESTAURACION_OFERTA * 86_400_000;
  return Math.max(0, Math.ceil((limite - ahora.getTime()) / 86_400_000));
}

// Short label for admin or status fields.
export function getOfertaEstadoLabel(estado: string): string {
  switch (estado) {
    case "activa":
      return "Activa";
    case "pendiente_aprobacion":
      return "Pendiente de aprobación";
    case "rechazada":
      return "Rechazada";
    case "cerrada":
      return "Cerrada";
    case "borrador":
      return "Borrador";
    default:
      return estado;
  }
}
