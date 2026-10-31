// Etiquetas y columnas del listado: las usan la página y loading.tsx.

import type { EstadoAprobacion } from "@/lib/admin/historial-empresa";

export const LABELS: Record<EstadoAprobacion, string> = {
  pendiente: "Pendientes",
  aprobada: "Aprobadas",
  rechazada: "Rechazadas",
};

// Razón social | CUIT | Rubro | Persona responsable | Solicitud | acción.
export const COLUMNAS =
  "minmax(0,1.6fr) minmax(max-content,1fr) minmax(0,1.2fr) minmax(0,1.2fr) minmax(max-content,.8fr) minmax(max-content,.6fr)";
