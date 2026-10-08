"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function postularme(
  ofertaId: string,
): Promise<{ error?: string; sinCV?: boolean; exito?: boolean }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado." };

  const { data: postulante } = await supabase
    .from("postulantes")
    .select("id")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!postulante) return { error: "Solo los postulantes pueden postularse." };

  const { data: oferta } = await supabase
    .from("ofertas")
    .select("id, estado")
    .eq("id", ofertaId)
    .maybeSingle();

  if (!oferta) {
    return { error: "Esta oferta no está disponible." };
  }
  if (oferta.estado !== "activa") {
    const mensajes: Record<string, string> = {
      pendiente_aprobacion: "Esta oferta está en revisión y no acepta postulaciones por el momento.",
      cerrada: "Esta oferta está cerrada y ya no acepta postulaciones.",
    };
    return {
      error: mensajes[oferta.estado as string] ?? "Esta oferta no está disponible.",
    };
  }

  const { data: cv } = await supabase
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

  // estado omitido: el DEFAULT de la columna lo fija en 'recibida' (migration_018)
  const { error } = await supabase.from("postulaciones").insert({
    oferta_id: ofertaId,
    postulante_id: postulante.id,
  });

  if (error) {
    console.error("[postularme] error al insertar postulacion", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
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

  const { data: postulante } = await supabase
    .from("postulantes")
    .select("id")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!postulante) return { error: "No autorizado." };

  const { data: postulacion } = await supabase
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

  const { data: deleted, error } = await supabase
    .from("postulaciones")
    .delete()
    .eq("id", postulacionId)
    .select("id");

  if (error) return { error: "Error al retirar la postulación. Intentá de nuevo." };
  if (!deleted || deleted.length === 0) {
    console.error("[retirarPostulacion] delete no afectó ninguna fila", { postulacionId });
    return { error: "No se pudo completar la acción." };
  }

  revalidatePath(`/ofertas/${postulacion.oferta_id}`);
  revalidatePath("/mis-postulaciones");
  return { exito: true };
}
