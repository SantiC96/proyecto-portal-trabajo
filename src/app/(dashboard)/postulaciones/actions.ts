"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function postularme(
  ofertaId: string,
): Promise<{ error?: string; sinCV?: boolean; exito?: boolean }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado." };

  const { data: postulante } = await supabaseAdmin
    .from("postulantes")
    .select("id")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!postulante) return { error: "Solo los postulantes pueden postularse." };

  const { data: oferta } = await supabaseAdmin
    .from("ofertas")
    .select("id, estado")
    .eq("id", ofertaId)
    .maybeSingle();

  if (!oferta || oferta.estado !== "activa") {
    return { error: "Esta oferta no está disponible." };
  }

  const { data: cv } = await supabaseAdmin
    .from("archivos_usuario")
    .select("id")
    .eq("usuario_id", user.id)
    .eq("tipo", "cv")
    .eq("activo", true)
    .maybeSingle();

  if (!cv) {
    return {
      error: "Necesitás cargar tu CV antes de postularte.",
      sinCV: true,
    };
  }

  const { error } = await supabaseAdmin.from("postulaciones").insert({
    oferta_id: ofertaId,
    postulante_id: postulante.id,
    estado: "recibida",
  });

  if (error) {
    if (error.code === "23505") return { error: "Ya te postulaste a esta oferta." };
    return { error: "Error al procesar la postulación. Intentá de nuevo." };
  }

  revalidatePath(`/ofertas/${ofertaId}`);
  revalidatePath("/mis-postulaciones");
  return { exito: true };
}

export async function retirarPostulacion(
  postulacionId: string,
): Promise<{ error?: string; exito?: boolean }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado." };

  const { data: postulante } = await supabaseAdmin
    .from("postulantes")
    .select("id")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!postulante) return { error: "No autorizado." };

  const { data: postulacion } = await supabaseAdmin
    .from("postulaciones")
    .select("id, estado, postulante_id, oferta_id")
    .eq("id", postulacionId)
    .maybeSingle();

  if (!postulacion) return { error: "Postulación no encontrada." };
  if (postulacion.postulante_id !== postulante.id) return { error: "No autorizado." };
  if (postulacion.estado !== "recibida") {
    return {
      error: "Ya no podés retirar esta postulación porque está siendo revisada.",
    };
  }

  const { error } = await supabaseAdmin
    .from("postulaciones")
    .delete()
    .eq("id", postulacionId);

  if (error) return { error: "Error al retirar la postulación. Intentá de nuevo." };

  revalidatePath(`/ofertas/${postulacion.oferta_id}`);
  revalidatePath("/mis-postulaciones");
  return { exito: true };
}
