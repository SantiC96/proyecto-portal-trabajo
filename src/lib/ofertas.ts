import { createSupabaseServerClient } from "@/lib/supabase-server";
import { OfertaLaboral } from "@/types/oferta";

type DbOfertaRow = {
  id: string;
  empresa_nombre: string;
  titulo: string;
  descripcion: string;
  created_at: string;
  ubicacion: string;
  modalidad: string;
  jornada: string;
  requisitos: string[];
  beneficios: string[];
  destacada: boolean;
  oferta_categorias: Array<{ categorias: { nombre: string } | null }>;
};

const OFERTA_SELECT = `
  id,
  empresa_nombre,
  titulo,
  descripcion,
  created_at,
  ubicacion,
  modalidad,
  jornada,
  requisitos,
  beneficios,
  destacada,
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
    fechaPublicacion: row.created_at.split("T")[0],
    destacada: row.destacada,
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
