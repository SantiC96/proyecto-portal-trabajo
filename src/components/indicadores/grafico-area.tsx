"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Agrupacion } from "@/lib/indicadores-periodo";
import { escalaRedonda, formatNumero } from "./formato";
import { useMovimientoReducido } from "./use-movimiento-reducido";

export type PuntoArea = {
  /** Identificador del punto: el primer día del día, la semana o el mes ("2026-10-01"). */
  clave: string;
  cantidad: number;
  /** Etiqueta corta del eje X ("12 oct", "oct"); el año de los meses lo agrega el gráfico. */
  eje: string;
  /** Fecha completa o rango, para el tooltip ("Del 6 al 12 de octubre de 2026"). */
  detalle: string;
};

type Props = {
  datos: PuntoArea[];
  agrupacion: Agrupacion;
  /** Nombre de la serie en el tooltip ("Postulaciones"). */
  serie: string;
  /** Resumen del gráfico para lectores de pantalla. */
  resumen: string;
  /** Rango completo del período, debajo del eje ("Del 25 de septiembre al 25 de octubre de 2026"). */
  rango?: string;
};

// Cada cuántos puntos va una etiqueta del eje X, en escritorio y en celular.
const PASO_ETIQUETAS: Record<Agrupacion, { escritorio: number; celular: number }> = {
  dia: { escritorio: 5, celular: 7 },
  semana: { escritorio: 1, celular: 2 },
  mes: { escritorio: 1, celular: 2 },
};

/** Por debajo de este ancho del gráfico se usan los pasos de celular. */
const ANCHO_CELULAR = 480;
/**
 * Márgenes del área: las etiquetas van centradas en su punto, así que la
 * primera y la última sobresalen; los márgenes les dejan lugar sin cortarlas.
 */
const MARGEN_IZQUIERDO = 12;
const MARGEN_DERECHO = 24;
/** Ancho aproximado de un carácter a 13 px, y espacio mínimo entre dos etiquetas. */
const ANCHO_CARACTER = 7.2;
const ESPACIO_ENTRE_ETIQUETAS = 8;
const LARGO_MARCA = 5;

/** Etiquetas de los meses elegidos, con el año ("ene 26") en la primera y al cambiar de año. */
function textosEje(datos: PuntoArea[], indices: number[], agrupacion: Agrupacion): string[] {
  const anios = new Set(datos.map((p) => p.clave.slice(0, 4)));
  if (agrupacion !== "mes" || anios.size < 2) return indices.map((i) => datos[i].eje);
  return indices.map((i, k) => {
    const anio = datos[i].clave.slice(0, 4);
    const anterior = k > 0 ? datos[indices[k - 1]].clave.slice(0, 4) : undefined;
    return anio === anterior ? datos[i].eje : `${datos[i].eje} ${anio.slice(2)}`;
  });
}

/**
 * Los puntos con etiqueta en el eje X: uno cada `paso` (el de escritorio o el
 * de celular, según el ancho), siempre el primero y el último. La anteúltima
 * se saca si queda a menos de medio paso de la última o si se pisan. Si aun
 * así no entran, el paso crece de a uno.
 */
function elegirEtiquetas(
  datos: PuntoArea[],
  agrupacion: Agrupacion,
  ancho: number,
  anchoEjeY: number,
): { indices: number[]; textos: string[] } {
  const n = datos.length;
  if (n === 0 || ancho <= 0) return { indices: [], textos: [] };
  if (n === 1) return { indices: [0], textos: textosEje(datos, [0], agrupacion) };

  const area = Math.max(1, ancho - anchoEjeY - MARGEN_IZQUIERDO - MARGEN_DERECHO);
  const porPunto = area / (n - 1);
  const pasos = PASO_ETIQUETAS[agrupacion];

  const entran = (indices: number[], textos: string[]) =>
    indices.every(
      (i, k) =>
        k === 0 ||
        (i - indices[k - 1]) * porPunto >=
          ((textos[k - 1].length + textos[k].length) * ANCHO_CARACTER) / 2 + ESPACIO_ENTRE_ETIQUETAS,
    );

  for (let paso = ancho < ANCHO_CELULAR ? pasos.celular : pasos.escritorio; paso < n; paso++) {
    let indices: number[] = [];
    for (let i = 0; i < n; i += paso) indices.push(i);
    const ultimo = indices.at(-1)!;
    if (ultimo !== n - 1) {
      indices = n - 1 - ultimo <= paso / 2 && indices.length > 1 ? indices.slice(0, -1) : indices;
      indices.push(n - 1);
    }
    let textos = textosEje(datos, indices, agrupacion);
    if (!entran(indices, textos) && indices.length > 2) {
      indices = [...indices.slice(0, -2), n - 1];
      textos = textosEje(datos, indices, agrupacion);
    }
    if (entran(indices, textos)) return { indices, textos };
  }
  const indices = [0, n - 1];
  return { indices, textos: textosEje(datos, indices, agrupacion) };
}

function useAncho<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [ancho, setAncho] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observador = new ResizeObserver(([entrada]) => setAncho(entrada.contentRect.width));
    observador.observe(el);
    return () => observador.disconnect();
  }, []);
  return [ref, ancho] as const;
}

/**
 * Área de una serie en el tiempo: degradé verde, línea de 2 px, curva suave,
 * eje Y con valores redondos alineados a la grilla horizontal y eje X con
 * fechas cada tantos puntos según el ancho (siempre la primera y la última),
 * cada una con una marca hacia su punto. Debajo, el rango del período.
 */
export function GraficoArea({ datos, agrupacion, serie, resumen, rango }: Props) {
  const reducido = useMovimientoReducido();
  const idDegrade = `degrade-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [refContenedor, ancho] = useAncho<HTMLDivElement>();
  const config = { cantidad: { label: serie, color: "var(--color-primary)" } } satisfies ChartConfig;
  const porClave = new Map(datos.map((p) => [p.clave, p]));
  const valoresEje = escalaRedonda(Math.max(0, ...datos.map((p) => p.cantidad)));

  // El eje Y ocupa su valor más largo más el tickMargin.
  const anchoEjeY = formatNumero(valoresEje[valoresEje.length - 1]).length * ANCHO_CARACTER + 6;
  const etiquetas = elegirEtiquetas(datos, agrupacion, ancho, anchoEjeY);
  const textoPorClave = new Map(etiquetas.indices.map((i, k) => [datos[i].clave, etiquetas.textos[k]]));

  function dibujarEtiqueta({ x, y, payload }: { x?: number | string; y?: number | string; payload?: { value?: unknown } }) {
    const clave = String(payload?.value ?? "");
    const texto = textoPorClave.get(clave);
    if (!texto) return null;
    const cx = Number(x);
    const cy = Number(y);
    return (
      <g>
        <line
          x1={cx}
          x2={cx}
          y1={cy}
          y2={cy + LARGO_MARCA}
          stroke="var(--color-muted-foreground)"
          strokeWidth={1}
        />
        <text
          x={cx}
          y={cy + LARGO_MARCA + 4}
          dy="0.71em"
          textAnchor="middle"
          fontSize={13}
          fill="var(--color-muted-foreground)"
          className="tabular-nums"
        >
          {texto}
        </text>
      </g>
    );
  }

  return (
    <div role="img" aria-label={resumen} ref={refContenedor}>
      <ChartContainer
        config={config}
        className="aspect-auto h-[236px] w-full sm:h-[276px] [&_.recharts-yAxis_text]:tabular-nums"
      >
        <AreaChart
          accessibilityLayer
          data={datos}
          margin={{ top: 8, right: MARGEN_DERECHO, bottom: 0, left: MARGEN_IZQUIERDO }}
        >
          <defs>
            <linearGradient id={idDegrade} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <YAxis
            type="number"
            domain={[0, valoresEje[valoresEje.length - 1]]}
            ticks={valoresEje}
            interval={0}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            width="auto"
            tickFormatter={(valor: number) => formatNumero(valor)}
          />
          <XAxis
            dataKey="clave"
            ticks={etiquetas.indices.map((i) => datos[i].clave)}
            interval={0}
            height={32}
            tickLine={false}
            axisLine={false}
            tickMargin={0}
            tick={dibujarEtiqueta}
          />
          <ChartTooltip
            cursor={{ strokeWidth: 1.5 }}
            content={
              <ChartTooltipContent
                indicator="line"
                labelFormatter={(_, payload) => {
                  const clave = payload?.[0]?.payload?.clave;
                  return typeof clave === "string" ? (porClave.get(clave)?.detalle ?? "") : "";
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
      {rango && (
        <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">
          {rango}
        </p>
      )}
    </div>
  );
}
