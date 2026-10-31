// Textos y links de los filtros del listado público de ofertas. Sin
// dependencias del servidor: lo usan también los client components.

import { hrefConParams, type ParamsUrl } from "@/lib/paginacion";

/** "Gastronomía", "Gastronomía o Salud", "Gastronomía, Salud o Comercio". */
export function listaConO(valores: readonly string[]): string {
  if (valores.length <= 1) return valores[0] ?? "";
  return `${valores.slice(0, -1).join(", ")} o ${valores[valores.length - 1]}`;
}

/**
 * Agrega o saca `valor` de los elegidos. La lista sale en el orden de
 * `todos` (el catálogo), así la URL es siempre la misma.
 */
export function alternarValor<T extends string>(
  todos: readonly T[],
  elegidos: readonly T[],
  valor: T,
): T[] {
  return todos.filter((v) => (v === valor ? !elegidos.includes(v) : elegidos.includes(v)));
}

type FiltrosEnUrl = {
  categorias: readonly string[];
  modalidades: readonly string[];
};

/**
 * Link del listado con los filtros cambiados y la página 1. Escribe siempre
 * las dos listas ya validadas: un valor desconocido de la URL no se arrastra.
 * El texto (q) y el resto de los parámetros se conservan salvo que se cambien.
 */
export function hrefFiltrosOfertas(
  ruta: string,
  searchParams: ParamsUrl,
  filtros: FiltrosEnUrl,
  cambios: { categoria?: readonly string[] | null; modalidad?: readonly string[] | null; q?: null },
): string {
  return hrefConParams(ruta, searchParams, {
    categoria: filtros.categorias,
    modalidad: filtros.modalidades,
    ...cambios,
    pagina: null,
  });
}
