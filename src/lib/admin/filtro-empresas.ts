import { formatearCUIT } from "@/lib/cuit";
import { patronIlike } from "@/lib/busqueda";
import { listaIn } from "@/lib/admin/empresas-sin-confirmar";
import type { EstadoAprobacion } from "@/lib/admin/historial-empresa";

// Empresas de la oficina (/admin/empresas). Las cantidades de las pastillas y
// la lista usan el mismo aplicarFiltroEmpresas, con la misma búsqueda, para
// que los números coincidan.

/** Lo mínimo de una consulta de PostgREST que necesita aplicarFiltroEmpresas. */
interface ConsultaFiltrable<Q> {
  eq(columna: "estado_aprobacion", valor: EstadoAprobacion): Q;
  not(columna: "id", operador: "in", valor: string): Q;
  or(filtros: string): Q;
}

/**
 * Aplica el estado y la búsqueda a una consulta sobre `empresas`.
 * `busqueda`, ya pasada por limpiarBusqueda ("" sin búsqueda).
 * `sinConfirmar`: ids de las empresas que no confirmaron el email; para la
 * oficina todavía no existen y solo pueden estar pendientes (migration_042).
 */
export function aplicarFiltroEmpresas<Q extends ConsultaFiltrable<Q>>(
  consulta: Q,
  estado: EstadoAprobacion,
  busqueda: string,
  sinConfirmar: string[],
): Q {
  let q = consulta.eq("estado_aprobacion", estado);
  if (estado === "pendiente" && sinConfirmar.length > 0) {
    q = q.not("id", "in", listaIn(sinConfirmar));
  }
  if (!busqueda) return q;

  // El CUIT se guarda como XX-XXXXXXXX-X: además del texto tal cual se busca
  // la versión con guiones de los dígitos ingresados.
  const condiciones = [
    `razon_social.ilike.${patronIlike(busqueda)}`,
    `cuit.ilike.${patronIlike(busqueda)}`,
  ];
  const digitos = busqueda.replace(/\D/g, "");
  if (digitos.length >= 2) {
    condiciones.push(`cuit.ilike.${patronIlike(formatearCUIT(digitos))}`);
  }
  return q.or(condiciones.join(","));
}
