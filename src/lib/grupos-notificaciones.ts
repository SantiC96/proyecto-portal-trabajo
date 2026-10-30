// Agrupación de las notificaciones por fecha (pantalla del postulante). Sin
// imports a propósito: se prueba sola, fuera del proyecto.

export type GrupoNotificaciones = "ultimas-24-horas" | "esta-semana" | "mas-antiguas";

export const TITULO_GRUPO_NOTIFICACIONES: Record<GrupoNotificaciones, string> = {
  "ultimas-24-horas": "Últimas 24 horas",
  "esta-semana": "Esta semana",
  "mas-antiguas": "Más antiguas",
};

const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;
// Argentina está en UTC-3 todo el año (sin horario de verano desde 2009).
const DESFASE_ARGENTINA_MS = -3 * HORA_MS;

/** Lunes 00:00 (hora de Argentina) de la semana de `ahora`, en milisegundos UTC. */
export function inicioSemanaArgentina(ahora: Date): number {
  const local = new Date(ahora.getTime() + DESFASE_ARGENTINA_MS);
  const diasDesdeLunes = (local.getUTCDay() + 6) % 7;
  const medianocheLocal = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() - diasDesdeLunes,
  );
  return medianocheLocal - DESFASE_ARGENTINA_MS;
}

/**
 * "Últimas 24 horas": creada hace menos de 24 horas (o con fecha futura por
 * diferencia de relojes). "Esta semana": desde el lunes 00:00 de Argentina
 * y hace 24 horas o más. El resto, "Más antiguas".
 */
export function grupoNotificacion(creadaEn: string, ahora: Date): GrupoNotificaciones {
  const creada = new Date(creadaEn).getTime();
  if (Number.isNaN(creada)) return "mas-antiguas";
  if (ahora.getTime() - creada < DIA_MS) return "ultimas-24-horas";
  if (creada >= inicioSemanaArgentina(ahora)) return "esta-semana";
  return "mas-antiguas";
}

/**
 * Reparte una lista ya ordenada (de la más nueva a la más vieja) en sus
 * grupos, sin cambiar el orden. Solo devuelve los grupos con notificaciones.
 */
export function agruparNotificaciones<T extends { created_at: string }>(
  filas: readonly T[],
  ahora: Date,
): { grupo: GrupoNotificaciones; titulo: string; filas: T[] }[] {
  const grupos: { grupo: GrupoNotificaciones; titulo: string; filas: T[] }[] = [];
  for (const fila of filas) {
    const grupo = grupoNotificacion(fila.created_at, ahora);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.grupo === grupo) ultimo.filas.push(fila);
    else grupos.push({ grupo, titulo: TITULO_GRUPO_NOTIFICACIONES[grupo], filas: [fila] });
  }
  return grupos;
}
