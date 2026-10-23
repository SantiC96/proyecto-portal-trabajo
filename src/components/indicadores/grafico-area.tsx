"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatMesAnio, formatMesCorto } from "@/lib/fechas";
import { formatNumero } from "./formato";
import { useMovimientoReducido } from "./use-movimiento-reducido";

export type PuntoMes = {
  /** Primer día del mes, "2026-10-01". */
  mes: string;
  cantidad: number;
};

type Props = {
  datos: PuntoMes[];
  /** Nombre de la serie en el tooltip ("Postulaciones"). */
  serie: string;
  /** Resumen del gráfico para lectores de pantalla. */
  resumen: string;
};

/**
 * Área de una serie por mes: degradé verde, línea de 2 px, curva suave,
 * grilla horizontal tenue y eje X con el mes abreviado. Sin eje Y: el valor
 * de cada mes está en el tooltip y en "Ver datos".
 */
export function GraficoArea({ datos, serie, resumen }: Props) {
  const reducido = useMovimientoReducido();
  const idDegrade = `degrade-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const config = { cantidad: { label: serie, color: "var(--color-primary)" } } satisfies ChartConfig;

  return (
    <div role="img" aria-label={resumen}>
      <ChartContainer config={config} className="aspect-auto h-[220px] w-full sm:h-[260px]">
        <AreaChart
          accessibilityLayer
          data={datos}
          margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
        >
          <defs>
            <linearGradient id={idDegrade} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="mes"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            minTickGap={8}
            tickFormatter={(valor: string) => formatMesCorto(valor)}
          />
          <ChartTooltip
            cursor={{ strokeWidth: 1.5 }}
            content={
              <ChartTooltipContent
                indicator="line"
                labelFormatter={(_, payload) => {
                  const mes = payload?.[0]?.payload?.mes;
                  return typeof mes === "string" ? capitalizar(formatMesAnio(mes)) : "";
                }}
                formatter={(valor) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="text-muted-foreground-strong">{serie}</span>
                    <span className="font-bold text-foreground tabular-nums">
                      {formatNumero(Number(valor))}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Area
            dataKey="cantidad"
            type="monotone"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fill={`url(#${idDegrade})`}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--color-surface)" }}
            isAnimationActive={!reducido}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
