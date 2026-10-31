import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { limpiarBusqueda } from "@/lib/busqueda";
import { consultarPagina, leerPagina, type ParamsUrl } from "@/lib/paginacion";
import type { RubroConOfertas } from "@/lib/rubros-destacados";
import { VALORES_ENUM, type FilaOfertaPublica, type Tabla } from "@/types/db";
import type { Modalidad, OfertaLaboral } from "@/types/oferta";

type DbOfertaRow = Pick<
  Tabla<"ofertas">,
  | "id"
  | "empresa_nombre"
  | "titulo"
  | "descripcion"
  | "created_at"
  | "publicado_en"
  | "ubicacion"
  | "modalidad"
  | "jornada"
  | "requisitos"
  | "beneficios"
  | "vence_en"
> & {
  oferta_categorias: Array<{ categorias: Pick<Tabla<"categorias">, "nombre"> | null }>;
};

const OFERTA_SELECT = `
  id,
  empresa_nombre,
  titulo,
  descripcion,
  created_at,
  publicado_en,
  ubicacion,
  modalidad,
  jornada,
  requisitos,
  beneficios,
  vence_en,
  oferta_categorias(categorias(nombre))
` as const;

/** Nombres de los rubros de una oferta leídos con oferta_categorias(categorias(nombre)). */
export function nombresCategorias(
  ofertaCategorias: DbOfertaRow["oferta_categorias"] | null | undefined,
): string[] {
  return (ofertaCategorias ?? [])
    .map((oc) => oc.categorias?.nombre)
    .filter((n): n is string => Boolean(n));
}

function mapRow(row: DbOfertaRow): OfertaLaboral {
  const categorias = nombresCategorias(row.oferta_categorias);
  return {
    id: row.id,
    titulo: row.titulo,
    empresa: row.empresa_nombre,
    categorias,
    ubicacion: row.ubicacion,
    modalidad: row.modalidad,
    jornada: row.jornada,
    descripcion: row.descripcion,
    requisitos: row.requisitos ?? [],
    beneficios: row.beneficios ?? [],
    // publicado_en se fija al aprobar; se cae a created_at para ofertas sin ese dato.
    fechaPublicacion: row.publicado_en ?? row.created_at,
    venceEn: row.vence_en,
  };
}

/**
 * buscar_ofertas_publicas (034) y buscar_ofertas_publicas_multiple (062)
 * devuelven modalidad y jornada como text; se descartan las filas con un valor fuera del enum en lugar de forzar
 * el tipo (no deberían existir: las columnas de ofertas son enums).
 */
function mapFilaPublica(fila: FilaOfertaPublica): OfertaLaboral[] {
  const { modalidad, jornada } = fila;
  if (!esModalidad(modalidad) || !esJornada(jornada)) return [];
  return [{
    id: fila.id,
    titulo: fila.titulo,
    empresa: fila.empresa_nombre,
    categorias: fila.categorias ?? [],
    ubicacion: fila.ubicacion,
    modalidad,
    jornada,
    descripcion: fila.descripcion,
    requisitos: fila.requisitos ?? [],
    beneficios: fila.beneficios ?? [],
    fechaPublicacion: fila.publicado_en ?? fila.created_at,
  }];
}

export const MODALIDADES: readonly Modalidad[] = VALORES_ENUM.modalidad_oferta;

function esModalidad(valor: string): valor is Modalidad {
  return MODALIDADES.some((m) => m === valor);
}

function esJornada(valor: string): valor is OfertaLaboral["jornada"] {
  return VALORES_ENUM.jornada_oferta.some((j) => j === valor);
}

export type FiltrosOfertasPublicas = {
  /** Texto ya pasado por limpiarBusqueda. */
  q: string;
  /** Rubros elegidos (por nombre), en el orden del catálogo, sin repetidos. */
  categorias: string[];
  /** Modalidades elegidas, en el orden de MODALIDADES, sin repetidas. */
  modalidades: Modalidad[];
  pagina: number;
};

function valoresParam(valor: ParamsUrl[string]): string[] {
  if (valor === undefined) return [];
  return Array.isArray(valor) ? valor : [valor];
}

/**
 * Lee y valida q, categoria, modalidad y pagina. categoria y modalidad se
 * pueden repetir (?categoria=A&categoria=B); un solo valor, como en los links
 * del buscador del inicio, también sirve. Los valores desconocidos no filtran.
 */
export function leerFiltrosOfertasPublicas(
  searchParams: ParamsUrl,
  categorias: string[],
): FiltrosOfertasPublicas {
  const pedidas = new Set(valoresParam(searchParams.categoria));
  const modalidades = new Set(valoresParam(searchParams.modalidad));
  return {
    q: limpiarBusqueda(searchParams.q),
    categorias: categorias.filter((c) => pedidas.has(c)),
    modalidades: MODALIDADES.filter((m) => modalidades.has(m)),
    pagina: leerPagina(searchParams.pagina),
  };
}

export function hayFiltrosOfertas(filtros: FiltrosOfertasPublicas): boolean {
  return filtros.categorias.length > 0 || filtros.modalidades.length > 0;
}

export type ResultadoOfertasPublicas =
  | { ok: true; ofertas: OfertaLaboral[]; total: number; pagina: number }
  | { ok: false; ofertas: []; total: 0; pagina: number; refError: string };

export async function buscarOfertasPublicas(
  filtros: FiltrosOfertasPublicas,
): Promise<ResultadoOfertasPublicas> {
  const supabase = await createSupabaseServerClient();

  const resultado = await consultarPagina<FilaOfertaPublica>(
    filtros.pagina,
    async (desde, hasta) => {
      const respuesta = await supabase.rpc("buscar_ofertas_publicas_multiple", {
        p_q: filtros.q || undefined,
        p_categorias: filtros.categorias.length > 0 ? filtros.categorias : undefined,
        p_modalidades: filtros.modalidades.length > 0 ? filtros.modalidades : undefined,
        p_limite: hasta - desde + 1,
        p_desplazamiento: desde,
      });
      const data: FilaOfertaPublica[] | null = respuesta.data;
      // La función informa el total en cada fila; sin filas fuera de la
      // primera página el total es desconocido y consultarPagina lo vuelve a pedir.
      const count = data && data.length > 0 ? Number(data[0].total_count) : desde === 0 ? 0 : null;
      return { data, count, error: respuesta.error };
    },
  );

  if (!resultado.ok) {
    const refError = logError("buscar_ofertas_publicas_multiple", resultado.error);
    return { ok: false, ofertas: [], total: 0, pagina: 1, refError };
  }

  return {
    ok: true,
    ofertas: resultado.filas.flatMap(mapFilaPublica),
    total: resultado.total,
    pagina: resultado.pagina,
  };
}

export type ConteoModalidad = { modalidad: Modalidad; cantidad: number };

/**
 * Cuántas ofertas visibles cumplen el texto y los rubros, por modalidad (sin
 * filtrar por modalidad). Para sugerir otra modalidad en el estado vacío; si
 * falla, se registra y se devuelve una lista vacía (el estado vacío común).
 */
export async function contarOfertasPorModalidad(
  q: string,
  categorias: string[],
): Promise<ConteoModalidad[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("contar_ofertas_por_modalidad", {
    p_q: q || undefined,
    p_categorias: categorias.length > 0 ? categorias : undefined,
  });
  if (error) {
    logError("contar_ofertas_por_modalidad", error);
    return [];
  }
  return (data ?? []).flatMap((f) => {
    const cantidad = Number(f.cantidad);
    return esModalidad(f.modalidad) && cantidad > 0 ? [{ modalidad: f.modalidad, cantidad }] : [];
  });
}

/**
 * Rubros con al menos una oferta vigente y cuántas tiene cada uno, por
 * nombre. Para "Explorá por rubro" y el panel "Todos los rubros" de /ofertas.
 */
export async function contarOfertasVigentesPorRubro(): Promise<
  { ok: true; rubros: RubroConOfertas[] } | { ok: false; refError: string }
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("contar_ofertas_vigentes_por_rubro");
  if (error) return { ok: false, refError: logError("contar_ofertas_vigentes_por_rubro", error) };
  return {
    ok: true,
    rubros: (data ?? []).flatMap((f) => {
      const cantidad = Number(f.cantidad);
      return cantidad > 0 ? [{ id: f.categoria_id, nombre: f.rubro, cantidad }] : [];
    }),
  };
}

export const OFERTAS_CARRUSEL = 10;

/**
 * Las últimas ofertas activas y vigentes para el carrusel del inicio, con la
 * misma función y la misma visibilidad que el listado público (sin filtros,
 * primera página). buscar_ofertas_publicas las ordena por fecha de creación.
 */
export async function ultimasOfertasPublicas(
  limite = OFERTAS_CARRUSEL,
): Promise<{ ok: true; ofertas: OfertaLaboral[] } | { ok: false; refError: string }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("buscar_ofertas_publicas", {
    p_limite: limite,
    p_desplazamiento: 0,
  });
  if (error) return { ok: false, refError: logError("ultimas_ofertas_publicas", error) };
  const filas: FilaOfertaPublica[] = data ?? [];
  return { ok: true, ofertas: filas.flatMap(mapFilaPublica) };
}

export async function getCategorias(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categorias")
    .select("nombre")
    .order("nombre");

  if (error || !data) return [];
  return data.map((row) => row.nombre);
}

export async function getCategoriasConId(): Promise<Pick<Tabla<"categorias">, "id" | "nombre">[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categorias")
    .select("id, nombre")
    .order("nombre");

  if (error || !data) return [];
  return data;
}

export async function getOfertaById(id: string): Promise<OfertaLaboral | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ofertas")
    .select(OFERTA_SELECT)
    .eq("id", id)
    .eq("estado", "activa")
    .single();

  if (error || !data) return null;
  return mapRow(data);
}
