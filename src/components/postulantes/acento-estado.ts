import {
  CircleCheck,
  CircleX,
  Inbox,
  Lock,
  Search,
  Send,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { ESTILO_ETAPA } from "@/lib/estados-postulacion";
import type { ClaveEstadoMiPostulacion, FiltroMisPostulaciones } from "@/lib/mis-postulaciones";

// Color de acento (filete, cuadrado del ícono) e ícono de cada estado en las
// pantallas del postulante: panel y Mis postulaciones. El color es el del badge.

type Acento = { fondo: string; filete: string; icono: LucideIcon };

const de = (etapa: keyof typeof ESTILO_ETAPA): Omit<Acento, "icono"> => ({
  fondo: ESTILO_ETAPA[etapa].fondo,
  filete: ESTILO_ETAPA[etapa].filete,
});

/** Por estado de una postulación (BadgeMiPostulacion.clave). */
export const ACENTO_ESTADO: Record<ClaveEstadoMiPostulacion, Acento> = {
  recibida: { ...de("recibida"), icono: Inbox },
  "en-revision": { ...de("revision"), icono: Search },
  derivada: { ...de("derivada"), icono: Send },
  seleccionado: { ...de("seleccionado"), icono: CircleCheck },
  "no-seleccionado": { ...de("cerrado"), icono: CircleX },
  retirada: { ...de("cerrado"), icono: Undo2 },
  "oferta-cerrada": { ...de("cerrado"), icono: Lock },
};

/** Por cuadro del panel (filtro de Mis postulaciones). */
export const ACENTO_FILTRO: Record<FiltroMisPostulaciones, Acento> = {
  recibidas: ACENTO_ESTADO.recibida,
  "en-revision": ACENTO_ESTADO["en-revision"],
  derivadas: ACENTO_ESTADO.derivada,
  seleccionadas: ACENTO_ESTADO.seleccionado,
  "no-seleccionadas": ACENTO_ESTADO["no-seleccionado"],
  retiradas: ACENTO_ESTADO.retirada,
};
