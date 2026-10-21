import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { limpiarBusqueda } from "@/lib/busqueda";
import { consultarPagina, leerPagina, type ParamsUrl } from "@/lib/paginacion";
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
 * buscar_ofertas_publicas (migration_034) devuelve modalidad y jornada como
 * text; se descartan las filas con un valor fuera del enum en lugar de forzar
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
  categoria: string | null;
  modalidad: Modalidad | null;
  pagina: number;
};

/** Lee y valida q, categoria, modalidad y pagina; los valores desconocidos no filtran. */
export function leerFiltrosOfertasPublicas(
  searchParams: ParamsUrl,
  categorias: string[],
): FiltrosOfertasPublicas {
  const primero = (v: ParamsUrl[string]) => (Array.isArray(v) ? v[0] : v) ?? "";
  const categoria = primero(searchParams.categoria);
  const modalidad = primero(searchParams.modalidad);
  return {
    q: limpiarBusqueda(searchParams.q),
    categoria: categorias.includes(categoria) ? categoria : null,
    modalidad: MODALIDADES.find((m) => m === modalidad) ?? null,
    pagina: leerPagina(searchParams.pagina),
  };
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
      const respuesta = await supabase.rpc("buscar_ofertas_publicas", {
        p_q: filtros.q || undefined,
        p_categoria: filtros.categoria ?? undefined,
        p_modalidad: filtros.modalidad ?? undefined,
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
    const refError = logError("buscar_ofertas_publicas", resultado.error);
    return { ok: false, ofertas: [], total: 0, pagina: 1, refError };
  }

  return {
    ok: true,
    ofertas: resultado.filas.flatMap(mapFilaPublica),
    total: resultado.total,
    pagina: resultado.pagina,
  };
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
