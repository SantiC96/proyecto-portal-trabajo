"use client";

import { Cell, Pie, PieChart, Sector } from "recharts";
import { ChartPie } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { PALETA_GRAFICOS, formatNumero, formatPorcentaje } from "./formato";
import { useMovimientoReducido } from "./use-movimiento-reducido";

export type ParteDona = {
  clave: string;
  nombre: string;
  cantidad: number;
  /** Por defecto, el color de su posición en PALETA_GRAFICOS. */
  color?: string;
};

type Props = {
  partes: ParteDona[];
  /** Unidad debajo del total ("postulaciones"). */
  unidad: string;
  /** Resumen del gráfico para lectores de pantalla. */
  resumen: string;
  /** Clave de la parte resaltada (un poco más grande y marcada en la leyenda). */
  resaltada?: string;
  /** Texto del estado vacío, cuando el total es 0. */
  vacio: string;
  /**
   * "resumen" (Estado de postulaciones de la oficina): 190 px, el total en
   * 38 px y la leyenda con el porcentaje en 800 y la cantidad entre
   * paréntesis. Por defecto, la dona de siempre.
   */
  variante?: "estandar" | "resumen";
};

const MEDIDAS = {
  estandar: { tamano: 200, externo: 94, interno: 66 },
  resumen: { tamano: 190, externo: 89, interno: 63 },
} as const;

/**
 * Dona de 200 px con el total en el centro y la leyenda al costado (debajo
 * cuando la tarjeta es angosta), con color, nombre, cantidad y porcentaje.
 * Solo para pocas partes de un mismo total (hasta seis).
 */
export function GraficoDona({
  partes,
  unidad,
  resumen,
  resaltada,
  vacio,
  variante = "estandar",
}: Props) {
  const reducido = useMovimientoReducido();
  const total = partes.reduce((suma, p) => suma + p.cantidad, 0);
  const medidas = MEDIDAS[variante];
  const esResumen = variante === "resumen";

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] bg-surface-tinted px-4 py-8 text-center">
        <ChartPie aria-hidden="true" className="size-6 text-muted-icon" />
        <p className="text-sm text-muted-foreground-strong">{vacio}</p>
      </div>
    );
  }

  const datos = partes.map((p, i) => ({
    ...p,
    fill: p.color ?? PALETA_GRAFICOS[i % PALETA_GRAFICOS.length],
  }));
  const config: ChartConfig = Object.fromEntries(
    datos.map((d) => [d.clave, { label: d.nombre, color: d.fill }]),
  );
  const indiceResaltado = datos.findIndex((d) => d.clave === resaltada);

  return (
    <div className="@container">
      <div
        className={cn(
          "flex flex-col items-center gap-5",
          esResumen
            ? "@sm:flex-row @sm:items-center @sm:gap-6"
            : "@md:flex-row @md:items-center @md:gap-6",
        )}
      >
        <div
          role="img"
          aria-label={resumen}
          className="relative shrink-0"
          style={{ width: medidas.tamano, height: medidas.tamano }}
        >
          <ChartContainer
            config={config}
            className="aspect-square"
            style={{ width: medidas.tamano, height: medidas.tamano }}
          >
            <PieChart accessibilityLayer margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              {/* Por encima del total del centro (un div posterior en el DOM,
                  sin eventos del puntero). */}
              <ChartTooltip
                wrapperStyle={{ zIndex: 10 }}
                content={
                  <ChartTooltipContent
                    hideLabel
                    nameKey="clave"
                    formatter={(valor, _nombre, item) => (
                      <div className="flex w-full items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="size-2.5 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: item.payload?.fill }}
                        />
                        <span className="text-muted-foreground-strong">{item.payload?.nombre}</span>
                        <span className="ml-auto pl-3 font-bold text-foreground tabular-nums">
                          {formatNumero(Number(valor))} ({formatPorcentaje(Number(valor), total)})
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Pie
                data={datos}
                dataKey="cantidad"
                nameKey="nombre"
                innerRadius={medidas.interno}
                outerRadius={medidas.externo}
                stroke="var(--color-surface)"
                strokeWidth={2}
                isAnimationActive={!reducido}
                shape={(props) => (
                  <Sector
                    {...props}
                    outerRadius={
                      props.index === indiceResaltado
                        ? Number(props.outerRadius) + 6
                        : props.outerRadius
                    }
                  />
                )}
              >
                {datos.map((d) => (
                  <Cell key={d.clave} fill={d.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
          >
            <span
              className={cn(
                "leading-none font-extrabold text-heading tabular-nums",
                esResumen ? "text-[38px]" : "text-[32px]",
              )}
            >
              {formatNumero(total)}
            </span>
            <span className="mt-1 max-w-[110px] text-[13px] leading-tight text-muted-foreground">
              {unidad}
            </span>
          </div>
        </div>

        {esResumen ? (
          <ul className="flex w-full min-w-0 flex-col gap-1">
            {datos.map((d) => (
              <li key={d.clave} className="flex items-center gap-2.5 px-1 py-1.5 text-sm">
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: d.fill }}
                />
                <span className="min-w-0 flex-1 font-semibold break-words text-control-foreground">
                  {d.nombre}
                </span>
                <span className="text-right whitespace-nowrap tabular-nums">
                  <span className="font-extrabold text-heading">
                    {formatPorcentaje(d.cantidad, total)}
                  </span>{" "}
                  <span className="text-muted-foreground">({formatNumero(d.cantidad)})</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
        <ul className="flex w-full min-w-0 flex-col gap-1">
          {datos.map((d) => {
            const destacada = d.clave === resaltada;
            return (
              <li
                key={d.clave}
                className={cn(
                  "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm",
                  destacada && "bg-secondary",
                )}
              >
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: d.fill }}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 break-words text-control-foreground",
                    destacada ? "font-extrabold text-heading" : "font-semibold",
                  )}
                >
                  {d.nombre}
                  {destacada && <span className="sr-only"> (la mayor)</span>}
                </span>
                <span className="font-bold text-foreground tabular-nums">
                  {formatNumero(d.cantidad)}
                </span>
                <span className="w-11 text-right text-[13px] text-muted-foreground tabular-nums">
                  {formatPorcentaje(d.cantidad, total)}
                </span>
              </li>
            );
          })}
        </ul>
        )}
      </div>
    </div>
  );
}
