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
 *
 * `variante="incrustada"` es para una tabla chica dentro de una tarjeta
 * (Últimas postulaciones de los indicadores): sin el borde ni la sombra de
 * tarjeta, y es tabla desde 320 px de ancho (más angosta, filas apiladas
 * separadas por una línea). Las filas van con la misma variante.
 *
 * `semantica="tabla"` (Mis ofertas): roles ARIA de tabla (`table`, `row`,
 * `columnheader`, `cell`) en lugar de una lista. El encabezado deja de ser
 * `aria-hidden`: en angosto queda solo para lectores de pantalla. Las celdas
 * llevan `role="cell"` (las pone la página) y las filas, la misma semántica.
 */
export function Tabla({
  columnas,
  encabezados,
  etiqueta,
  variante = "tarjeta",
  semantica = "lista",
  children,
  className,
}: {
  /** Columnas de la grilla: "minmax(0,2fr) 8rem auto". */
  columnas: string;
  encabezados: ReactNode[];
  /** Nombre accesible de la lista: "Candidatos derivados". */
  etiqueta: string;
  variante?: VarianteTabla;
  semantica?: SemanticaTabla;
  children: ReactNode;
  className?: string;
}) {
  const incrustada = variante === "incrustada";
  const comoTabla = semantica === "tabla";
  return (
    <div
      className={cn("@container", className)}
      style={{ "--columnas-tabla": columnas } as CSSProperties}
    >
      <div
        role={comoTabla ? "table" : undefined}
        aria-label={comoTabla ? etiqueta : undefined}
        className={
          incrustada
            ? "@xs:grid @xs:grid-cols-(--columnas-tabla) @xs:gap-x-3"
            : "@4xl:overflow-hidden @4xl:rounded-[var(--radius-xl)] @4xl:border @4xl:border-border @4xl:bg-surface @4xl:shadow-[var(--sombra-tarjeta)] @4xl:grid @4xl:grid-cols-(--columnas-tabla) @4xl:gap-x-4"
        }
      >
        {comoTabla ? (
          <div
            role="row"
            className="sr-only @4xl:not-sr-only @4xl:col-span-full @4xl:grid @4xl:grid-cols-subgrid @4xl:gap-x-4 @4xl:bg-tabla-cabecera @4xl:py-3 @4xl:pr-4 @4xl:pl-[21px] @4xl:text-xs @4xl:font-extrabold @4xl:tracking-[0.06em] @4xl:text-neutral @4xl:uppercase"
          >
            {encabezados.map((e, i) => (
              <span key={i} role="columnheader">
                {e}
              </span>
            ))}
          </div>
        ) : (
          <div
            aria-hidden="true"
            className={
              incrustada
                ? "hidden rounded-[var(--radius-sm)] bg-tabla-cabecera px-3 py-2.5 text-xs font-bold tracking-[0.06em] text-neutral uppercase @xs:col-span-full @xs:grid @xs:grid-cols-subgrid @xs:gap-x-3"
                : "hidden bg-tabla-cabecera px-4 py-3 text-xs font-bold tracking-[0.06em] text-neutral uppercase @4xl:col-span-full @4xl:grid @4xl:grid-cols-subgrid @4xl:gap-x-4"
            }
          >
            {encabezados.map((e, i) => (
              <span key={i}>{e}</span>
            ))}
          </div>
        )}
        {comoTabla ? (
          <div
            role="rowgroup"
            className="flex flex-col gap-3 @4xl:col-span-full @4xl:grid @4xl:grid-cols-subgrid @4xl:gap-x-4 @4xl:gap-y-0"
          >
            {children}
          </div>
        ) : (
          <ul
            aria-label={etiqueta}
            className={
              incrustada
                ? "flex flex-col @xs:col-span-full @xs:grid @xs:grid-cols-subgrid @xs:gap-x-3"
                : "flex flex-col gap-3 @4xl:col-span-full @4xl:grid @4xl:grid-cols-subgrid @4xl:gap-x-4 @4xl:gap-y-0"
            }
          >
            {children}
          </ul>
        )}
      </div>
    </div>
  );
}

export type VarianteTabla = "tarjeta" | "incrustada";
export type SemanticaTabla = "lista" | "tabla";

/**
 * Una fila: tarjeta de padding 16 en angosto; en la tabla, 14 × 16 con borde inferior.
 *
 * `detalle` va debajo de las celdas, dentro de la misma fila (aclaraciones, un
 * motivo de rechazo): comparte el hover y el borde de la fila. En la tabla
 * ocupa solo la primera columna, para que se lea como parte de esa celda y no
 * se mezcle con las de al lado; en la tarjeta, todo el ancho.
 *
 * `filete` (`before:bg-*`): filete izquierdo de 5 px del color del estado,
 * en la tarjeta y en la tabla (Mis ofertas).
 */
export function FilaTabla({
  children,
  detalle,
  variante = "tarjeta",
  semantica = "lista",
  filete,
  className,
}: {
  children: ReactNode;
  detalle?: ReactNode;
  /** La misma de su Tabla. */
  variante?: VarianteTabla;
  /** La misma de su Tabla. */
  semantica?: SemanticaTabla;
  filete?: string;
  className?: string;
}) {
  const Fila = semantica === "tabla" ? "div" : "li";
  return (
    <Fila
      role={semantica === "tabla" ? "row" : undefined}
      className={cn(
        variante === "incrustada"
          ? "flex flex-col gap-1.5 border-b border-tabla-borde px-1 py-3 text-[15px] text-foreground transition-colors duration-150 last:border-b-0 motion-reduce:transition-none @xs:col-span-full @xs:grid @xs:grid-cols-subgrid @xs:items-center @xs:gap-x-3 @xs:px-3"
          : [
              "flex flex-col gap-3 rounded-[var(--radius-xl)] border border-border bg-surface p-4 text-[15px] text-foreground shadow-[var(--sombra-tarjeta)] transition-colors duration-150 motion-reduce:transition-none",
              "@4xl:col-span-full @4xl:grid @4xl:grid-cols-subgrid @4xl:items-center @4xl:gap-x-4 @4xl:rounded-none @4xl:shadow-none @4xl:border-x-0 @4xl:border-t-0 @4xl:border-b-tabla-borde @4xl:px-4 @4xl:py-3.5 @4xl:last:border-b-0 @4xl:hover:bg-tabla-fila-hover",
            ],
        filete && [
          "relative overflow-hidden pl-[21px] before:absolute before:inset-y-0 before:left-0 before:w-[5px] @4xl:pl-[21px]",
          filete,
        ],
        className,
      )}
    >
      {children}
      {detalle && (
        <div
          role={semantica === "tabla" ? "cell" : undefined}
          className="flex min-w-0 flex-col items-start gap-3 @4xl:col-start-1 @4xl:col-end-2"
        >
          {detalle}
        </div>
      )}
    </Fila>
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

/**
 * Celda "quién": foto, logo o iniciales en un círculo de 40 px y el nombre
 * (link) en 15 px 700. Con `secundario` (pantallas de la oficina), el nombre
 * va en 800 y debajo una línea gris de 13 px: DNI, teléfono o CUIT. Con
 * `secundarioSoloTarjeta`, esa línea se ve solo en la tarjeta del celular
 * (el dato tiene su propia columna en la tabla, como el CUIT en Empresas).
 */
export function CeldaPersona({
  nombre,
  href,
  iniciales,
  foto,
  secundario,
  secundarioSoloTarjeta = false,
  children,
  className,
}: {
  nombre: string;
  href?: string;
  iniciales?: string;
  foto?: { url: string | null; ajuste?: { x: number; y: number; zoom: number } };
  secundario?: ReactNode;
  secundarioSoloTarjeta?: boolean;
  /** Algo debajo del nombre (un badge, la empresa). */
  children?: ReactNode;
  className?: string;
}) {
  const peso = secundario !== undefined ? "font-extrabold" : "font-bold";
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
            className={cn(
              "rounded-[var(--radius-sm)] text-[15px] leading-snug break-words text-heading no-underline outline-none hover:text-primary hover:underline focus-visible:shadow-[var(--sombra-foco)]",
              peso,
            )}
          >
            {nombre}
          </Link>
        ) : (
          <span className={cn("text-[15px] leading-snug break-words text-heading", peso)}>{nombre}</span>
        )}
        {secundario !== undefined && secundario !== null && (
          <span
            className={cn(
              "-mt-0.5 text-[13px] break-words text-muted-foreground tabular-nums",
              secundarioSoloTarjeta && "@4xl:hidden",
            )}
          >
            {secundario}
          </span>
        )}
        {children}
      </div>
    </div>
  );
}

/** Clases de una acción de la fila: a todo el ancho en la tarjeta, 40 px en la tabla. */
export const CLASE_ACCION_FILA =
  "w-full whitespace-nowrap @4xl:w-auto @4xl:min-h-10! @4xl:px-3.5! @4xl:text-sm!";
