import type { TonoBadge } from "@/components/ui/badge";

/**
 * Colores de los estados de una postulación, iguales para el postulante, la
 * empresa y la oficina. De "Recibida" a "Seleccionado" es una escala de verdes
 * que se oscurece con el proceso; lo que terminó sin selección va en gris.
 * Los colores están en globals.css (--color-estado-*).
 */
export type EtapaPostulacion =
  | "recibida"
  | "revision"
  | "preentrevista"
  | "derivada"
  | "entrevista"
  | "seleccionado"
  | "cerrado";

export const ESTILO_ETAPA: Record<
  EtapaPostulacion,
  {
    tono: TonoBadge;
    /** Filete izquierdo de una fila o tarjeta. */
    filete: string;
    /** Cuadrado con ícono (cuadros del panel). */
    fondo: string;
  }
> = {
  recibida: {
    tono: "estado-recibida",
    filete: "before:bg-estado-recibida",
    fondo: "bg-estado-recibida text-estado-recibida-texto",
  },
  revision: {
    tono: "estado-revision",
    filete: "before:bg-estado-revision",
    fondo: "bg-estado-revision text-estado-revision-texto",
  },
  preentrevista: {
    tono: "estado-preentrevista",
    filete: "before:bg-estado-preentrevista",
    fondo: "bg-estado-preentrevista text-estado-preentrevista-texto",
  },
  derivada: {
    tono: "estado-derivada",
    filete: "before:bg-estado-derivada",
    fondo: "bg-estado-derivada text-estado-derivada-texto",
  },
  entrevista: {
    tono: "estado-entrevista",
    filete: "before:bg-estado-entrevista",
    fondo: "bg-estado-entrevista text-estado-entrevista-texto",
  },
  seleccionado: {
    tono: "estado-seleccionado",
    filete: "before:bg-estado-seleccionado",
    fondo: "bg-estado-seleccionado text-estado-seleccionado-texto",
  },
  cerrado: {
    tono: "estado-cerrado",
    filete: "before:bg-estado-cerrado",
    fondo: "bg-estado-cerrado text-estado-cerrado-texto",
  },
};
