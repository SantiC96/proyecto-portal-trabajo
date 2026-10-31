// Etiquetas y columnas del listado: las usan la página y loading.tsx.

import type { PestanaComprobantes } from "@/lib/admin/filtro-comprobantes";

export const LABEL_PESTANA: Record<PestanaComprobantes, string> = {
  "por-revisar": "Por revisar",
  revisados: "Revisados",
};

// Postulante | Localidad | Domicilio declarado | Cargado el | Comprobante | acciones o resultado.
export const COLUMNAS_TABLA =
  "minmax(0,1.5fr) minmax(0,.8fr) minmax(0,1fr) minmax(max-content,.9fr) minmax(max-content,1fr) minmax(max-content,1.6fr)";
