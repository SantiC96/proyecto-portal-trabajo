// Nivel de prioridad y estado del comprobante de domicilio (migration_055).
// Lo usan la oficina (badges, filtros) y el perfil del postulante. La empresa
// no ve nada de esto (decisión 027).

/**
 * 1  Funes con comprobante aprobado
 * 2  Funes sin comprobante, o con el comprobante pendiente o rechazado
 * 3  otra localidad o localidad sin informar
 * La base lo mantiene en postulantes.nivel_prioridad.
 */
export type NivelPrioridad = 1 | 2 | 3;

export const NIVELES_PRIORIDAD: readonly NivelPrioridad[] = [1, 2, 3];

export function esNivelPrioridad(valor: unknown): valor is NivelPrioridad {
  return valor === 1 || valor === 2 || valor === 3;
}

/** Para leer de la URL ("1", "2", "3"); cualquier otro valor da null. */
export function leerNivelPrioridad(valor: string | undefined): NivelPrioridad | null {
  const numero = Number(valor);
  return esNivelPrioridad(numero) ? numero : null;
}

/** Nivel leído de la base (smallint con CHECK 1..3); ante un valor raro, el más bajo. */
export function nivelDe(valor: number): NivelPrioridad {
  return esNivelPrioridad(valor) ? valor : 3;
}

export const ETIQUETA_NIVEL: Record<NivelPrioridad, string> = {
  1: "Funes · Verificado",
  2: "Funes · Sin verificar",
  3: "Otra localidad o sin informar",
};

export const ESTADOS_COMPROBANTE = ["pendiente", "aprobado", "rechazado"] as const;
export type EstadoComprobante = (typeof ESTADOS_COMPROBANTE)[number];

export function esEstadoComprobante(valor: unknown): valor is EstadoComprobante {
  return ESTADOS_COMPROBANTE.some((e) => e === valor);
}

/** Detalle del nivel 2 en el badge de la oficina. */
export function detalleSinVerificar(comprobante: EstadoComprobante | null): string {
  if (comprobante === "pendiente") return "Comprobante en revisión";
  if (comprobante === "rechazado") return "Comprobante rechazado";
  return "Sin comprobante";
}

/** Largo máximo del motivo de rechazo (CHECK de archivos_usuario, migration_055). */
export const MOTIVO_RECHAZO_COMPROBANTE_MAXIMO = 500;
