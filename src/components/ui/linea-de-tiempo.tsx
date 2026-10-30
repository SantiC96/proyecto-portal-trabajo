import type { ReactNode } from "react";
import { CircleCheck, CircleX, Clock, Search, Send, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconoCuadro } from "@/components/ui/icono-cuadro";

export type EventoLinea = {
  /** Clave estable del evento. */
  clave: string;
  titulo: ReactNode;
  /** Quién y cuándo, si se sabe. */
  detalle?: ReactNode;
  /**
   * Solo para mostrar pasos (lo hecho, el paso actual y lo que falta). Sin
   * estado, el último evento es el resaltado.
   */
  estado?: "hecho" | "actual" | "pendiente";
  /**
   * Con ícono, el evento va con su ícono en un cuadrado de 44 px del color
   * de `claseIcono` en lugar del punto (últimos movimientos del panel).
   */
  icono?: LucideIcon;
  claseIcono?: string;
  /** A la derecha del texto (un badge); en angosto, debajo. Solo con ícono. */
  extra?: ReactNode;
  /** Debajo del detalle: el motivo de un rechazo (MotivoRechazo). Solo con ícono. */
  nota?: ReactNode;
};

/** Ícono y color de cada tipo de evento del historial de revisión (variante "historial"). */
export const ICONO_HISTORIAL = {
  enviado: { icono: Send, claseIcono: "bg-neutral" },
  revisado: { icono: Search, claseIcono: "bg-info" },
  aprobado: { icono: CircleCheck, claseIcono: "bg-primary" },
  rechazado: { icono: CircleX, claseIcono: "bg-danger" },
  actualizado: { icono: Clock, claseIcono: "bg-teal" },
} satisfies Record<string, { icono: LucideIcon; claseIcono: string }>;

/** Motivo de un rechazo dentro del historial: recuadro rojo suave con "Motivo:" en negrita. */
export function MotivoRechazo({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 rounded-[10px] bg-danger/7 px-3 py-2 text-sm leading-normal break-words whitespace-pre-line text-motivo-rechazo">
      <strong className="font-bold">Motivo:</strong> {children}
    </p>
  );
}

/**
 * Historial en orden: un punto de 12 px por evento unido por una línea
 * vertical. El último (el más reciente) va en verde con un anillo. Con
 * `estado`, el resaltado es el paso "actual" y los "pendiente" van con el
 * punto hueco y el texto en gris.
 */
export function LineaDeTiempo({
  eventos,
  variante,
  className,
}: {
  eventos: EventoLinea[];
  /**
   * "historial" (revisión de la oficina): cada evento con ícono en un
   * cuadrado de 40 px (ICONO_HISTORIAL), el título en 800 y la fecha y el
   * autor en gris debajo.
   */
  variante?: "historial";
  className?: string;
}) {
  return (
    <ol className={cn("flex flex-col", className)}>
      {eventos.map((e, i) => {
        const ultimo = i === eventos.length - 1;
        if (variante === "historial") return <EventoHistorial key={e.clave} evento={e} ultimo={ultimo} />;
        if (e.icono) return <EventoConIcono key={e.clave} evento={e} ultimo={ultimo} />;
        const actual = e.estado ? e.estado === "actual" : ultimo;
        const pendiente = e.estado === "pendiente";
        return (
          <li
            key={e.clave}
            aria-current={e.estado === "actual" ? "step" : undefined}
            className="relative flex gap-3.5 pb-5 last:pb-0"
          >
            {!ultimo && (
              <span
                aria-hidden="true"
                className="absolute top-[18px] bottom-0 left-[5px] w-0.5 bg-border"
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                "relative mt-[5px] size-3 shrink-0 rounded-full",
                actual
                  ? "bg-primary shadow-[0_0_0_4px_rgb(0_104_51/0.18)]"
                  : pendiente
                    ? "border-2 border-muted-icon bg-surface"
                    : "bg-muted-icon",
              )}
            />
            <div className="min-w-0">
              <p
                className={cn(
                  "text-[15px] leading-[1.45] font-bold",
                  pendiente ? "text-muted-foreground" : "text-heading",
                )}
              >
                {e.titulo}
                {pendiente && <span className="sr-only"> (pendiente)</span>}
              </p>
              {e.detalle && (
                <p className="mt-0.5 text-sm break-words text-muted-foreground">{e.detalle}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Evento con ícono de 44 px; la línea de 2 px (`secondary-hover`) lo une con
 * el siguiente. El texto y `extra` van lado a lado desde 28 rem de ancho
 * disponible (container query de la lista: la usa quien la contenga).
 */
function EventoConIcono({ evento: e, ultimo }: { evento: EventoLinea; ultimo: boolean }) {
  return (
    <li className="relative flex gap-3.5 pb-5 last:pb-0">
      {!ultimo && (
        <span
          aria-hidden="true"
          className="absolute top-12 bottom-1 left-[21px] w-0.5 rounded-full bg-secondary-hover"
        />
      )}
      {e.icono && <IconoCuadro icono={e.icono} tamano={44} className={e.claseIcono} />}
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2 @md:flex-row @md:justify-between @md:gap-4">
        <div className="min-w-0 text-[15px] leading-[1.45] text-foreground">
          <p className="break-words">{e.titulo}</p>
          {e.detalle && <div className="mt-0.5 break-words">{e.detalle}</div>}
        </div>
        {e.extra && <div className="shrink-0">{e.extra}</div>}
      </div>
    </li>
  );
}

/** Evento del historial: ícono de 40 px unido al siguiente por una línea de 2 px. */
function EventoHistorial({ evento: e, ultimo }: { evento: EventoLinea; ultimo: boolean }) {
  return (
    <li className="relative flex gap-3.5 pb-5 last:pb-0">
      {!ultimo && (
        <span
          aria-hidden="true"
          className="absolute top-11 bottom-1 left-[19px] w-0.5 rounded-full bg-secondary-hover"
        />
      )}
      {e.icono && <IconoCuadro icono={e.icono} className={e.claseIcono} />}
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[15px] leading-snug font-extrabold break-words text-heading">{e.titulo}</p>
        {e.detalle && (
          <p className="mt-0.5 text-sm break-words text-muted-foreground">{e.detalle}</p>
        )}
        {e.nota}
      </div>
    </li>
  );
}
