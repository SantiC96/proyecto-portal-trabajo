import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import type { AjusteAvatar, FotoPerfil } from "@/components/perfil/piezas";

// Fotos de perfil del bucket privado "avatares": siempre con URL firmada y
// leídas con la sesión del usuario, así RLS decide quién ve qué (cada uno la
// propia; la oficina, todas).

const VIGENCIA_URL_SEGUNDOS = 3600;

type FilaAvatar = {
  usuario_id: string;
  ruta: string;
  ajuste_x: number | null;
  ajuste_y: number | null;
  ajuste_zoom: number | null;
};

function ajusteDe(fila: Pick<FilaAvatar, "ajuste_x" | "ajuste_y" | "ajuste_zoom">): AjusteAvatar {
  return {
    x: Number(fila.ajuste_x ?? 50),
    y: Number(fila.ajuste_y ?? 50),
    zoom: Number(fila.ajuste_zoom ?? 1),
  };
}

/**
 * Foto activa de cada usuario pedido (los que no tienen foto no aparecen).
 * Una consulta y una firma para todo el lote.
 */
export async function fotosDePerfil(usuarioIds: string[]): Promise<Map<string, FotoPerfil>> {
  const fotos = new Map<string, FotoPerfil>();
  const ids = [...new Set(usuarioIds)];
  if (ids.length === 0) return fotos;

  const supabase = await createSupabaseServerClient();
  const { data: filas, error } = await supabase
    .from("archivos_usuario")
    .select("usuario_id, ruta, ajuste_x, ajuste_y, ajuste_zoom")
    .in("usuario_id", ids)
    .eq("tipo", "avatar")
    .eq("activo", true);

  if (error) {
    logError("fotosDePerfil", error);
    return fotos;
  }
  if (!filas || filas.length === 0) return fotos;

  const { data: firmadas, error: errorFirma } = await supabase.storage
    .from("avatares")
    .createSignedUrls(
      filas.map((f) => f.ruta),
      VIGENCIA_URL_SEGUNDOS,
    );
  if (errorFirma) logError("fotosDePerfil:firma", errorFirma);

  const urlPorRuta = new Map<string, string>();
  for (const f of firmadas ?? []) {
    if (f.path && f.signedUrl) urlPorRuta.set(f.path, f.signedUrl);
  }

  for (const fila of filas) {
    fotos.set(fila.usuario_id, {
      ruta: fila.ruta,
      url: urlPorRuta.get(fila.ruta) ?? null,
      ajuste: ajusteDe(fila),
    });
  }
  return fotos;
}

/** La función acepta hasta 100 ids por llamada (migration_060). */
const MAXIMO_CANDIDATOS_POR_LLAMADA = 100;

/**
 * Foto activa de los candidatos que ve la empresa de la sesión, por
 * postulante_id. La empresa no lee archivos_usuario: la ruta y el ajuste los
 * da avatares_de_candidatos_para_empresa (solo derivados o guardados por
 * ella) y la firma la permite la política de storage de la 029 para esas
 * mismas fotos. Una llamada y una firma para todo el lote. Si algo falla, el
 * candidato queda sin foto (iniciales).
 */
export async function fotosDeCandidatosEmpresa(
  postulanteIds: string[],
): Promise<Map<string, FotoPerfil>> {
  const fotos = new Map<string, FotoPerfil>();
  const ids = [...new Set(postulanteIds)].slice(0, MAXIMO_CANDIDATOS_POR_LLAMADA);
  if (ids.length === 0) return fotos;

  const supabase = await createSupabaseServerClient();
  const { data: filas, error } = await supabase.rpc("avatares_de_candidatos_para_empresa", {
    p_postulante_ids: ids,
  });
  if (error) {
    logError("fotosDeCandidatosEmpresa", error);
    return fotos;
  }
  if (!filas || filas.length === 0) return fotos;

  const { data: firmadas, error: errorFirma } = await supabase.storage
    .from("avatares")
    .createSignedUrls(
      filas.map((f) => f.ruta),
      VIGENCIA_URL_SEGUNDOS,
    );
  if (errorFirma) logError("fotosDeCandidatosEmpresa:firma", errorFirma);

  const urlPorRuta = new Map<string, string>();
  for (const f of firmadas ?? []) {
    if (f.path && f.signedUrl) urlPorRuta.set(f.path, f.signedUrl);
  }

  for (const fila of filas) {
    const url = urlPorRuta.get(fila.ruta) ?? null;
    if (!url) continue;
    fotos.set(fila.postulante_id, {
      ruta: fila.ruta,
      url,
      ajuste: ajusteDe(fila),
    });
  }
  return fotos;
}

/** Foto activa de un usuario, o null. */
export async function fotoDePerfil(usuarioId: string): Promise<FotoPerfil | null> {
  return (await fotosDePerfil([usuarioId])).get(usuarioId) ?? null;
}
