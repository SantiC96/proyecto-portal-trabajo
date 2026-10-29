// Qué rubros se muestran como tarjetas en "Explorá por rubro" (/ofertas).
// Sin dependencias del servidor: función pura.

/** Un rubro con ofertas vigentes (contar_ofertas_vigentes_por_rubro, 065). */
export type RubroConOfertas = { id: string; nombre: string; cantidad: number };

export const RUBROS_DESTACADOS = 6;

/** Más ofertas primero; a igual cantidad, por nombre. */
function porCantidad(a: RubroConOfertas, b: RubroConOfertas): number {
  return b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, "es");
}

/**
 * Los rubros de las tarjetas:
 *  - con los rubros del perfil del postulante (ids), primero los del perfil
 *    que tienen ofertas vigentes, por cantidad; si son menos que `cantidad`,
 *    se completa con los que tienen más ofertas; si son más, quedan los que
 *    tienen más ofertas;
 *  - sin perfil (null o vacío): los que tienen más ofertas.
 * Solo se consideran rubros con al menos una oferta.
 */
export function elegirRubrosDestacados(
  rubros: readonly RubroConOfertas[],
  idsPerfil: readonly string[] | null,
  cantidad = RUBROS_DESTACADOS,
): RubroConOfertas[] {
  const conOfertas = rubros.filter((r) => r.cantidad > 0).sort(porCantidad);
  const perfil = new Set(idsPerfil ?? []);
  const delPerfil = conOfertas.filter((r) => perfil.has(r.id));
  const resto = conOfertas.filter((r) => !perfil.has(r.id));
  return [...delPerfil, ...resto].slice(0, cantidad);
}
