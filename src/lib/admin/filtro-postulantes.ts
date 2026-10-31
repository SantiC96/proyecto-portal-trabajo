import { patronIlike } from "@/lib/busqueda";
import type { ErrorConsulta } from "@/lib/paginacion";
import type { NivelPrioridad } from "@/lib/procedencia";
import type { ClienteSupabase } from "@/types/db";

// Postulantes de la oficina (/admin/postulantes). Las cantidades de las
// pastillas de procedencia, los totales de cada grupo y la lista usan el
// mismo aplicarFiltroPostulantes, así los números coinciden.

/**
 * Postulantes que cumplen la búsqueda y los rubros. Cada lista es undefined
 * si ese filtro no está; una lista vacía quiere decir que nadie lo cumple.
 */
export type IdsFiltroPostulantes = {
  porRubros: string[] | undefined;
  porTexto: string[] | undefined;
};

/** Ningún postulante cumple uno de los filtros: la lista y los conteos dan 0. */
export function sinCoincidencias({ porRubros, porTexto }: IdsFiltroPostulantes): boolean {
  return (porRubros !== undefined && porRubros.length === 0) ||
    (porTexto !== undefined && porTexto.length === 0);
}

/**
 * Resuelve la búsqueda (nombre, apellido o DNI; ya pasada por
 * limpiarBusqueda) y los rubros (postulantes con al menos uno de ellos).
 */
export async function idsFiltroPostulantes(
  supabase: ClienteSupabase,
  busqueda: string,
  rubroIds: string[],
): Promise<{ ok: true; ids: IdsFiltroPostulantes } | { ok: false; error: ErrorConsulta }> {
  let porRubros: string[] | undefined;
  if (rubroIds.length > 0) {
    const { data, error } = await supabase
      .from("postulante_categorias")
      .select("postulante_id")
      .in("categoria_id", rubroIds);
    if (error) return { ok: false, error };
    porRubros = [...new Set((data ?? []).map((r) => r.postulante_id))];
  }

  let porTexto: string[] | undefined;
  if (busqueda) {
    const patron = patronIlike(busqueda);
    const [usuariosRes, dniRes] = await Promise.all([
      supabase.from("usuarios").select("id").or(`nombre.ilike.${patron},apellido.ilike.${patron}`),
      supabase.from("postulantes").select("id").ilike("dni", patron),
    ]);
    const error = usuariosRes.error ?? dniRes.error;
    if (error) return { ok: false, error };

    const usuarioIds = (usuariosRes.data ?? []).map((r) => r.id);
    let porNombre: string[] = [];
    if (usuarioIds.length > 0) {
      const { data, error: errorNombre } = await supabase
        .from("postulantes")
        .select("id")
        .in("usuario_id", usuarioIds);
      if (errorNombre) return { ok: false, error: errorNombre };
      porNombre = (data ?? []).map((r) => r.id);
    }
    porTexto = [...new Set([...porNombre, ...(dniRes.data ?? []).map((r) => r.id)])];
  }

  return { ok: true, ids: { porRubros, porTexto } };
}

/** Lo mínimo de una consulta de PostgREST que necesita aplicarFiltroPostulantes. */
interface ConsultaFiltrable<Q> {
  in(columna: "id", valores: readonly string[]): Q;
  eq(columna: "nivel_prioridad", valor: number): Q;
}

/**
 * Búsqueda, rubros y, si hay, el nivel de prioridad (?procedencia=) sobre una
 * consulta de `postulantes`.
 */
export function aplicarFiltroPostulantes<Q extends ConsultaFiltrable<Q>>(
  consulta: Q,
  { porRubros, porTexto }: IdsFiltroPostulantes,
  nivel: NivelPrioridad | null,
): Q {
  let q = consulta;
  if (porRubros !== undefined) q = q.in("id", porRubros);
  if (porTexto !== undefined) q = q.in("id", porTexto);
  if (nivel !== null) q = q.eq("nivel_prioridad", nivel);
  return q;
}
