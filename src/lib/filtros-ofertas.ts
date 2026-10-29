// Textos de los filtros del listado público de ofertas. Sin dependencias del
// servidor: lo usan también los client components.

/** "Gastronomía", "Gastronomía o Salud", "Gastronomía, Salud o Comercio". */
export function listaConO(valores: readonly string[]): string {
  if (valores.length <= 1) return valores[0] ?? "";
  return `${valores.slice(0, -1).join(", ")} o ${valores[valores.length - 1]}`;
}

/** Resumen corto de los rubros elegidos: "Gastronomía y 2 más". */
export function resumenRubros(rubros: readonly string[]): string {
  if (rubros.length <= 1) return rubros[0] ?? "";
  return `${rubros[0]} y ${rubros.length - 1} más`;
}
