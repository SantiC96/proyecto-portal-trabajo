export type EstadoPostulacion =
  | "recibida"
  | "en_revision"
  | "derivada"
  | "rechazada_municipalidad";

export const BADGE_CONFIG: Record<
  EstadoPostulacion,
  {
    label: string;
    variant: "secondary" | "outline" | "default" | "destructive";
    className?: string;
  }
> = {
  recibida: { label: "Recibida", variant: "secondary" },
  en_revision: {
    label: "En revisión",
    variant: "outline",
    className: "text-blue-700",
  },
  derivada: { label: "Derivada", variant: "default" },
  rechazada_municipalidad: { label: "No seleccionada", variant: "destructive" },
};
