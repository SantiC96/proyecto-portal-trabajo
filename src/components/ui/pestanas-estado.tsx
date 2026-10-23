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

/**
 * Barra de pestañas de estado de un listado del panel (filtro por URL), con
 * subrayado: la activa en verde con aria-current. En el celular se desplaza de
 * costado.
 */
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
        // La línea de 2 px es una sombra interna: con el scroll horizontal, un
        // borde recortaría el subrayado de la pestaña activa.
        "sin-barra-scroll flex overflow-x-auto shadow-[inset_0_-2px_0_var(--color-border)]",
        className,
      )}
    >
      {pestanas.map((p) => (
        <Link
          key={p.href}
          href={p.href}
          aria-current={p.activa ? "page" : undefined}
          className={cn(
            // El subrayado de 3 px tapa la línea de 2 px de la barra.
            "flex h-12 shrink-0 items-center gap-2 border-b-[3px] px-3.5 text-[15px] whitespace-nowrap no-underline transition-colors duration-150 outline-none",
            "focus-visible:rounded-t-[var(--radius-sm)] focus-visible:shadow-[inset_0_0_0_3px_rgb(0_104_51/0.25)]",
            p.activa
              ? "border-primary font-extrabold text-primary"
              : "border-transparent font-semibold text-texto-pestana hover:border-border-strong hover:text-primary",
          )}
        >
          {p.label}
          {p.cantidad !== undefined && (
            <span
              className={cn(
                "inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-[13px] leading-none font-bold tabular-nums",
                p.activa
                  ? "bg-primary text-primary-foreground"
                  : "bg-pastilla-gris text-control-foreground",
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
