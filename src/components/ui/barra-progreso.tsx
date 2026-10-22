import { cn } from "@/lib/utils";

type Props = {
  /** De 0 a 100. */
  porcentaje: number;
  /** Texto accesible, por ejemplo "Perfil completo al 70%". */
  etiqueta: string;
  className?: string;
};

/** Barra de 10 px de alto: fondo gris verdoso y avance en verde. */
export function BarraProgreso({ porcentaje, etiqueta, className }: Props) {
  const valor = Math.min(100, Math.max(0, Math.round(porcentaje)));
  return (
    <div
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={valor}
      className={cn("h-2.5 w-full overflow-hidden rounded-[5px] bg-progreso-fondo", className)}
    >
      <div className="h-full rounded-[5px] bg-primary" style={{ width: `${valor}%` }} />
    </div>
  );
}
