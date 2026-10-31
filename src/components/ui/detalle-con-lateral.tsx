import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Desde qué ancho van las dos columnas. "@4xl" mide el contenido (896 px
 * disponibles, sin la sidebar); "lg" y "xl" miden la ventana, para las
 * pantallas que ya pasaban a dos columnas en ese breakpoint.
 */
type Desde = "@4xl" | "lg" | "xl";

// Clases completas por breakpoint: Tailwind solo genera las que aparecen
// escritas enteras en el código.
const CLASES: Record<Desde, { fila: string; columna: string; ordenNormal: string; debajo2: string }> = {
  "@4xl": {
    fila: "@4xl:grid @4xl:grid-cols-[minmax(0,1fr)_var(--ancho-lateral)] @4xl:items-stretch",
    columna: "@4xl:[&>*:last-child]:flex-1",
    ordenNormal: "@4xl:order-none",
    debajo2: "@4xl:grid-cols-2",
  },
  lg: {
    fila: "lg:grid lg:grid-cols-[minmax(0,1fr)_var(--ancho-lateral)] lg:items-stretch",
    columna: "lg:[&>*:last-child]:flex-1",
    ordenNormal: "lg:order-none",
    debajo2: "lg:grid-cols-2",
  },
  xl: {
    fila: "xl:grid xl:grid-cols-[minmax(0,1fr)_var(--ancho-lateral)] xl:items-stretch",
    columna: "xl:[&>*:last-child]:flex-1",
    ordenNormal: "xl:order-none",
    debajo2: "xl:grid-cols-2",
  },
};

/**
 * Detalle con una columna lateral de 400 px (o `anchoLateral`). En escritorio, `principal` y
 * `lateral` forman una fila de dos columnas que terminan a la misma altura:
 * la última tarjeta de la columna más corta crece (flex-1) con su contenido
 * arriba. `debajo` va después, a todo el ancho (o en dos columnas con
 * `debajoEnDosColumnas`). En el celular, una sola columna: principal, lateral
 * y debajo, o con `lateralEnCelular` la lateral primero o al final.
 *
 * `principal`, `lateral` y `debajo` son fragmentos de tarjetas: cada tarjeta
 * es hija directa de su columna. La lateral no es sticky.
 *
 * Detalle de la oficina (ronda 9): `anchoLateral={380}`,
 * `separacion="gap-4"` (16 px entre tarjetas) y `separacionColumnas="gap-5"`
 * (20 px entre columnas).
 */
export function DetalleConLateral({
  principal,
  lateral,
  debajo,
  desde = "@4xl",
  lateralEnCelular = "despues-de-principal",
  lateralComoAside = false,
  debajoEnDosColumnas = false,
  separacion = "gap-6",
  separacionColumnas,
  anchoLateral = 400,
  className,
}: {
  principal: ReactNode;
  lateral: ReactNode;
  debajo?: ReactNode;
  desde?: Desde;
  lateralEnCelular?: "primero" | "despues-de-principal" | "al-final";
  /** La columna lateral como <aside> (acciones sobre lo que se está viendo). */
  lateralComoAside?: boolean;
  debajoEnDosColumnas?: boolean;
  /** Separación entre tarjetas, igual en todas las columnas. */
  separacion?: string;
  /** Separación entre las dos columnas (y en el celular, entre los bloques); por defecto, `separacion`. */
  separacionColumnas?: string;
  /** Ancho de la columna lateral en px. */
  anchoLateral?: number;
  className?: string;
}) {
  const c = CLASES[desde];
  const Lateral = lateralComoAside ? "aside" : "div";

  return (
    <div
      className={cn(desde === "@4xl" && "@container", className)}
      style={{ "--ancho-lateral": `${anchoLateral}px` } as CSSProperties}
    >
      <div className={cn("flex flex-col", separacionColumnas ?? separacion)}>
        {/* En una columna la fila es "contents": sus columnas y `debajo` son
            hermanas y se pueden reordenar. */}
        <div className={cn("contents", c.fila, separacionColumnas ?? separacion)}>
          <div className={cn("flex min-w-0 flex-col", separacion, c.columna)}>{principal}</div>
          <Lateral
            className={cn(
              "flex min-w-0 flex-col",
              separacion,
              c.columna,
              lateralEnCelular === "primero" && cn("order-first", c.ordenNormal),
              lateralEnCelular === "al-final" && cn("order-last", c.ordenNormal),
            )}
          >
            {lateral}
          </Lateral>
        </div>
        {debajo && (
          <div
            className={cn(
              "grid min-w-0 grid-cols-1",
              separacion,
              debajoEnDosColumnas && cn(c.debajo2, "items-stretch"),
            )}
          >
            {debajo}
          </div>
        )}
      </div>
    </div>
  );
}
