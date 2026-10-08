export type OfertaEstadoBadge = {
  label: string;
  descripcion?: string;
  className: string;
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
        className: "bg-amber-100 text-amber-700",
      };
    case "rechazada":
      return {
        label: "Oferta rechazada",
        className: "bg-red-100 text-red-700",
      };
    case "cerrada":
      return {
        label: "Oferta cerrada",
        className: "bg-gray-200 text-gray-600",
      };
    default:
      return {
        label: "Oferta no disponible",
        className: "bg-gray-200 text-gray-600",
      };
  }
}

// Determines which action button(s) to show per offer state.
// Single source of truth for both the list and any detail view.
export function accionesDisponibles(
  estado: string,
  cantidadPostulaciones: number
): { mostrarEliminar: boolean; mostrarCerrar: boolean } {
  switch (estado) {
    case "pendiente_aprobacion":
      return cantidadPostulaciones === 0
        ? { mostrarEliminar: true, mostrarCerrar: false }
        : { mostrarEliminar: false, mostrarCerrar: true };
    case "activa":
      return { mostrarEliminar: false, mostrarCerrar: true };
    case "rechazada":
      // Rejected offers were never published and never received applications.
      return { mostrarEliminar: true, mostrarCerrar: false };
    default: // cerrada y cualquier otro
      return { mostrarEliminar: false, mostrarCerrar: false };
  }
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
    default:
      return estado;
  }
}
