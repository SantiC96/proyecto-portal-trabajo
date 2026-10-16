import { validarCUIT } from "@/lib/cuit";
import { DURACIONES_OFERTA, esDuracionOferta } from "@/lib/ofertas-vencimiento";
import { esValorEnum, type Enum } from "@/types/db";

/** Devuelve el mensaje de error o null si es válido. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esUuid(valor: unknown): valor is string {
  return typeof valor === "string" && UUID.test(valor);
}

export function sonUuids(valores: unknown): valores is string[] {
  return Array.isArray(valores) && valores.every(esUuid);
}

/** Largos máximos de los textos libres que se guardan en la base. */
export const LARGO_MAXIMO = {
  motivo: 2000,
  nota: 2000,
  lugarEntrevista: 500,
  descripcion: 4000,
  nombreCurso: 200,
  linkCurso: 500,
  rubro: 120,
  domicilio: 200,
  tituloOferta: 120,
  itemOferta: 200,
} as const;

/**
 * Texto opcional: acepta null/undefined/"" y controla el tipo y el largo
 * (sobre el valor recortado).
 */
export function validarTextoOpcional(valor: unknown, maximo: number): string | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor !== "string") return "El texto no es válido.";
  if (valor.trim().length > maximo) return `Puede tener hasta ${maximo} caracteres.`;
  return null;
}

export const MENSAJE_OBLIGATORIO = "Este campo es obligatorio.";

/** Vacío para un campo obligatorio: sin valor, texto solo con espacios o lista vacía. */
export function estaVacio(valor: unknown): boolean {
  if (valor === null || valor === undefined || valor === false) return true;
  if (typeof valor === "string") return !valor.trim();
  if (Array.isArray(valor)) return valor.length === 0;
  return false;
}

/** Errores de los campos obligatorios vacíos, con el mismo mensaje para todos. */
export function camposVacios<C extends string>(
  valores: Partial<Record<C, unknown>>
): Partial<Record<C, string>> {
  const errores: Partial<Record<C, string>> = {};
  for (const campo of Object.keys(valores) as C[]) {
    if (estaVacio(valores[campo])) errores[campo] = MENSAJE_OBLIGATORIO;
  }
  return errores;
}

/** Texto obligatorio: además de lo anterior, no puede quedar vacío. */
export function validarTextoObligatorio(valor: unknown, maximo: number): string | null {
  if (typeof valor !== "string" || !valor.trim()) return MENSAJE_OBLIGATORIO;
  return validarTextoOpcional(valor, maximo);
}

/** Lee un campo de texto de un FormData; si falta o es un archivo devuelve "". */
export function leerTexto(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor : "";
}

/** Lee un archivo de un FormData; si falta o es texto devuelve null. */
export function leerArchivo(formData: FormData, campo: string): File | null {
  const valor = formData.get(campo);
  return valor instanceof File ? valor : null;
}

export function validarDNI(raw: string): string | null {
  const limpio = raw.replace(/\D/g, "");
  if (limpio.length < 7 || limpio.length > 8)
    return "El DNI debe tener 7 u 8 números.";
  return null;
}

export function validarTelefono(telefono: string): string | null {
  if (!telefono.trim()) return null; // opcional
  if (!/^[+0-9 \-]{8,15}$/.test(telefono.trim()))
    return "El teléfono debe tener entre 8 y 15 caracteres (números, espacios, guiones y +).";
  return null;
}

export function validarEmail(email: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    return "El correo electrónico no tiene un formato válido.";
  return null;
}

export function validarNombre(nombre: string): string | null {
  const t = nombre.trim();
  if (t.length < 2 || t.length > 60) return "Debe tener entre 2 y 60 caracteres.";
  if (!/^[\p{L} \-']+$/u.test(t))
    return "Solo puede contener letras, espacios, apóstrofos y guiones.";
  return null;
}

export function validarPassword(password: string): string | null {
  if (!password || password.length < 6)
    return "La contraseña debe tener al menos 6 caracteres.";
  return null;
}

export function validarCuitConMensaje(raw: string): string | null {
  if (!validarCUIT(raw)) return "El CUIT no es válido.";
  return null;
}

export type OfertaData = {
  titulo: string;
  descripcion: string;
  categorias: string[];
  modalidad: string;
  jornada: string;
  requisitos: string[];
  beneficios: string[];
  cantidadVacantes: number;
  /** Días que la oferta queda publicada (migration_036). */
  duracionDias: number;
};

/** Error de validación de una oferta y el campo del formulario al que corresponde. */
export type ErrorOferta = { campo: keyof OfertaData; mensaje: string };

export function validarOferta(data: OfertaData): ErrorOferta | null {
  if (!data.titulo || data.titulo.trim().length < 5 || data.titulo.trim().length > LARGO_MAXIMO.tituloOferta)
    return { campo: "titulo", mensaje: `El título debe tener entre 5 y ${LARGO_MAXIMO.tituloOferta} caracteres.` };
  if (!data.descripcion || data.descripcion.trim().length < 30 || data.descripcion.trim().length > LARGO_MAXIMO.descripcion)
    return { campo: "descripcion", mensaje: `La descripción debe tener entre 30 y ${LARGO_MAXIMO.descripcion} caracteres.` };
  if (!data.categorias || data.categorias.length < 1 || data.categorias.length > 5)
    return { campo: "categorias", mensaje: "Seleccioná entre 1 y 5 categorías." };
  if (!esValorEnum("modalidad_oferta", data.modalidad))
    return { campo: "modalidad", mensaje: "La modalidad no es válida." };
  if (!esValorEnum("jornada_oferta", data.jornada))
    return { campo: "jornada", mensaje: "La jornada no es válida." };
  if (!esDuracionOferta(data.duracionDias))
    return {
      campo: "duracionDias",
      mensaje: `La duración debe ser de ${DURACIONES_OFERTA.join(", ").replace(/, (\d+)$/, " o $1")} días.`,
    };
  const reqLimpios = data.requisitos.filter((r) => r.trim().length > 0);
  if (reqLimpios.length < 1)
    return { campo: "requisitos", mensaje: "Agregá al menos un requisito." };
  if (reqLimpios.length > 15)
    return { campo: "requisitos", mensaje: "Podés agregar hasta 15 requisitos." };
  if (data.beneficios.filter((b) => b.trim().length > 0).length > 15)
    return { campo: "beneficios", mensaje: "Podés agregar hasta 15 beneficios." };
  for (const req of data.requisitos) {
    if (req.trim().length > LARGO_MAXIMO.itemOferta)
      return { campo: "requisitos", mensaje: `Cada requisito puede tener hasta ${LARGO_MAXIMO.itemOferta} caracteres.` };
  }
  for (const ben of data.beneficios) {
    if (ben.trim().length > LARGO_MAXIMO.itemOferta)
      return { campo: "beneficios", mensaje: `Cada beneficio puede tener hasta ${LARGO_MAXIMO.itemOferta} caracteres.` };
  }
  if (!Number.isInteger(data.cantidadVacantes) || data.cantidadVacantes < 1)
    return {
      campo: "cantidadVacantes",
      mensaje: "La cantidad de vacantes debe ser un número entero mayor o igual a 1.",
    };
  return null;
}

export type OfertaValidada = Omit<OfertaData, "modalidad" | "jornada"> & {
  modalidad: Enum<"modalidad_oferta">;
  jornada: Enum<"jornada_oferta">;
};

function esListaDeTextos(valor: unknown): valor is string[] {
  return Array.isArray(valor) && valor.every((v) => typeof v === "string");
}

/**
 * Validación de servidor: además de las reglas de validarOferta controla los
 * tipos, porque una server action puede recibir cualquier cosa.
 */
export function validarOfertaRecibida(
  data: OfertaData,
): { ok: true; oferta: OfertaValidada } | { ok: false; mensaje: string; campo?: keyof OfertaData } {
  if (
    typeof data !== "object" ||
    data === null ||
    typeof data.titulo !== "string" ||
    typeof data.descripcion !== "string" ||
    typeof data.modalidad !== "string" ||
    typeof data.jornada !== "string" ||
    !esListaDeTextos(data.requisitos) ||
    !esListaDeTextos(data.beneficios) ||
    !Array.isArray(data.categorias) ||
    typeof data.cantidadVacantes !== "number" ||
    typeof data.duracionDias !== "number"
  ) {
    return { ok: false, mensaje: "Los datos de la oferta no son válidos." };
  }
  if (!sonUuids(data.categorias)) {
    return { ok: false, mensaje: "Una o más categorías no son válidas." };
  }

  const errorOferta = validarOferta(data);
  if (errorOferta) return { ok: false, ...errorOferta };

  const { modalidad, jornada } = data;
  if (!esValorEnum("modalidad_oferta", modalidad)) {
    return { ok: false, campo: "modalidad", mensaje: "La modalidad no es válida." };
  }
  if (!esValorEnum("jornada_oferta", jornada)) {
    return { ok: false, campo: "jornada", mensaje: "La jornada no es válida." };
  }
  return { ok: true, oferta: { ...data, modalidad, jornada } };
}
