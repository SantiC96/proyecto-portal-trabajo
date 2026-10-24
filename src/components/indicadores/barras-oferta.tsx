"use client";

import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatNumero } from "./formato";
import { useMovimientoReducido } from "./use-movimiento-reducido";

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

const CONFIG = Object.fromEntries(
  MEDIDAS_OFERTA.map((m) => [m.clave, { label: m.nombre, color: m.color }]),
) satisfies ChartConfig;

/** Barras horizontales de una oferta (derivados, entrevistas y seleccionados) con el valor al final. */
export function BarrasOferta({ valores, maximo, resumen }: Props) {
  const reducido = useMovimientoReducido();
  const datos = MEDIDAS_OFERTA.map((m) => ({
    clave: m.clave,
    nombre: m.nombre,
    valor: valores[m.clave],
    fill: m.color,
  }));

  return (
    <div role="img" aria-label={resumen}>
      <ChartContainer config={CONFIG} className="aspect-auto h-[112px] w-full">
        <BarChart
          accessibilityLayer
          data={datos}
          layout="vertical"
          barCategoryGap={8}
          margin={{ top: 0, right: 36, bottom: 0, left: 0 }}
        >
          <XAxis type="number" hide domain={[0, Math.max(1, maximo)]} />
          <YAxis
            type="category"
            dataKey="nombre"
            tickLine={false}
            axisLine={false}
            width={104}
            tick={{ fill: "var(--color-control-foreground)", fontSize: 13, fontWeight: 600 }}
          />
          <ChartTooltip
            cursor={false}
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
                      {formatNumero(Number(valor))}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Bar
            dataKey="valor"
            radius={[0, 4, 4, 0]}
            barSize={16}
            minPointSize={2}
            isAnimationActive={!reducido}
          >
            {datos.map((d) => (
              <Cell key={d.clave} fill={d.fill} />
            ))}
            <LabelList
              dataKey="valor"
              position="right"
              offset={8}
              className="fill-foreground"
              fontSize={13}
              fontWeight={700}
              formatter={(v: unknown) => formatNumero(Number(v))}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
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
