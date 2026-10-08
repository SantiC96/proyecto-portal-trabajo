import { createSupabaseServerClient } from "@/lib/supabase-server";
import { OfertaLaboral } from "@/types/oferta";

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
  const rubro = row.oferta_categorias?.[0]?.categorias?.nombre ?? "";
  return {
    id: row.id,
    titulo: row.titulo,
    empresa: row.empresa_nombre,
    rubro,
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

export async function getOfertasActivas(): Promise<OfertaLaboral[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ofertas")
    .select(OFERTA_SELECT)
    .eq("estado", "activa")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as DbOfertaRow[]).map(mapRow);
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
