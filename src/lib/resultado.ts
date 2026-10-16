// Shared result type for all server actions.

export const CODIGOS_ERROR = [
  "NO_AUTENTICADO",
  "SIN_PERMISO",
  "DATOS_INVALIDOS",
  "NO_ENCONTRADO",
  "CONFLICTO",
  "ESTADO_INVALIDO",
  "REGLA_DE_NEGOCIO",
  "ARCHIVO_INVALIDO",
  "SIN_CV",
  "TOKEN_VENCIDO",
  "ERROR_INTERNO",
] as const;

export type CodigoError = (typeof CODIGOS_ERROR)[number];

const MENSAJES_DEFAULT: Record<CodigoError, string> = {
  NO_AUTENTICADO: "Necesitás iniciar sesión para realizar esta acción.",
  SIN_PERMISO: "No tenés permiso para realizar esta acción.",
  DATOS_INVALIDOS: "Los datos ingresados no son válidos. Revisalos e intentá de nuevo.",
  NO_ENCONTRADO: "No se encontró el recurso solicitado.",
  CONFLICTO: "Ya existe un registro con esos datos.",
  ESTADO_INVALIDO: "La acción no corresponde al estado actual del recurso.",
  REGLA_DE_NEGOCIO: "La operación no cumple una regla requerida.",
  ARCHIVO_INVALIDO: "El archivo no es válido.",
  SIN_CV: "Necesitás cargar tu CV antes de postularte.",
  TOKEN_VENCIDO: "El link venció o ya fue usado. Pedí uno nuevo.",
  ERROR_INTERNO: "Ocurrió un error inesperado. Intentá de nuevo.",
};

/**
 * `campo`: el error es de un campo del formulario (el nombre de la propiedad
 * que recibe la acción); la pantalla lo muestra debajo de ese campo.
 */
export type ResultadoError = {
  ok: false;
  codigo: CodigoError;
  mensaje: string;
  ref?: string;
  campo?: string;
};

export type Resultado<T = void> =
  | { ok: true; data?: T; mensaje?: string }
  | ResultadoError;

export function ok(): Resultado<void>;
export function ok<T>(data: T): Resultado<T>;
export function ok<T>(data?: T): Resultado<T> {
  return data !== undefined ? { ok: true, data } : { ok: true };
}

export function okMsg(mensaje: string): Resultado<void> {
  return { ok: true, mensaje };
}

export function err(codigo: CodigoError, mensaje?: string): ResultadoError {
  return {
    ok: false,
    codigo,
    mensaje: mensaje ?? MENSAJES_DEFAULT[codigo],
  };
}

/** Error de validación de un campo del formulario. */
export function errCampo(campo: string, mensaje: string): ResultadoError {
  return { ok: false, codigo: "DATOS_INVALIDOS", mensaje, campo };
}

export function errConRef(codigo: CodigoError, mensaje: string, ref: string): ResultadoError {
  return { ok: false, codigo, mensaje, ref };
}

type SupabaseError = { code?: string; message?: string };

export function fromSupabaseError(e: SupabaseError): ResultadoError {
  if (e.code === "23505") return err("CONFLICTO");
  if (e.code === "42501" || e.message?.includes("violates row-level security")) {
    return err("SIN_PERMISO");
  }
  if (e.code === "P0001") {
    return err("REGLA_DE_NEGOCIO", e.message ?? MENSAJES_DEFAULT.REGLA_DE_NEGOCIO);
  }
  return err("ERROR_INTERNO");
}

// UI helper: structured error for display, including ref only for ERROR_INTERNO.
export type ErrorAccion = { mensaje: string; ref?: string };

export function toErrorAccion(result: Resultado): ErrorAccion | null {
  if (result.ok) return null;
  return {
    mensaje: result.mensaje,
    ref: result.codigo === "ERROR_INTERNO" ? result.ref : undefined,
  };
}
