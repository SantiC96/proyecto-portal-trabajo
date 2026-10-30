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
import type { ClaveEstadoMiPostulacion, FiltroMisPostulaciones } from "@/lib/mis-postulaciones";

// Color de acento (filete, cuadrado del ícono) e ícono de cada estado en las
// pantallas del postulante: panel y Mis postulaciones. El color es el del
// badge, salvo retirada y oferta cerrada, que van más apagadas (`muted-icon`)
// porque el proceso terminó sin resultado. El badge no cambia.

type Acento = { fondo: string; filete: string; icono: LucideIcon };

const INFO: Omit<Acento, "icono"> = { fondo: "bg-info", filete: "before:bg-info" };
const TEAL: Omit<Acento, "icono"> = { fondo: "bg-teal", filete: "before:bg-teal" };
const SUCCESS: Omit<Acento, "icono"> = { fondo: "bg-success", filete: "before:bg-success" };
const NEUTRAL: Omit<Acento, "icono"> = { fondo: "bg-neutral", filete: "before:bg-neutral" };
const APAGADO: Omit<Acento, "icono"> = { fondo: "bg-muted-icon", filete: "before:bg-muted-icon" };

/** Por estado de una postulación (BadgeMiPostulacion.clave). */
export const ACENTO_ESTADO: Record<ClaveEstadoMiPostulacion, Acento> = {
  // Recibida cuenta dentro de "En revisión" en el panel: va con su color.
  recibida: { ...INFO, icono: Inbox },
  "en-revision": { ...INFO, icono: Search },
  derivada: { ...TEAL, icono: Send },
  seleccionado: { ...SUCCESS, icono: CircleCheck },
  "no-seleccionado": { ...NEUTRAL, icono: CircleX },
  retirada: { ...APAGADO, icono: Undo2 },
  "oferta-cerrada": { ...APAGADO, icono: Lock },
};

/** Por cuadro del panel (filtro de Mis postulaciones). */
export const ACENTO_FILTRO: Record<FiltroMisPostulaciones, Acento> = {
  "en-revision": ACENTO_ESTADO["en-revision"],
  derivadas: ACENTO_ESTADO.derivada,
  seleccionadas: ACENTO_ESTADO.seleccionado,
  "no-seleccionadas": ACENTO_ESTADO["no-seleccionado"],
  retiradas: ACENTO_ESTADO.retirada,
};
