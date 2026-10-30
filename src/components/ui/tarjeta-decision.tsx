import type { ReactNode } from "react";
import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconoCuadro } from "@/components/ui/icono-cuadro";

/**
 * Tarjeta "Decisión" del detalle de la oficina: filete superior de 4 px
 * (amarillo si la decisión está pendiente, verde si ya se resolvió), el
 * título con Scale, una bajada opcional y las acciones (`children`): los
 * botones a todo el ancho, el principal arriba y el de rechazo abajo.
 */
export function TarjetaDecision({
  id = "titulo-decision",
  titulo = "Decisión",
  descripcion,
  resuelta = false,
  children,
  className,
}: {
  id?: string;
  titulo?: string;
  descripcion?: ReactNode;
  resuelta?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "tarjeta tarjeta-panel relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1",
        resuelta ? "before:bg-primary" : "before:bg-accent",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <IconoCuadro icono={Scale} />
        <h2 id={id} className="text-xl leading-tight font-extrabold text-heading">
          {titulo}
        </h2>
      </div>
      {descripcion && <p className="mt-3 text-[15px] text-muted-foreground-strong">{descripcion}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
