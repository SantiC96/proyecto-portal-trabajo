// Vencimiento de ofertas (migration_036). La duración la elige la empresa y
// vence_en lo calcula la base al publicar la oferta.

export const DURACIONES_OFERTA = [15, 30, 45, 60] as const;
export type DuracionOferta = (typeof DURACIONES_OFERTA)[number];
export const DURACION_OFERTA_POR_DEFECTO: DuracionOferta = 30;

/** Desde cuántos días antes del vencimiento se muestra el aviso. */
export const DIAS_AVISO_VENCIMIENTO = 5;

const MS_DIA = 24 * 60 * 60 * 1000;

export function esDuracionOferta(valor: unknown): valor is DuracionOferta {
  return DURACIONES_OFERTA.includes(valor as DuracionOferta);
}

export type EstadoVencimiento = {
  /** La oferta está activa y vence_en ya pasó. */
  vencida: boolean;
  /** Activa y faltan DIAS_AVISO_VENCIMIENTO días o menos. */
  porVencer: boolean;
  /** Días que faltan (redondeado hacia arriba); null si no aplica. */
  diasRestantes: number | null;
};

/**
 * El vencimiento solo aplica a ofertas activas con vence_en. Una oferta
 * vencida sigue en estado 'activa' en la base: no hay cron que la cierre.
 */
export function estadoVencimiento(estado: string, venceEn: string | null): EstadoVencimiento {
  if (estado !== "activa" || !venceEn) {
    return { vencida: false, porVencer: false, diasRestantes: null };
  }
  const restante = new Date(venceEn).getTime() - Date.now();
  if (restante <= 0) return { vencida: true, porVencer: false, diasRestantes: 0 };
  const diasRestantes = Math.ceil(restante / MS_DIA);
  return {
    vencida: false,
    porVencer: diasRestantes <= DIAS_AVISO_VENCIMIENTO,
    diasRestantes,
  };
}

export function textoDiasRestantes(dias: number): string {
  return `Vence en ${dias} día${dias === 1 ? "" : "s"}`;
}
