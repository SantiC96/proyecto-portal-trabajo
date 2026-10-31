import type { CSSProperties } from "react";
import { formatNumero } from "./formato";
import { AnimarAlVerse } from "./animar-al-verse";

export type BarraVertical = { clave: string; nombre: string; cantidad: number };

/**
 * Barras `primary` con el valor escrito y el nombre de cada una. HTML del
 * servidor: sin tooltip, porque cada valor está escrito, y los nombres pasan
 * de línea entre palabras. Para pocas barras (hasta 5).
 *
 * Según el ancho de la tarjeta (container query): desde 32 rem, verticales
 * (radio 8 arriba, hasta 56 px de ancho, el valor arriba y el nombre abajo);
 * más angosta, horizontales (nombre, barra y valor en una fila), porque
 * nombres como "Administración" no entran debajo de una barra de 46 px sin
 * cortarse a mitad de palabra.
 *
 * Las barras crecen la primera vez que el gráfico entra a la pantalla
 * (AnimarAlVerse), una detrás de otra.
 */
export function BarrasVerticales({ barras, resumen }: { barras: BarraVertical[]; resumen: string }) {
  const maximo = Math.max(1, ...barras.map((b) => b.cantidad));
  const columnas = { gridTemplateColumns: `repeat(${barras.length}, minmax(0, 1fr))` } as CSSProperties;

  return (
    <AnimarAlVerse role="img" aria-label={resumen} className="@container">
      <div className="hidden @lg:block">
        <div className="grid h-[180px] items-end gap-3 border-b border-tabla-borde" style={columnas}>
          {barras.map((b, k) => (
            <div key={b.clave} className="flex h-full min-w-0 flex-col items-center justify-end gap-1.5">
              <span className="text-[15px] leading-none font-extrabold text-heading tabular-nums">
                {formatNumero(b.cantidad)}
              </span>
              <span
                className="grafico-barra-y block w-full max-w-14 rounded-t-[8px] bg-primary"
                // 22 px quedan para el valor de arriba.
                style={{ height: `calc((100% - 22px) * ${b.cantidad / maximo})`, "--i": k } as CSSProperties}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 grid gap-3" style={columnas}>
          {barras.map((b) => (
            <span
              key={b.clave}
              className="min-w-0 text-center text-[13px] leading-tight font-semibold text-muted-foreground-strong"
            >
              {b.nombre}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3.5 @lg:hidden">
        {barras.map((b, k) => (
          <div key={b.clave} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 leading-tight font-semibold text-muted-foreground-strong">
                {b.nombre}
              </span>
              <span className="text-[15px] leading-none font-extrabold text-heading tabular-nums">
                {formatNumero(b.cantidad)}
              </span>
            </div>
            <span className="block h-3 w-full overflow-hidden rounded-[8px] bg-secondary">
              <span
                className="grafico-barra-x block h-full rounded-[8px] bg-primary"
                style={{ width: `${(b.cantidad / maximo) * 100}%`, "--i": k } as CSSProperties}
              />
            </span>
          </div>
        ))}
      </div>
    </AnimarAlVerse>
  );
}
