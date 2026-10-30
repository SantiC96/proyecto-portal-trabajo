const NUMERO = new Intl.NumberFormat("es-AR");
const DECIMAL = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export function formatNumero(valor: number): string {
  return NUMERO.format(valor);
}

export function formatDecimal(valor: number): string {
  return DECIMAL.format(valor);
}

/** Porcentaje de `parte` sobre `total`, redondeado a entero ("40 %"); "0 %" si el total es 0. */
export function formatPorcentaje(parte: number, total: number): string {
  if (total <= 0) return "0 %";
  return `${Math.round((parte * 100) / total)} %`;
}

/**
 * Valores redondos del eje de un gráfico, de 0 a un tope que cubre `maximo`:
 * el paso más chico entre 1, 2, 5, 10, 20, 50… que deje 4 tramos o menos
 * (de 3 a 5 valores, salvo con máximos muy chicos). Siempre enteros.
 */
export function escalaRedonda(maximo: number): number[] {
  const tope = Math.max(1, Math.ceil(maximo));
  let paso = 1;
  for (let potencia = 1; ; potencia *= 10) {
    const candidato = [1, 2, 5].map((m) => m * potencia).find((p) => Math.ceil(tope / p) <= 4);
    if (candidato) {
      paso = candidato;
      break;
    }
  }
  const tramos = Math.ceil(tope / paso);
  return Array.from({ length: tramos + 1 }, (_, k) => k * paso);
}

/**
 * Paleta de los gráficos, en este orden: verde, amarillo, azul, gris, violeta
 * y verde azulado. Una parte siempre toma el color de su posición en la lista
 * (nunca se reparte por tamaño): el mismo dato tiene el mismo color en todas
 * las pantallas.
 */
export const PALETA_GRAFICOS = [
  "var(--color-primary)",
  "var(--color-accent)",
  "var(--color-info)",
  "var(--color-muted-icon)",
  "var(--color-violet)",
  "var(--color-teal)",
] as const;

/**
 * Cinco valores redondos del eje (de 0 a 4 pasos), con el paso más chico
 * entre 1, 2, 5, 10, 20, 50… que cubra `maximo`. Para la evolución general.
 */
export function escalaDeCinco(maximo: number): number[] {
  const tope = Math.max(1, Math.ceil(maximo));
  let paso = 1;
  for (let potencia = 1; ; potencia *= 10) {
    const candidato = [1, 2, 5].map((m) => m * potencia).find((p) => p * 4 >= tope);
    if (candidato) {
      paso = candidato;
      break;
    }
  }
  return [0, 1, 2, 3, 4].map((k) => k * paso);
}

/** Cómo cambió un valor respecto del período anterior. */
export type Variacion =
  /** "Desde el inicio": no hay período anterior. */
  | { tipo: "inicio" }
  /** El anterior fue 0 (o no tenía datos) y este no. */
  | { tipo: "nuevo" }
  /** Sin datos en ninguno de los dos (una tasa sin postulaciones). */
  | { tipo: "sin-datos" }
  /** Diferencia en % del anterior, o en puntos porcentuales para una tasa. 0 = sin cambios. */
  | { tipo: "porcentaje" | "puntos"; valor: number };

/** Variación de una cantidad: % del anterior, redondeado a entero. */
export function variacionCantidad(actual: number, anterior: number | null): Variacion {
  if (anterior === null) return { tipo: "inicio" };
  if (anterior === 0) return actual === 0 ? { tipo: "porcentaje", valor: 0 } : { tipo: "nuevo" };
  return { tipo: "porcentaje", valor: Math.round(((actual - anterior) * 100) / anterior) };
}

/**
 * Variación de una tasa en puntos porcentuales, con un decimal. `hayAnterior`
 * es false "desde el inicio"; una tasa null es un período sin postulaciones.
 */
export function variacionTasa(
  actual: number | null,
  anterior: number | null,
  hayAnterior: boolean,
): Variacion {
  if (!hayAnterior) return { tipo: "inicio" };
  if (actual === null && anterior === null) return { tipo: "sin-datos" };
  if (actual === null) return { tipo: "sin-datos" };
  if (anterior === null) return { tipo: "nuevo" };
  return { tipo: "puntos", valor: Math.round((actual - anterior) * 10) / 10 };
}
