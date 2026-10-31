import { patronIlike } from "@/lib/busqueda";

/** Pestañas del listado de cursos de la oficina (?estado=). */
export const PESTANAS_CURSOS = ["activos", "inactivos"] as const;
export type PestanaCursos = (typeof PESTANAS_CURSOS)[number];

export const LABEL_PESTANA_CURSOS: Record<PestanaCursos, string> = {
  activos: "Activos",
  inactivos: "Inactivos",
};

export function leerPestanaCursos(valor: string | undefined): PestanaCursos {
  return valor === "inactivos" ? "inactivos" : "activos";
}

type ConsultaCursos<Q> = {
  eq(columna: "activo", valor: boolean): Q;
  ilike(columna: "nombre", patron: string): Q;
};

/**
 * Filtro único de la pestaña y la búsqueda por nombre: lo usan el conteo de
 * las pastillas y la lista, así los números coinciden con lo que se ve.
 */
export function filtrarCursos<Q extends ConsultaCursos<Q>>(
  query: Q,
  pestana: PestanaCursos,
  q: string,
): Q {
  const filtrada = query.eq("activo", pestana === "activos");
  return q ? filtrada.ilike("nombre", patronIlike(q)) : filtrada;
}
