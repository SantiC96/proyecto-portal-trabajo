import Link from "next/link";
import { cn } from "@/lib/utils";

export type Contador = {
  label: string;
  valor: number;
  /** Tono del número; los pendientes van en "warning". Sin tono, el color del texto. */
  tono?: TonoContador;
};

export type TonoContador = "info" | "teal" | "success" | "warning" | "danger" | "neutral" | "primary";

// Colores de texto con contraste AA sobre blanco.
const COLOR_CONTADOR: Record<TonoContador, string> = {
  info: "text-info",
  teal: "text-teal",
  success: "text-success",
  warning: "text-warning-text",
  danger: "text-danger",
  neutral: "text-muted-foreground-strong",
  primary: "text-primary",
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
          className="tarjeta p-4"
        >
          <dt className="text-sm font-semibold text-muted-foreground">{c.label}</dt>
          <dd
            className={cn(
              "mt-1 text-2xl font-extrabold",
              c.tono ? COLOR_CONTADOR[c.tono] : "text-heading",
            )}
          >
            {c.valor}
          </dd>
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
        "flex gap-2 overflow-x-auto pb-1",
        className,
      )}
    >
      {pestanas.map((p) => (
        <Link
          key={p.href}
          href={p.href}
          aria-current={p.activa ? "page" : undefined}
          className={cn(
            "flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-full border-[1.5px] px-4 py-2 text-center text-[15px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:shadow-[var(--sombra-foco)]",
            p.activa
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border-tab bg-surface text-muted-foreground-strong hover:border-primary hover:text-primary",
          )}
        >
          {p.label}
          {(p.cantidad ?? 0) > 0 && (
            <span
              className={cn(
                "ml-2 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-accent px-1.5 text-[13px] font-bold text-accent-foreground",
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
