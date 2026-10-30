import type { CSSProperties } from "react";
import { formatNumero } from "./formato";

/** Las tres medidas de una oferta, en este orden y con estos colores. */
export const MEDIDAS_OFERTA = [
  { clave: "derivados", nombre: "Derivados", color: "var(--color-primary)" },
  { clave: "entrevistas", nombre: "Entrevistas", color: "var(--color-info)" },
  { clave: "seleccionados", nombre: "Seleccionados", color: "var(--color-accent)" },
] as const;

export type ValoresOferta = Record<(typeof MEDIDAS_OFERTA)[number]["clave"], number>;

type Props = {
  valores: ValoresOferta;
  /** Máximo de la escala, el mismo para todas las ofertas para poder compararlas. */
  maximo: number;
  /** Resumen del gráfico para lectores de pantalla. */
  resumen: string;
};

/**
 * Barras horizontales de 12 px de una oferta (derivados, entrevistas y
 * seleccionados): la etiqueta a la izquierda, la barra sobre un fondo
 * `secondary` y el número a la derecha. HTML del servidor. Las barras crecen
 * al verse si un AnimarAlVerse las envuelve (.grafico-barra-x, en orden).
 */
export function BarrasOferta({ valores, maximo, resumen }: Props) {
  const tope = Math.max(1, maximo);
  return (
    <div role="img" aria-label={resumen} className="flex flex-col gap-2.5">
      {MEDIDAS_OFERTA.map((m, k) => {
        const valor = Math.max(0, valores[m.clave]);
        return (
          <div
            key={m.clave}
            aria-hidden="true"
            className="grid grid-cols-[104px_minmax(0,1fr)_2.5rem] items-center gap-3 text-[13px]"
          >
            <span className="font-semibold text-control-foreground">{m.nombre}</span>
            <span className="h-3 overflow-hidden rounded-full bg-secondary">
              <span
                className="grafico-barra-x block h-full rounded-full"
                style={
                  {
                    width: `${Math.min(100, (valor * 100) / tope)}%`,
                    backgroundColor: m.color,
                    "--i": k,
                  } as CSSProperties
                }
              />
            </span>
            <span className="text-right font-bold text-foreground tabular-nums">
              {formatNumero(valor)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Leyenda de las tres medidas, arriba de las tarjetas por oferta. */
export function LeyendaMedidasOferta() {
  return (
    <ul aria-label="Referencias" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-control-foreground">
      {MEDIDAS_OFERTA.map((m) => (
        <li key={m.clave} className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-[3px]" style={{ backgroundColor: m.color }} />
          {m.nombre}
        </li>
      ))}
    </ul>
  );
}
