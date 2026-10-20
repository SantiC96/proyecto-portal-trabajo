"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirPostulante } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { err, errConRef, fromSupabaseError, okMsg, type Resultado } from "@/lib/resultado";
import { esUuid } from "@/lib/validaciones";
import type { Enum } from "@/types/db";
import { programarEnvioEmails } from "@/lib/emails/cola";

export async function postularme(
  ofertaId: string,
): Promise<Resultado<void>> {
  const auth = await requerirPostulante({
    mensajeSinPermiso: "Solo los postulantes pueden postularse.",
  });
  if (!auth.ok) return auth;
  const { usuario, postulante } = auth;

  if (!esUuid(ofertaId)) return err("NO_ENCONTRADO", "Esta oferta no está disponible.");

  const supabase = await createSupabaseServerClient();

  const { data: oferta } = await supabase
    .from("ofertas")
    .select("id, estado, vence_en")
    .eq("id", ofertaId)
    .maybeSingle();

  if (!oferta) {
    return err("NO_ENCONTRADO", "Esta oferta no está disponible.");
  }
  if (oferta.estado !== "activa") {
    const mensajes: Partial<Record<Enum<"estado_oferta">, string>> = {
      pendiente_aprobacion: "Esta oferta está en revisión y no acepta postulaciones por el momento.",
      cerrada: "Esta oferta está cerrada y ya no acepta postulaciones.",
    };
    return err(
      "ESTADO_INVALIDO",
      mensajes[oferta.estado] ?? "Esta oferta no está disponible.",
    );
  }

  if (oferta.vence_en && new Date(oferta.vence_en) <= new Date()) {
    return err("ESTADO_INVALIDO", "Esta oferta ya venció y no acepta postulaciones nuevas.");
  }

  const { data: cv } = await supabase
    .from("archivos_usuario")
    .select("id")
    .eq("usuario_id", usuario.id)
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

  programarEnvioEmails();
  revalidatePath(`/ofertas/${ofertaId}`);
  revalidatePath("/mis-postulaciones");
  return okMsg("¡Te postulaste! Podés ver el estado en Mis postulaciones.");
}

/**
 * Retira una postulación propia (migration_053, retirar_postulacion): si
 * todavía estaba "Recibida" se borra; si ya la estaba revisando la oficina o
 * estaba derivada, queda "Retirada" en el historial, se cierra la derivación
 * abierta y se cancela la pre-entrevista coordinada. La base controla el
 * dueño y el estado (un seleccionado o un proceso cerrado no se retiran).
 */
export async function retirarPostulacion(
  postulacionId: string,
): Promise<Resultado<void>> {
  const auth = await requerirPostulante();
  if (!auth.ok) return auth;
  const { postulante } = auth;

  if (!esUuid(postulacionId)) return err("NO_ENCONTRADO", "Postulación no encontrada.");

  const supabase = await createSupabaseServerClient();

  const { data: postulacion } = await supabase
    .from("postulaciones")
    .select("oferta_id")
    .eq("id", postulacionId)
    .eq("postulante_id", postulante.id)
    .maybeSingle();

  if (!postulacion) return err("NO_ENCONTRADO", "Postulación no encontrada.");

  const { error } = await supabase.rpc("retirar_postulacion", {
    p_postulacion_id: postulacionId,
  });

  if (error) {
    if (error.code === "P0001" || error.code === "42501") return fromSupabaseError(error);
    const ref = logError("retirarPostulacion", error, { postulacionId });
    return errConRef("ERROR_INTERNO", "Error al retirar la postulación. Intentá de nuevo.", ref);
  }

  programarEnvioEmails();
  revalidatePath(`/ofertas/${postulacion.oferta_id}`);
  revalidatePath("/mis-postulaciones");
  return okMsg("Retiraste tu postulación.");
}
