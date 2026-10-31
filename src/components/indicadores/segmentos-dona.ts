/** Un tramo del anillo: dónde empieza y cuánto mide, sobre la circunferencia. */
export type SegmentoDona = { clave: string; inicio: number; largo: number };

/**
 * Tramos del anillo de una dona dibujada con stroke-dasharray. Cada parte
 * ocupa su proporción del total; entre dos partes queda una `separacion` (en
 * las mismas unidades que la circunferencia), repartida mitad antes y mitad
 * después de cada tramo. Las partes en 0 (o negativas) no tienen tramo; con
 * una sola parte mayor que 0 el anillo va entero, sin separación. Sin datos
 * (total 0) no hay tramos. Sin imports: lo verifica un script aparte.
 */
export function segmentosDona(
  partes: readonly { clave: string; cantidad: number }[],
  circunferencia: number,
  separacion: number,
): SegmentoDona[] {
  const conValor = partes
    .map((p) => ({ clave: p.clave, cantidad: Math.max(0, p.cantidad) }))
    .filter((p) => p.cantidad > 0);
  const total = conValor.reduce((suma, p) => suma + p.cantidad, 0);
  if (total <= 0) return [];

  const hueco = conValor.length > 1 ? separacion : 0;
  let acumulado = 0;
  return conValor.map((p) => {
    const arco = (p.cantidad / total) * circunferencia;
    // Una parte más chica que la separación queda sin trazo, dentro de su arco.
    const separacionPropia = Math.min(hueco, arco);
    const segmento = {
      clave: p.clave,
      inicio: acumulado + separacionPropia / 2,
      largo: arco - separacionPropia,
    };
    acumulado += arco;
    return segmento;
  });
}

/** Cuánto espera y cuánto tarda un tramo en dibujarse, en ms. */
export type TiempoTramo = { retraso: number; duracion: number };

/** Inversa de la curva ease-out cúbica 1 − (1 − t)³: en qué momento se llega a `p`. */
function momentoEaseOut(p: number): number {
  return 1 - Math.cbrt(1 - Math.min(1, Math.max(0, p)));
}

/**
 * Tiempos para dibujar los tramos en orden, como si el anillo entero se
 * trazara en `total` ms con ease-out: cada tramo arranca cuando el trazo
 * llega a su inicio y termina cuando llega a su final (lineal en el medio).
 * Solo cambia cuándo se dibuja cada tramo, no su largo final.
 */
export function tiemposDona(
  segmentos: readonly SegmentoDona[],
  circunferencia: number,
  total: number,
): TiempoTramo[] {
  if (circunferencia <= 0) return segmentos.map(() => ({ retraso: 0, duracion: 0 }));
  return segmentos.map((s) => {
    const desde = momentoEaseOut(s.inicio / circunferencia) * total;
    const hasta = momentoEaseOut((s.inicio + s.largo) / circunferencia) * total;
    return { retraso: desde, duracion: Math.max(0, hasta - desde) };
  });
}
