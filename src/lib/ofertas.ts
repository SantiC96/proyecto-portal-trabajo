import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { limpiarBusqueda } from "@/lib/busqueda";
import { consultarPagina, leerPagina, type ParamsUrl } from "@/lib/paginacion";
import type { Jornada, Modalidad, OfertaLaboral } from "@/types/oferta";

type DbOfertaRow = {
  id: string;
  empresa_nombre: string;
  titulo: string;
  descripcion: string;
  created_at: string;
  publicado_en: string | null;
  ubicacion: string;
  modalidad: string;
  jornada: string;
  requisitos: string[];
  beneficios: string[];
  oferta_categorias: Array<{ categorias: { nombre: string } | null }>;
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
  oferta_categorias(categorias(nombre))
` as const;

function mapRow(row: DbOfertaRow): OfertaLaboral {
  const categorias = (row.oferta_categorias ?? [])
    .map((oc) => oc.categorias?.nombre)
    .filter((n): n is string => Boolean(n));
  return {
    id: row.id,
    titulo: row.titulo,
    empresa: row.empresa_nombre,
    categorias,
    ubicacion: row.ubicacion,
    modalidad: row.modalidad as OfertaLaboral["modalidad"],
    jornada: row.jornada as OfertaLaboral["jornada"],
    descripcion: row.descripcion,
    requisitos: row.requisitos ?? [],
    beneficios: row.beneficios ?? [],
    // publicado_en se fija al aprobar; se cae a created_at para ofertas sin ese dato.
    fechaPublicacion: row.publicado_en ?? row.created_at,
  };
}

// Fila de public.buscar_ofertas_publicas (migration_034).
type FilaOfertaPublica = {
  id: string;
  empresa_nombre: string;
  titulo: string;
  descripcion: string;
  created_at: string;
  publicado_en: string | null;
  ubicacion: string;
  modalidad: string;
  jornada: string;
  requisitos: string[] | null;
  beneficios: string[] | null;
  categorias: string[] | null;
  total_count: number;
};

function mapFilaPublica(fila: FilaOfertaPublica): OfertaLaboral {
  return {
    id: fila.id,
    titulo: fila.titulo,
    empresa: fila.empresa_nombre,
    categorias: fila.categorias ?? [],
    ubicacion: fila.ubicacion,
    modalidad: fila.modalidad as Modalidad,
    jornada: fila.jornada as Jornada,
    descripcion: fila.descripcion,
    requisitos: fila.requisitos ?? [],
    beneficios: fila.beneficios ?? [],
    fechaPublicacion: fila.publicado_en ?? fila.created_at,
  };
}

export const MODALIDADES: readonly Modalidad[] = ["Presencial", "Híbrido", "Remoto"];

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
        p_q: filtros.q || null,
        p_categoria: filtros.categoria,
        p_modalidad: filtros.modalidad,
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
    ofertas: resultado.filas.map(mapFilaPublica),
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
  return data.map((row) => row.nombre as string);
}

export async function getCategoriasConId(): Promise<{ id: string; nombre: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categorias")
    .select("id, nombre")
    .order("nombre");

  if (error || !data) return [];
  return data as { id: string; nombre: string }[];
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
  return mapRow(data as unknown as DbOfertaRow);
}
