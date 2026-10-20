// Localidad de procedencia del postulante (migration_055). Se usa en el
// navegador (formularios) y en el servidor (acciones). Ver
// docs/decisiones/027-procedencia-y-prioridad.md.

/** Localidades de la zona, en el orden del desplegable: Funes primero. */
export const LOCALIDADES = [
  "Funes",
  "Rosario",
  "Roldán",
  "Pérez",
  "Granadero Baigorria",
  "Villa Gobernador Gálvez",
  "Capitán Bermúdez",
  "Ibarlucea",
  "Soldini",
  "Zavalla",
  "San Lorenzo",
] as const;

export const LOCALIDAD_FUNES = "Funes";

/** Valor del desplegable que muestra el campo para escribir la localidad. */
export const OTRA_LOCALIDAD = "otra";

export const LOCALIDAD_LARGO_MINIMO = 2;
export const LOCALIDAD_LARGO_MAXIMO = 60;

export const ERRORES_LOCALIDAD = {
  elegir: "Elegí de dónde sos.",
  escribir: "Escribí tu localidad.",
  largo: `La localidad debe tener entre ${LOCALIDAD_LARGO_MINIMO} y ${LOCALIDAD_LARGO_MAXIMO} caracteres.`,
  caracteres: "Usá solo letras, espacios, guiones, apóstrofos o puntos.",
} as const;

// Conectores que van en minúscula salvo al principio ("Cañada de Gómez").
const PALABRAS_EN_MINUSCULA = new Set(["de", "del", "la", "las", "los", "el", "y", "e"]);

/**
 * Clave para comparar localidades: minúsculas, sin tildes y solo letras a-z
 * (sin espacios, guiones ni puntos). Es la misma regla que
 * public.localidad_clave() en la base.
 */
export function claveLocalidad(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

export function esLocalidadFunes(localidad: string | null | undefined): boolean {
  return Boolean(localidad) && claveLocalidad(localidad ?? "") === "funes";
}

function unificarEspacios(texto: string): string {
  return texto.trim().replace(/\s+/g, " ");
}

/** Primera letra de cada parte en mayúscula (también después de guion, apóstrofo o punto). */
function capitalizar(palabra: string): string {
  return palabra
    .toLocaleLowerCase("es")
    .replace(/(^|[-'’.])(\p{L})/gu, (_, separador: string, letra: string) =>
      separador + letra.toLocaleUpperCase("es"),
    );
}

/**
 * Normaliza una localidad escrita a mano:
 *   - recorta y deja un solo espacio entre palabras;
 *   - si coincide con una de la lista (sin importar mayúsculas, tildes ni
 *     espacios) devuelve el nombre exacto de la lista ("perez" → "Pérez");
 *   - si no, cada palabra con mayúscula inicial respetando tildes y ñ, con
 *     los conectores en minúscula salvo al principio
 *     ("SAN JOSÉ DE LA ESQUINA" → "San José de la Esquina").
 */
export function normalizarLocalidad(texto: string): string {
  const limpio = unificarEspacios(texto);
  if (!limpio) return "";

  const clave = claveLocalidad(limpio);
  const deLaLista = LOCALIDADES.find((l) => claveLocalidad(l) === clave);
  if (deLaLista) return deLaLista;

  return limpio
    .split(" ")
    .map((palabra, i) => {
      const minuscula = palabra.toLocaleLowerCase("es");
      return i > 0 && PALABRAS_EN_MINUSCULA.has(minuscula) ? minuscula : capitalizar(palabra);
    })
    .join(" ");
}

/** null si la localidad escrita a mano es razonable; si no, el mensaje de error. */
export function validarLocalidadEscrita(texto: string): string | null {
  const limpio = unificarEspacios(texto);
  if (!limpio) return ERRORES_LOCALIDAD.escribir;
  if (limpio.length < LOCALIDAD_LARGO_MINIMO || limpio.length > LOCALIDAD_LARGO_MAXIMO) {
    return ERRORES_LOCALIDAD.largo;
  }
  if (!/^[\p{L} .'’-]+$/u.test(limpio)) return ERRORES_LOCALIDAD.caracteres;
  if ((limpio.match(/\p{L}/gu) ?? []).length < LOCALIDAD_LARGO_MINIMO) {
    return ERRORES_LOCALIDAD.largo;
  }
  return null;
}

export type ResultadoLocalidad =
  | { ok: true; localidad: string }
  | { ok: false; campo: "localidad" | "otraLocalidad"; mensaje: string };

/**
 * Localidad a guardar a partir del desplegable (`elegida`: una de LOCALIDADES
 * u OTRA_LOCALIDAD) y del campo de texto (`escrita`, solo con OTRA_LOCALIDAD).
 */
export function resolverLocalidad(elegida: unknown, escrita: unknown): ResultadoLocalidad {
  if (typeof elegida !== "string" || !elegida) {
    return { ok: false, campo: "localidad", mensaje: ERRORES_LOCALIDAD.elegir };
  }
  if (elegida !== OTRA_LOCALIDAD) {
    const deLaLista = LOCALIDADES.find((l) => l === elegida);
    return deLaLista
      ? { ok: true, localidad: deLaLista }
      : { ok: false, campo: "localidad", mensaje: ERRORES_LOCALIDAD.elegir };
  }
  const texto = typeof escrita === "string" ? escrita : "";
  const error = validarLocalidadEscrita(texto);
  if (error) return { ok: false, campo: "otraLocalidad", mensaje: error };
  return { ok: true, localidad: normalizarLocalidad(texto) };
}

/** Estado inicial del desplegable y del campo de texto para una localidad guardada. */
export function opcionDeLocalidad(localidad: string | null | undefined): {
  elegida: string;
  escrita: string;
} {
  if (!localidad) return { elegida: "", escrita: "" };
  const deLaLista = LOCALIDADES.find((l) => l === localidad);
  return deLaLista
    ? { elegida: deLaLista, escrita: "" }
    : { elegida: OTRA_LOCALIDAD, escrita: localidad };
}
