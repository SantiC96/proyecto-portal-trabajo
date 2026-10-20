import Link from "next/link";
import { cn } from "@/lib/utils";

export type Contador = {
  label: string;
  valor: number;
  /** Clase de color del número (text-amber-700, text-emerald-700…). */
  color: string;
};

/**
 * Tarjetas con la cantidad de registros de cada estado, arriba de las
 * pestañas de un listado del panel. Son informativas: el filtro se cambia con
 * las pestañas.
 */
export function ContadoresEstado({
  contadores,
  className,
}: {
  contadores: Contador[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-3",
        contadores.length === 3 && "sm:grid-cols-3",
        contadores.length === 4 && "sm:grid-cols-4",
        contadores.length === 5 && "sm:grid-cols-3 lg:grid-cols-5",
        contadores.length >= 6 && "sm:grid-cols-3 lg:grid-cols-6",
        className,
      )}
    >
      {contadores.map((c) => (
        <div
          key={c.label}
          className="rounded-[var(--radius-lg)] border border-border bg-surface p-4"
        >
          <dt className="text-xs font-medium text-muted-foreground">{c.label}</dt>
          <dd className={cn("mt-1 text-2xl font-bold", c.color)}>{c.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

export type Pestana = {
  href: string;
  label: string;
  activa: boolean;
  /** Cantidad destacada al lado del texto (por ejemplo, pendientes). */
  cantidad?: number;
};

/** Barra de pestañas de estado de un listado del panel (filtro por URL). */
export function PestanasEstado({
  pestanas,
  etiqueta,
  className,
}: {
  pestanas: Pestana[];
  /** Nombre accesible de la barra: "Estado de las ofertas". */
  etiqueta: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={etiqueta}
      className={cn(
        "flex gap-1 overflow-x-auto rounded-[var(--radius-md)] border border-border bg-surface p-1",
        className,
      )}
    >
      {pestanas.map((p) => (
        <Link
          key={p.href}
          href={p.href}
          aria-current={p.activa ? "page" : undefined}
          className={cn(
            "flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-[var(--radius-sm)] px-3 py-2 text-center text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            p.activa
              ? "bg-primary font-medium text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {p.label}
          {(p.cantidad ?? 0) > 0 && (
            <span
              className={cn(
                "ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold",
                p.activa ? "bg-white/20 text-primary-foreground" : "bg-primary/15 text-primary",
              )}
            >
              {p.cantidad}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
