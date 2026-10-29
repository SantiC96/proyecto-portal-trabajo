import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { cn } from "@/lib/utils";

/**
 * Tabla de un listado del panel. Desde 896 px de ancho disponible (la sidebar
 * le quita ancho al contenido) es una tabla con encabezado; más angosto, cada
 * fila es una tarjeta con los mismos datos y la acción a todo el ancho.
 *
 * Encabezado y filas comparten una sola grilla (`columnas`) con subgrid: una
 * columna `auto` mide lo mismo en el encabezado (vacío) que en las filas (el
 * botón). Con una grilla por fila, cada una repartía el ancho distinto y los
 * rótulos quedaban corridos respecto de su columna. El encabezado es visual
 * (aria-hidden): cada celda lleva su rótulo para los lectores de pantalla con
 * `CeldaTabla etiqueta`.
 */
export function Tabla({
  columnas,
  encabezados,
  etiqueta,
  children,
  className,
}: {
  /** Columnas de la grilla: "minmax(0,2fr) 8rem auto". */
  columnas: string;
  encabezados: ReactNode[];
  /** Nombre accesible de la lista: "Candidatos derivados". */
  etiqueta: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("@container", className)}
      style={{ "--columnas-tabla": columnas } as CSSProperties}
    >
      <div className="@4xl:overflow-hidden @4xl:rounded-[var(--radius-xl)] @4xl:border @4xl:border-border @4xl:bg-surface @4xl:shadow-[var(--sombra-tarjeta)] @4xl:grid @4xl:grid-cols-(--columnas-tabla) @4xl:gap-x-4">
        <div
          aria-hidden="true"
          className="hidden bg-tabla-cabecera px-4 py-3 text-xs font-bold tracking-[0.06em] text-neutral uppercase @4xl:col-span-full @4xl:grid @4xl:grid-cols-subgrid @4xl:gap-x-4"
        >
          {encabezados.map((e, i) => (
            <span key={i}>{e}</span>
          ))}
        </div>
        <ul
          aria-label={etiqueta}
          className="flex flex-col gap-3 @4xl:col-span-full @4xl:grid @4xl:grid-cols-subgrid @4xl:gap-x-4 @4xl:gap-y-0"
        >
          {children}
        </ul>
      </div>
    </div>
  );
}

/**
 * Una fila: tarjeta de padding 16 en angosto; en la tabla, 14 × 16 con borde inferior.
 *
 * `detalle` va debajo de las celdas, dentro de la misma fila y a todo el ancho
 * (aclaraciones, un motivo de rechazo): comparte el hover y el borde de la fila.
 */
export function FilaTabla({
  children,
  detalle,
  id,
  className,
}: {
  children: ReactNode;
  detalle?: ReactNode;
  /** Ancla de la fila (#id): deja lugar arriba para el encabezado fijo. */
  id?: string;
  className?: string;
}) {
  return (
    <li
      id={id}
      className={cn(
        "flex flex-col gap-3 rounded-[var(--radius-xl)] border border-border bg-surface p-4 text-[15px] text-foreground shadow-[var(--sombra-tarjeta)] transition-colors duration-150 motion-reduce:transition-none",
        "@4xl:col-span-full @4xl:grid @4xl:grid-cols-subgrid @4xl:items-center @4xl:gap-x-4 @4xl:rounded-none @4xl:shadow-none @4xl:border-x-0 @4xl:border-t-0 @4xl:border-b-tabla-borde @4xl:px-4 @4xl:py-3.5 @4xl:last:border-b-0 @4xl:hover:bg-tabla-fila-hover",
        id && "scroll-mt-20",
        className,
      )}
    >
      {children}
      {detalle && (
        <div className="flex min-w-0 flex-col items-start gap-3 @4xl:col-span-full">{detalle}</div>
      )}
    </li>
  );
}

/**
 * Separador entre dos grupos de filas ("Ya invitados a esta oferta"): un
 * título entre líneas, a todo el ancho de la tabla.
 */
export function SeparadorTabla({ children }: { children: ReactNode }) {
  return (
    <li className="pt-3 @4xl:col-span-full @4xl:border-b @4xl:border-b-tabla-borde @4xl:bg-tabla-cabecera @4xl:px-4 @4xl:py-2.5">
      <h2 className="flex items-center gap-3 text-sm font-semibold text-muted-foreground-strong">
        <span className="h-px flex-1 bg-border @4xl:hidden" aria-hidden="true" />
        {children}
        <span className="h-px flex-1 bg-border @4xl:hidden" aria-hidden="true" />
      </h2>
    </li>
  );
}

/**
 * Celda con su rótulo. En la tabla el rótulo es solo para lectores de
 * pantalla; en la tarjeta se ve si `rotuloVisible`.
 */
export function CeldaTabla({
  etiqueta,
  rotuloVisible = false,
  children,
  className,
}: {
  etiqueta: string;
  rotuloVisible?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 break-words", className)}>
      <span
        className={cn(
          rotuloVisible ? "text-sm font-bold text-neutral @4xl:sr-only" : "sr-only",
        )}
      >
        {etiqueta}
        {rotuloVisible ? " " : ": "}
      </span>
      {children}
    </div>
  );
}

/** Celda "quién": foto o iniciales en 40 px y el nombre (link) en 15 px 700. */
export function CeldaPersona({
  nombre,
  href,
  iniciales,
  foto,
  children,
  className,
}: {
  nombre: string;
  href?: string;
  iniciales?: string;
  foto?: { url: string | null; ajuste?: { x: number; y: number; zoom: number } };
  /** Algo debajo del nombre (un badge, la empresa). */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <AvatarAjustado
        src={foto?.url ?? null}
        alt=""
        ajuste={foto?.ajuste}
        iniciales={iniciales}
        size="lista"
      />
      <div className="flex min-w-0 flex-col items-start gap-1">
        {href ? (
          <Link
            href={href}
            className="rounded-[var(--radius-sm)] text-[15px] leading-snug font-bold break-words text-heading no-underline outline-none hover:text-primary hover:underline focus-visible:shadow-[var(--sombra-foco)]"
          >
            {nombre}
          </Link>
        ) : (
          <span className="text-[15px] leading-snug font-bold break-words text-heading">{nombre}</span>
        )}
        {children}
      </div>
    </div>
  );
}

/** Clases de una acción de la fila: a todo el ancho en la tarjeta, 40 px en la tabla. */
export const CLASE_ACCION_FILA =
  "w-full whitespace-nowrap @4xl:w-auto @4xl:min-h-10! @4xl:px-3.5! @4xl:text-sm!";
