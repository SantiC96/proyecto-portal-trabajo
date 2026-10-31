// Comprobantes de domicilio de la oficina (/admin/comprobantes). Las
// cantidades de las pastillas y la lista usan el mismo
// aplicarFiltroComprobantes, para que los números coincidan.

export const PESTANAS_COMPROBANTES = ["por-revisar", "revisados"] as const;
export type PestanaComprobantes = (typeof PESTANAS_COMPROBANTES)[number];

export function leerPestanaComprobantes(valor: string | undefined): PestanaComprobantes {
  return PESTANAS_COMPROBANTES.find((p) => p === valor) ?? "por-revisar";
}

/** Lo mínimo de una consulta de PostgREST que necesita aplicarFiltroComprobantes. */
interface ConsultaFiltrable<Q> {
  eq(columna: "tipo" | "verificacion_estado", valor: string): Q;
  is(columna: "eliminado_en", valor: null): Q;
  in(columna: "verificacion_estado", valores: string[]): Q;
}

/**
 * Aplica la pestaña a una consulta sobre `archivos_usuario`: solo el
 * comprobante vigente de cada postulante (el reemplazado queda con
 * eliminado_en).
 */
export function aplicarFiltroComprobantes<Q extends ConsultaFiltrable<Q>>(
  consulta: Q,
  pestana: PestanaComprobantes,
): Q {
  const vigentes = consulta.eq("tipo", "comprobante_domicilio").is("eliminado_en", null);
  return pestana === "por-revisar"
    ? vigentes.eq("verificacion_estado", "pendiente")
    : vigentes.in("verificacion_estado", ["aprobado", "rechazado"]);
}
