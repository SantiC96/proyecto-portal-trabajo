// Etiquetas y columnas del listado: las usan la página y loading.tsx.

import type { EstadoFiltroAdmin } from "@/lib/admin/filtro-ofertas";

export const LABEL_FILTRO: Record<EstadoFiltroAdmin, string> = {
  pendiente_aprobacion: "Por revisar",
  activa: "Activas",
  vencida: "Vencidas",
  rechazada: "Rechazadas",
  cerrada: "Cerradas",
};

// Oferta | Empresa | Fecha | Estado | acción.
export const COLUMNAS =
  "minmax(0,2fr) minmax(0,1.3fr) minmax(max-content,.8fr) minmax(0,1.1fr) minmax(max-content,.6fr)";
