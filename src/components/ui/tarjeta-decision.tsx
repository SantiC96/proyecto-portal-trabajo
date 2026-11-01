import type { ReactNode } from "react";
import { CircleCheck, CircleX, Scale, Send, Undo2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ESTILO_ETAPA } from "@/lib/estados-postulacion";
import { IconoCuadro } from "@/components/ui/icono-cuadro";

const FILETE = {
  pendiente: "before:bg-accent",
  aprobada: "before:bg-primary",
  rechazada: "before:bg-danger",
  /** Postulación derivada a la empresa, esperando su resultado. */
  derivada: ESTILO_ETAPA.derivada.filete,
  /** Cerrada sin decisión (retirada por el postulante o por la empresa). */
  cerrada: ESTILO_ETAPA.cerrado.filete,
} as const;

export type EstadoDecision = keyof typeof FILETE;

/**
 * Tarjeta "Decisión" del detalle de la oficina: filete superior de 4 px del
 * color de `estado` (amarillo pendiente, verde aprobada, rojo rechazada, teal
 * derivada y gris claro cerrada), el
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

const RESULTADO = {
  aprobada: { clase: "bg-primary/8 text-primary-hover", icono: CircleCheck },
  rechazada: { clase: "bg-danger/7 text-motivo-rechazo", icono: CircleX },
  derivada: { clase: "bg-teal/8 text-teal", icono: Send },
  cerrada: { clase: "bg-secondary text-muted-foreground-strong", icono: Undo2 },
} satisfies Record<string, { clase: string; icono: LucideIcon }>;

/**
 * La decisión ya tomada, dentro de TarjetaDecision: recuadro verde suave con
 * CircleCheck (aprobada), rojo suave con CircleX (rechazada), teal suave con
 * Send (derivada) o gris con Undo2 (cerrada), el texto en 15 px 700 y, debajo,
 * el motivo u otro detalle.
 */
export function ResultadoDecision({
  tono,
  icono,
  children,
  detalle,
  className,
}: {
  tono: keyof typeof RESULTADO;
  /** Otro ícono que el del tono. */
  icono?: LucideIcon;
  /** "Aprobada el 12/10/2026 por Ana Pérez". */
  children: ReactNode;
  detalle?: ReactNode;
  className?: string;
}) {
  const Icono = icono ?? RESULTADO[tono].icono;
  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-[14px] px-4 py-3 text-[15px] leading-snug",
        RESULTADO[tono].clase,
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
