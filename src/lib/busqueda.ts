import type { ValorParam } from "@/lib/paginacion";

export const LARGO_MAXIMO_BUSQUEDA = 100;

// Caracteres que rompen o alteran la sintaxis de filtros de PostgREST:
// coma y paréntesis separan/agrupan condiciones dentro de .or(), las comillas
// abren valores citados, los dos puntos separan modificadores y "*" es un
// alias de "%" en like/ilike. Se reemplazan por un espacio.
const RESERVADOS_POSTGREST = /[,()"'`:*]/g;

const CONTROL = /[\u0000-\u001f\u007f]/g;

/**
 * Normaliza el texto de búsqueda que llega por la URL: quita caracteres de
 * control y reservados de PostgREST, colapsa espacios, hace trim y corta en
 * LARGO_MAXIMO_BUSQUEDA caracteres. Devuelve "" si no queda nada que buscar.
 *
 * El resultado es seguro para mostrarse y para pasarse como parámetro a una
 * función RPC. Para usarlo en .ilike() o .or() hay que pasarlo por patronIlike.
 */
export function limpiarBusqueda(valor: ValorParam): string {
  const crudo = Array.isArray(valor) ? valor[0] : valor;
  if (!crudo) return "";

  const limpio = crudo
    .normalize("NFC")
    .replace(CONTROL, " ")
    .replace(RESERVADOS_POSTGREST, " ")
    .replace(/\s+/g, " ")
    .trim();

  return Array.from(limpio).slice(0, LARGO_MAXIMO_BUSQUEDA).join("").trim();
}

/**
 * Patrón "contiene" para ilike: escapa los comodines \ % _ (para que se
 * busquen literalmente) y envuelve el texto entre %.
 * Recibe un texto ya pasado por limpiarBusqueda.
 */
export function patronIlike(texto: string): string {
  const escapado = texto.replace(/[\\%_]/g, (c) => `\\${c}`);
  return `%${escapado}%`;
}
