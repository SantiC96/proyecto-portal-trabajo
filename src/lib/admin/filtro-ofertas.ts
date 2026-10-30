import type { Enum } from "@/types/db";

// Pestañas de Ofertas de la oficina (/admin/ofertas). Las cantidades de las
// pastillas y la lista usan el mismo aplicarFiltroOfertasAdmin, con la misma
// búsqueda, para que los números coincidan.

// "vencida" no es un estado de la base: es una oferta 'activa' con vence_en
// vencido (migration_036). Se muestra aparte porque ya no se ve en el portal.
export const ESTADOS_FILTRO_ADMIN = [
  "pendiente_aprobacion",
  "activa",
  "vencida",
  "rechazada",
  "cerrada",
] as const;

export type EstadoFiltroAdmin = (typeof ESTADOS_FILTRO_ADMIN)[number];

export function leerEstadoFiltroAdmin(valor: string | undefined): EstadoFiltroAdmin {
  return ESTADOS_FILTRO_ADMIN.find((e) => e === valor) ?? "pendiente_aprobacion";
}

/** Lo mínimo de una consulta de PostgREST que necesita aplicarFiltroOfertasAdmin. */
interface ConsultaFiltrable<Q> {
  eq(columna: "estado", valor: Enum<"estado_oferta">): Q;
  gt(columna: "vence_en", valor: string): Q;
  lte(columna: "vence_en", valor: string): Q;
  ilike(columna: "titulo", patron: string): Q;
}

/**
 * Aplica la pestaña y la búsqueda a una consulta sobre `ofertas`. `ahora` en
 * ISO; `patron`, el de patronIlike (o null sin búsqueda).
 */
export function aplicarFiltroOfertasAdmin<Q extends ConsultaFiltrable<Q>>(
  consulta: Q,
  estado: EstadoFiltroAdmin,
  ahora: string,
  patron: string | null,
): Q {
  let q: Q;
  if (estado === "activa") q = consulta.eq("estado", "activa").gt("vence_en", ahora);
  else if (estado === "vencida") q = consulta.eq("estado", "activa").lte("vence_en", ahora);
  else q = consulta.eq("estado", estado);
  return patron ? q.ilike("titulo", patron) : q;
}
