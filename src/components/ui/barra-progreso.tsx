import { cn } from "@/lib/utils";

type Props = {
  /** De 0 a 100. */
  porcentaje: number;
  /** Texto accesible, por ejemplo "Perfil completo al 70%". */
  etiqueta: string;
  /** 8 px de alto con fondo `secondary-hover` (vacantes del detalle de la oferta). */
  fina?: boolean;
  className?: string;
};

/** Barra de 10 px de alto (8 con `fina`): fondo gris verdoso y avance en verde. */
export function BarraProgreso({ porcentaje, etiqueta, fina = false, className }: Props) {
  const valor = Math.min(100, Math.max(0, Math.round(porcentaje)));
  return (
    <div
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={valor}
      className={cn(
        "w-full overflow-hidden",
        fina ? "h-2 rounded-[4px] bg-secondary-hover" : "h-2.5 rounded-[5px] bg-progreso-fondo",
        className,
      )}
    >
      <div
        className={cn("h-full bg-primary", fina ? "rounded-[4px]" : "rounded-[5px]")}
        style={{ width: `${valor}%` }}
      />
    </div>
  );
}
