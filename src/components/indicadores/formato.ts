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
