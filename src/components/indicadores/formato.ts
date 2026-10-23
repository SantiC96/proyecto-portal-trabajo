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
