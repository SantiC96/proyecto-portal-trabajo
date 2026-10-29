import { LARGO_MAXIMO, MENSAJE_OBLIGATORIO, validarTextoOpcional } from "@/lib/validaciones";

// Modalidad de la pre-entrevista de la oficina y de la entrevista de la
// empresa (migration_064). Presencial exige el lugar; online, el link de la
// reunión (https:// y sin espacios) y el lugar no se usa.

export const MODALIDADES_ENTREVISTA = ["presencial", "online"] as const;
export type ModalidadEntrevista = (typeof MODALIDADES_ENTREVISTA)[number];

export function esModalidadEntrevista(valor: unknown): valor is ModalidadEntrevista {
  return MODALIDADES_ENTREVISTA.some((m) => m === valor);
}

/** Las filas anteriores a la 064 (y cualquier valor raro) son presenciales. */
export function modalidadDe(valor: string | null | undefined): ModalidadEntrevista {
  return esModalidadEntrevista(valor) ? valor : "presencial";
}

export const MODALIDAD_LABEL: Record<ModalidadEntrevista, string> = {
  presencial: "Presencial",
  online: "Online",
};

export const AYUDA_LINK_REUNION = "Pegá el link de Meet, Zoom o Teams.";

/** El mismo control que el CHECK de la 064 (https:// y sin espacios) y que la URL se pueda leer. */
export function validarLinkReunion(valor: unknown): string | null {
  if (typeof valor !== "string" || !valor.trim()) return MENSAJE_OBLIGATORIO;
  const link = valor.trim();
  if (!/^https:\/\/\S+$/.test(link)) return "El link tiene que empezar con https:// y no puede tener espacios.";
  try {
    if (!new URL(link).hostname) throw new Error();
  } catch {
    return "El link no es válido. Copialo completo desde Meet, Zoom o Teams.";
  }
  if (link.length > LARGO_MAXIMO.linkReunion) return `Puede tener hasta ${LARGO_MAXIMO.linkReunion} caracteres.`;
  return null;
}

/** Campos de los datos de una entrevista que puede marcar el servidor. */
export type CampoEntrevista = "fechaHora" | "modalidad" | "lugar" | "link";

export type DatosEntrevista = {
  fechaHoraISO: unknown;
  modalidad: unknown;
  lugar: unknown;
  link: unknown;
};

/**
 * Validación de servidor de la fecha (futura), la modalidad y el lugar o el
 * link. La base repite estos controles (validar_datos_pre_entrevista y
 * derivaciones_empresa_update_fn, migration_064).
 */
export function validarDatosEntrevista(
  datos: DatosEntrevista,
  mensajeFechaPasada = "La fecha tiene que ser posterior al momento actual.",
): { campo: CampoEntrevista; mensaje: string } | null {
  if (typeof datos.fechaHoraISO !== "string") return { campo: "fechaHora", mensaje: "La fecha no es válida." };
  const fecha = new Date(datos.fechaHoraISO);
  if (isNaN(fecha.getTime())) return { campo: "fechaHora", mensaje: "La fecha no es válida." };
  if (fecha.getTime() <= Date.now()) return { campo: "fechaHora", mensaje: mensajeFechaPasada };

  if (!esModalidadEntrevista(datos.modalidad))
    return { campo: "modalidad", mensaje: "Elegí si es presencial u online." };

  if (datos.modalidad === "presencial") {
    if (typeof datos.lugar !== "string" || !datos.lugar.trim())
      return { campo: "lugar", mensaje: MENSAJE_OBLIGATORIO };
    const errLugar = validarTextoOpcional(datos.lugar, LARGO_MAXIMO.lugarEntrevista);
    if (errLugar) return { campo: "lugar", mensaje: errLugar };
    return null;
  }

  const errLink = validarLinkReunion(datos.link);
  if (errLink) return { campo: "link", mensaje: errLink };
  return null;
}

/**
 * Lo que se guarda según la modalidad: presencial, el lugar sin link;
 * online, el link sin lugar (el formulario online no lo pide).
 */
export function normalizarDatosEntrevista(
  modalidad: ModalidadEntrevista,
  lugar: string,
  link: string,
): { lugar: string | null; link: string | null } {
  return modalidad === "presencial"
    ? { lugar: lugar.trim(), link: null }
    : { lugar: null, link: link.trim() };
}
