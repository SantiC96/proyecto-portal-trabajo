import type { ReactNode } from "react";
import { CircleCheck, CircleX, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconoCuadro } from "@/components/ui/icono-cuadro";

const FILETE = {
  pendiente: "before:bg-accent",
  aprobada: "before:bg-primary",
  rechazada: "before:bg-danger",
} as const;

export type EstadoDecision = keyof typeof FILETE;

/**
 * Tarjeta "Decisión" del detalle de la oficina: filete superior de 4 px del
 * color de `estado` (amarillo pendiente, verde aprobada, rojo rechazada), el
 * título con Scale, una bajada opcional y las acciones (`children`): los
 * botones a todo el ancho, el principal arriba y el de rechazo abajo. Una
 * decisión ya tomada va arriba de las acciones con ResultadoDecision.
 */
export function TarjetaDecision({
  id = "titulo-decision",
  titulo = "Decisión",
  descripcion,
  estado = "pendiente",
  children,
  className,
}: {
  id?: string;
  titulo?: string;
  descripcion?: ReactNode;
  estado?: EstadoDecision;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "tarjeta tarjeta-panel relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1",
        FILETE[estado],
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

/**
 * La decisión ya tomada, dentro de TarjetaDecision: recuadro verde suave con
 * CircleCheck (aprobada) o rojo suave con CircleX (rechazada), el texto en
 * 15 px 700 y, debajo, el motivo u otro detalle.
 */
export function ResultadoDecision({
  tono,
  children,
  detalle,
  className,
}: {
  tono: "aprobada" | "rechazada";
  /** "Aprobada el 12/10/2026 por Ana Pérez". */
  children: ReactNode;
  detalle?: ReactNode;
  className?: string;
}) {
  const Icono = tono === "aprobada" ? CircleCheck : CircleX;
  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-[14px] px-4 py-3 text-[15px] leading-snug",
        tono === "aprobada" ? "bg-primary/8 text-primary-hover" : "bg-danger/7 text-motivo-rechazo",
        className,
      )}
    >
      <Icono aria-hidden="true" className="mt-px size-5 shrink-0" />
      <div className="min-w-0 break-words">
        <p className="font-bold">{children}</p>
        {detalle && <div className="mt-1 text-sm whitespace-pre-line">{detalle}</div>}
      </div>
    </div>
  );
}
