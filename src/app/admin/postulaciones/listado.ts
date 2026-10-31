// Pestañas, etiquetas y columnas del listado: las usan la página y loading.tsx.

import type { PestanaPostulaciones } from "@/lib/admin/postulaciones-pestanas";

type EstadoFiltro = PestanaPostulaciones;

export const ESTADOS_FILTRO: EstadoFiltro[] = [
  "pendiente",
  "derivada",
  "contratado",
  "rechazada_municipalidad",
  "retirada_postulante",
];

export const LABEL_FILTRO: Record<EstadoFiltro, string> = {
  pendiente: "Pendientes",
  derivada: "Derivadas",
  contratado: "Contratado",
  rechazada_municipalidad: "No seleccionado",
  retirada_postulante: "Retiradas",
};

// Postulante | Oferta y empresa | Fecha | Estado | acción.
export const COLUMNAS =
  "minmax(0,1.7fr) minmax(0,1.5fr) minmax(max-content,.7fr) minmax(0,1.2fr) minmax(max-content,.6fr)";
