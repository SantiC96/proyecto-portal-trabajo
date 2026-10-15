"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { err, errConRef, fromSupabaseError, okMsg, type Resultado } from "@/lib/resultado";

export async function postularme(
  ofertaId: string,
): Promise<Resultado<void>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return err("NO_AUTENTICADO");

  const { data: postulante } = await supabase
    .from("postulantes")
    .select("id")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!postulante) return err("SIN_PERMISO", "Solo los postulantes pueden postularse.");

  const { data: oferta } = await supabase
    .from("ofertas")
    .select("id, estado, vence_en")
    .eq("id", ofertaId)
    .maybeSingle();

  if (!oferta) {
    return err("NO_ENCONTRADO", "Esta oferta no está disponible.");
  }
  if (oferta.estado !== "activa") {
    const mensajes: Record<string, string> = {
      pendiente_aprobacion: "Esta oferta está en revisión y no acepta postulaciones por el momento.",
      cerrada: "Esta oferta está cerrada y ya no acepta postulaciones.",
    };
    return err(
      "ESTADO_INVALIDO",
      mensajes[oferta.estado as string] ?? "Esta oferta no está disponible.",
    );
  }

  if (oferta.vence_en && new Date(oferta.vence_en) <= new Date()) {
    return err("ESTADO_INVALIDO", "Esta oferta ya venció y no acepta postulaciones nuevas.");
  }

  const { data: cv } = await supabase
    .from("archivos_usuario")
    .select("id")
    .eq("usuario_id", user.id)
    .eq("tipo", "cv")
    .eq("activo", true)
    .maybeSingle();

  if (!cv) return err("SIN_CV");

  // estado omitido: el DEFAULT de la columna lo fija en 'recibida' (migration_018)
  const { error } = await supabase.from("postulaciones").insert({
    oferta_id: ofertaId,
    postulante_id: postulante.id,
  });

  if (error) {
    if (error.code === "23505") return err("CONFLICTO", "Ya te postulaste a esta oferta.");
    // P0001: la oferta venció entre la carga de la página y el envío (migration_036).
    if (error.code === "P0001") return fromSupabaseError(error);
    const ref = logError("postularme", error, { ofertaId });
    return errConRef("ERROR_INTERNO", "Error al procesar la postulación. Intentá de nuevo.", ref);
  }

  revalidatePath(`/ofertas/${ofertaId}`);
  revalidatePath("/mis-postulaciones");
  return okMsg("¡Te postulaste! Podés ver el estado en Mis postulaciones.");
}

export async function retirarPostulacion(
  postulacionId: string,
): Promise<Resultado<void>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return err("NO_AUTENTICADO");

  const { data: postulante } = await supabase
    .from("postulantes")
    .select("id")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!postulante) return err("SIN_PERMISO");

  const { data: postulacion } = await supabase
    .from("postulaciones")
    .select("id, estado, postulante_id, oferta_id")
    .eq("id", postulacionId)
    .maybeSingle();

  if (!postulacion) return err("NO_ENCONTRADO", "Postulación no encontrada.");
  if (postulacion.postulante_id !== postulante.id) return err("SIN_PERMISO");
  if (postulacion.estado !== "recibida") {
    return err(
      "ESTADO_INVALIDO",
      "Ya no podés retirar esta postulación porque está siendo revisada.",
    );
  }

  const { data: deleted, error } = await supabase
    .from("postulaciones")
    .delete()
    .eq("id", postulacionId)
    .select("id");

  if (error) {
    const ref = logError("retirarPostulacion", error, { postulacionId });
    return errConRef("ERROR_INTERNO", "Error al retirar la postulación. Intentá de nuevo.", ref);
  }
  if (!deleted || deleted.length === 0) {
    const ref = logError("retirarPostulacion:noRow", null, { postulacionId });
    return errConRef("ERROR_INTERNO", "No se pudo completar la acción.", ref);
  }

  revalidatePath(`/ofertas/${postulacion.oferta_id}`);
  revalidatePath("/mis-postulaciones");
  return okMsg("Postulación retirada.");
}
