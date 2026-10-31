import "server-only";
import type { EstadoDerivacionEmpresa } from "@/lib/derivacion-estados";
import type { ErrorConsulta } from "@/lib/paginacion";
import { patronIlike } from "@/lib/busqueda";
import { esUuid } from "@/lib/validaciones";
import type { ClienteSupabase } from "@/types/db";

// Pestañas de /admin/postulaciones. Las condiciones de cada una están solo
// acá: las usan el listado, las cantidades de las pastillas y el desplegable
// de ofertas, así nunca difieren.
//   pendiente   → postulaciones recibidas o en revisión.
//   derivada    → derivadas cuya derivación sigue abierta (la empresa no dio
//                 un resultado final: pendiente o en_proceso).
//   contratado  → derivaciones que la empresa marcó como contratado.
//   rechazada_municipalidad ("No seleccionado") → las que rechazó la oficina
//                 y las que rechazó la empresa (RPC
//                 postulaciones_no_seleccionadas, migration_038).
//   retirada_postulante → las que el postulante retiró ya revisadas o
//                 derivadas (migration_053). No son rechazos.
export type PestanaPostulaciones =
  | "pendiente"
  | "derivada"
  | "contratado"
  | "rechazada_municipalidad"
  | "retirada_postulante";

export type PestanaSobrePostulaciones = Extract<
  PestanaPostulaciones,
  "pendiente" | "derivada" | "retirada_postulante"
>;

export const DERIVACION_ABIERTA: EstadoDerivacionEmpresa[] = ["pendiente", "en_proceso"];

type ConsultaFiltrable<Q> = {
  eq(columna: string, valor: string): Q;
  in(columna: string, valores: readonly string[]): Q;
};

/**
 * Condición de las pestañas que se consultan sobre `postulaciones`. En
 * "derivada" la consulta tiene que incluir `derivaciones!inner(...)`.
 */
export function filtrarPestanaPostulaciones<Q extends ConsultaFiltrable<Q>>(
  query: Q,
  pestana: PestanaSobrePostulaciones,
): Q {
  if (pestana === "pendiente") return query.in("estado", ["recibida", "en_revision"]);
  if (pestana === "retirada_postulante") return query.eq("estado", "retirada_postulante");
  return query.eq("estado", "derivada").in("derivaciones.estado_empresa", DERIVACION_ABIERTA);
}

/** Condición de "Contratado", que se consulta sobre `derivaciones`. */
export function filtrarContratados<Q extends ConsultaFiltrable<Q>>(query: Q): Q {
  return query.eq("estado_empresa", "contratado");
}

/** Lo que eligió la oficina además de la pestaña: la oferta y la búsqueda. */
export type FiltrosPostulaciones = {
  /** "" sin oferta elegida. */
  ofertaId: string;
  /** Postulantes que coinciden con la búsqueda; null sin búsqueda. */
  postulanteIds: string[] | null;
};

// Un id que no existe: una búsqueda sin coincidencias filtra por él y no
// devuelve filas (in() con una lista vacía no es válido en PostgREST).
const ID_INEXISTENTE = "00000000-0000-0000-0000-000000000000";

/**
 * La oferta y la búsqueda sobre la consulta de una pestaña. "Contratado" se
 * consulta sobre `derivaciones` y filtra por la postulación embebida
 * (`postulaciones!inner(...)`); las demás, por sus propias columnas (también
 * la función de "No seleccionado").
 */
export function filtrarOfertaYBusqueda<Q extends ConsultaFiltrable<Q>>(
  query: Q,
  pestana: PestanaPostulaciones,
  { ofertaId, postulanteIds }: FiltrosPostulaciones,
): Q {
  const prefijo = pestana === "contratado" ? "postulaciones." : "";
  let q = query;
  if (ofertaId) q = q.eq(`${prefijo}oferta_id`, ofertaId);
  if (postulanteIds) {
    q = q.in(`${prefijo}postulante_id`, postulanteIds.length > 0 ? postulanteIds : [ID_INEXISTENTE]);
  }
  return q;
}

/**
 * Postulantes cuyo nombre, apellido o DNI contiene `busqueda` (ya pasada por
 * limpiarBusqueda). null sin búsqueda.
 */
export async function postulantesDeBusqueda(
  supabase: ClienteSupabase,
  busqueda: string,
): Promise<Resultado<string[] | null>> {
  if (!busqueda) return { ok: true, valor: null };
  const patron = patronIlike(busqueda);
  const [usuariosRes, postulantesRes] = await Promise.all([
    supabase.from("usuarios").select("id").or(`nombre.ilike.${patron},apellido.ilike.${patron}`),
    supabase.from("postulantes").select("id").ilike("dni", patron),
  ]);
  const error = usuariosRes.error ?? postulantesRes.error;
  if (error) return { ok: false, error };

  const idsPorDni = (postulantesRes.data ?? []).map((p) => p.id);
  const usuarioIds = (usuariosRes.data ?? []).map((u) => u.id);
  if (usuarioIds.length === 0) return { ok: true, valor: idsPorDni };

  const porUsuario = await supabase.from("postulantes").select("id").in("usuario_id", usuarioIds);
  if (porUsuario.error) return { ok: false, error: porUsuario.error };
  return {
    ok: true,
    valor: [...new Set([...idsPorDni, ...(porUsuario.data ?? []).map((p) => p.id)])],
  };
}

/**
 * Cantidad de cada pestaña con la misma oferta y la misma búsqueda que la
 * lista (conteos sin filas, en paralelo). null si falló un conteo.
 */
export async function cantidadesPorPestana(
  supabase: ClienteSupabase,
  filtros: FiltrosPostulaciones,
): Promise<Record<PestanaPostulaciones, number | null>> {
  const contar = { count: "exact", head: true } as const;
  const respuestas = await Promise.all([
    filtrarOfertaYBusqueda(
      filtrarPestanaPostulaciones(supabase.from("postulaciones").select("id", contar), "pendiente"),
      "pendiente",
      filtros,
    ),
    filtrarOfertaYBusqueda(
      filtrarPestanaPostulaciones(
        supabase.from("postulaciones").select("id, derivaciones!inner(estado_empresa)", contar),
        "derivada",
      ),
      "derivada",
      filtros,
    ),
    filtrarOfertaYBusqueda(
      filtrarContratados(
        supabase
          .from("derivaciones")
          .select("id, postulaciones!inner(oferta_id, postulante_id)", contar),
      ),
      "contratado",
      filtros,
    ),
    filtrarOfertaYBusqueda(
      supabase.rpc("postulaciones_no_seleccionadas", undefined, contar),
      "rechazada_municipalidad",
      filtros,
    ),
    filtrarOfertaYBusqueda(
      filtrarPestanaPostulaciones(
        supabase.from("postulaciones").select("id", contar),
        "retirada_postulante",
      ),
      "retirada_postulante",
      filtros,
    ),
  ]);
  const [pendiente, derivada, contratado, rechazada_municipalidad, retirada_postulante] =
    respuestas.map((r) => (r.error ? null : (r.count ?? 0)));
  return { pendiente, derivada, contratado, rechazada_municipalidad, retirada_postulante };
}

export type OpcionOferta = {
  id: string;
  titulo: string;
  empresaNombre: string | null;
  cantidad: number;
};

type Resultado<T> = { ok: true; valor: T } | { ok: false; error: ErrorConsulta };

// Supabase devuelve como máximo 1000 filas por respuesta (max_rows por
// defecto). Una tanda más corta que TANDA es la última.
const TANDA = 1000;

async function leerEnTandas<T>(
  consultar: (
    desde: number,
    hasta: number,
  ) => PromiseLike<{ data: T[] | null; error: ErrorConsulta | null }>,
): Promise<Resultado<T[]>> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += TANDA) {
    const { data, error } = await consultar(desde, desde + TANDA - 1);
    if (error) return { ok: false, error };
    const tanda = data ?? [];
    filas.push(...tanda);
    if (tanda.length < TANDA) return { ok: true, valor: filas };
  }
}

/** oferta_id de cada postulación de la pestaña (una fila por postulación). */
async function ofertaIdsDePestana(
  supabase: ClienteSupabase,
  pestana: PestanaPostulaciones,
): Promise<Resultado<string[]>> {
  if (pestana === "contratado") {
    const r = await leerEnTandas((desde, hasta) =>
      filtrarContratados(
        supabase.from("derivaciones").select("id, postulaciones!inner(oferta_id)"),
      )
        .order("id")
        .range(desde, hasta),
    );
    return r.ok ? { ok: true, valor: r.valor.map((d) => d.postulaciones.oferta_id) } : r;
  }

  if (pestana === "rechazada_municipalidad") {
    const r = await leerEnTandas((desde, hasta) =>
      supabase
        .rpc("postulaciones_no_seleccionadas")
        .select("postulacion_id, oferta_id")
        .order("postulacion_id")
        .range(desde, hasta),
    );
    return r.ok ? { ok: true, valor: r.valor.map((p) => p.oferta_id) } : r;
  }

  if (pestana === "derivada") {
    const r = await leerEnTandas((desde, hasta) =>
      filtrarPestanaPostulaciones(
        supabase.from("postulaciones").select("id, oferta_id, derivaciones!inner(estado_empresa)"),
        pestana,
      )
        .order("id")
        .range(desde, hasta),
    );
    return r.ok ? { ok: true, valor: r.valor.map((p) => p.oferta_id) } : r;
  }

  const r = await leerEnTandas((desde, hasta) =>
    filtrarPestanaPostulaciones(supabase.from("postulaciones").select("id, oferta_id"), pestana)
      .order("id")
      .range(desde, hasta),
  );
  return r.ok ? { ok: true, valor: r.valor.map((p) => p.oferta_id) } : r;
}

// Ids por consulta al pedir los datos de las ofertas (que la URL no se haga
// demasiado larga).
const IDS_POR_CONSULTA = 100;

/**
 * Ofertas con al menos una postulación en la pestaña y cuántas tiene cada
 * una, ordenadas por título sin distinguir mayúsculas. Deja afuera borradores
 * y ofertas eliminadas. `ofertaElegida` (la de la URL) siempre aparece, con
 * 0 si no tiene postulaciones en la pestaña.
 */
export async function ofertasDePestana(
  supabase: ClienteSupabase,
  pestana: PestanaPostulaciones,
  ofertaElegida: string,
): Promise<Resultado<OpcionOferta[]>> {
  const ids = await ofertaIdsDePestana(supabase, pestana);
  if (!ids.ok) return ids;

  const cantidades = new Map<string, number>();
  for (const id of ids.valor) cantidades.set(id, (cantidades.get(id) ?? 0) + 1);

  const elegida = esUuid(ofertaElegida) ? ofertaElegida : null;
  const aBuscar = [...cantidades.keys()];
  if (elegida && !cantidades.has(elegida)) aBuscar.push(elegida);

  const opciones: OpcionOferta[] = [];
  for (let i = 0; i < aBuscar.length; i += IDS_POR_CONSULTA) {
    const { data, error } = await supabase
      .from("ofertas")
      .select("id, titulo, empresa_nombre, estado, eliminada_en")
      .in("id", aBuscar.slice(i, i + IDS_POR_CONSULTA));
    if (error) return { ok: false, error };
    for (const o of data ?? []) {
      const visible = o.eliminada_en === null && o.estado !== "borrador";
      if (!visible && o.id !== elegida) continue;
      opciones.push({
        id: o.id,
        titulo: o.titulo,
        empresaNombre: o.empresa_nombre,
        cantidad: cantidades.get(o.id) ?? 0,
      });
    }
  }

  if (elegida && !opciones.some((o) => o.id === elegida)) {
    opciones.push({ id: elegida, titulo: "Oferta seleccionada", empresaNombre: null, cantidad: 0 });
  }

  opciones.sort(
    (a, b) =>
      a.titulo.localeCompare(b.titulo, "es", { sensitivity: "base" }) ||
      (a.empresaNombre ?? "").localeCompare(b.empresaNombre ?? "", "es", { sensitivity: "base" }) ||
      a.id.localeCompare(b.id),
  );
  return { ok: true, valor: opciones };
}
