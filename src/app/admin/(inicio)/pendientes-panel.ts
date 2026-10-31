import { UMBRAL_RECHAZOS_CURSO } from "@/lib/cursos";

/** Títulos de los cuadros de Pendientes del panel, en orden: los usan la página y loading.tsx. */
export const TITULOS_PENDIENTES = [
  "Postulaciones por revisar",
  "Ofertas por aprobar",
  "Empresas por aprobar",
  "Comprobantes por revisar",
  `Postulantes con ${UMBRAL_RECHAZOS_CURSO} o más rechazos`,
] as const;
