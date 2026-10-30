// Nivel de prioridad y estado del comprobante de domicilio (migration_055).
// Lo usan la oficina (badges, orden de los listados) y el perfil del
// postulante. La empresa no ve nada de esto (decisión 027).

/**
 * 1  Funes con comprobante aprobado
 * 2  Funes sin comprobante, o con el comprobante pendiente o rechazado
 * 3  otra localidad o localidad sin informar
 * La base lo mantiene en postulantes.nivel_prioridad.
 */
export type NivelPrioridad = 1 | 2 | 3;

export function esNivelPrioridad(valor: unknown): valor is NivelPrioridad {
  return valor === 1 || valor === 2 || valor === 3;
}

/** Nivel leído de la base (smallint con CHECK 1..3); ante un valor raro, el más bajo. */
export function nivelDe(valor: number): NivelPrioridad {
  return esNivelPrioridad(valor) ? valor : 3;
}

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

export type VarianteLocalidad = "verificado" | "sin-verificar" | "otra-localidad";

/**
 * Variante del chip de localidad de la oficina, según el nivel de prioridad:
 * 1 verificado, 2 sin verificar, 3 otra localidad (o sin informar).
 */
export function varianteLocalidad(nivel: NivelPrioridad): VarianteLocalidad {
  if (nivel === 1) return "verificado";
  if (nivel === 2) return "sin-verificar";
  return "otra-localidad";
}

/** Texto del chip de localidad. */
export function textoChipLocalidad(nivel: NivelPrioridad, localidad: string | null): string {
  const variante = varianteLocalidad(nivel);
  if (variante === "verificado") return "Funes · Verificado";
  if (variante === "sin-verificar") return "Funes · Sin verificar";
  const ciudad = localidad?.trim();
  return ciudad ? `Otra localidad: ${ciudad}` : "Localidad sin informar";
}
