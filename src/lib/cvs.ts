import "server-only";
import type { ClienteSupabase } from "@/types/db";

/** Un CV como lo muestran las pantallas: nombre, fecha, tamaño y URL firmada. */
export type CvVista = {
  id: string;
  nombreOriginal: string;
  subidoEn: string;
  tamano: number;
  url: string | null;
};

export const COLUMNAS_CV = "id, ruta, nombre_original, creado_en, tamano" as const;

type FilaCv = {
  id: string;
  ruta: string;
  nombre_original: string;
  creado_en: string;
  tamano: number;
};

/**
 * Firma las URLs de varios CVs en una sola llamada a Storage. Con el cliente
 * del usuario, las políticas del bucket 'cvs' deciden qué se puede abrir
 * (migration_054): si no puede, el CV queda con url null.
 */
export async function conUrlsFirmadas(
  supabase: ClienteSupabase,
  filas: FilaCv[],
  segundos: number,
): Promise<CvVista[]> {
  if (filas.length === 0) return [];
  const { data } = await supabase.storage
    .from("cvs")
    .createSignedUrls(
      filas.map((f) => f.ruta),
      segundos,
    );
  const urls = new Map<string, string>();
  for (const firmada of data ?? []) {
    if (firmada.path && firmada.signedUrl) urls.set(firmada.path, firmada.signedUrl);
  }
  return filas.map((f) => ({
    id: f.id,
    nombreOriginal: f.nombre_original,
    subidoEn: f.creado_en,
    tamano: f.tamano,
    url: urls.get(f.ruta) ?? null,
  }));
}

/** CVs disponibles de un usuario, del más nuevo al más viejo. */
export function consultaCvsDisponibles(supabase: ClienteSupabase, usuarioId: string) {
  return supabase
    .from("archivos_usuario")
    .select(COLUMNAS_CV)
    .eq("usuario_id", usuarioId)
    .eq("tipo", "cv")
    .is("eliminado_en", null)
    .order("creado_en", { ascending: false })
    .order("id", { ascending: false });
}
