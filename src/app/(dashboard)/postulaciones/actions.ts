"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirPostulante } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { err, errCampo, errConRef, fromSupabaseError, okMsg, type Resultado } from "@/lib/resultado";
import { esUuid, validarTextoOpcional } from "@/lib/validaciones";
import { MOTIVO_INVITACION_MAXIMO } from "@/lib/invitaciones";
import type { Enum } from "@/types/db";
import { programarEnvioEmails } from "@/lib/emails/cola";

/**
 * Crea la postulación con el CV elegido (migration_054). El CV va en el mismo
 * INSERT: el trigger postulaciones_cv_elegido vuelve a validar que sea del
 * postulante y siga disponible, así que no queda una postulación sin CV.
 */
export async function postularme(
  ofertaId: string,
  cvArchivoId: string,
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

  // RLS: solo sus CVs no eliminados.
  const { data: cvs, error: errorCvs } = await supabase
    .from("archivos_usuario")
    .select("id")
    .eq("usuario_id", usuario.id)
    .eq("tipo", "cv")
    .is("eliminado_en", null);

  if (errorCvs) {
    const ref = logError("postularme:cvs", errorCvs, { ofertaId });
    return errConRef("ERROR_INTERNO", "Error al procesar la postulación. Intentá de nuevo.", ref);
  }
  if (cvs.length === 0) return err("SIN_CV");
  if (!esUuid(cvArchivoId) || !cvs.some((cv) => cv.id === cvArchivoId)) {
    return err("DATOS_INVALIDOS", "El CV que elegiste ya no está en tu perfil. Elegí otro.");
  }

  // estado omitido: el DEFAULT de la columna lo fija en 'recibida' (migration_018)
  const { error } = await supabase.from("postulaciones").insert({
    oferta_id: ofertaId,
    postulante_id: postulante.id,
    cv_archivo_id: cvArchivoId,
  });

  if (error) {
    if (error.code === "23505") return err("CONFLICTO", "Ya te postulaste a esta oferta.");
    // P0001: la oferta venció entre la carga de la página y el envío (migration_036)
    // o el CV se eliminó mientras tanto (migration_054).
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
 * Retira una postulación propia (retirar_postulacion, migrations 053 y 063):
 * queda "Retirada" en el historial, se cierra la derivación abierta y se
 * cancela la pre-entrevista coordinada. La base controla el dueño y el estado
 * (un seleccionado o un proceso cerrado no se retiran).
 * La función devuelve 'retirada'; antes de migration_063 una "Recibida" se
 * borraba y devolvía 'eliminada'. El valor no se lee: los dos terminan con el
 * mismo mensaje y la misma revalidación.
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

/**
 * Responde una invitación de la oficina (migration_056, responder_invitacion).
 * "Me interesa" crea una postulación normal con el CV elegido, que la oficina
 * revisa como cualquier otra; "No me interesa" la rechaza con un motivo
 * opcional. La base controla el dueño, que siga pendiente, el CV y que la
 * oferta siga abierta: si se cerró, la invitación queda vencida.
 */
export async function responderInvitacion(
  invitacionId: string,
  acepta: boolean,
  datos: { cvArchivoId?: string; motivo?: string } = {},
): Promise<Resultado<void>> {
  const auth = await requerirPostulante({
    mensajeSinPermiso: "Solo los postulantes pueden responder invitaciones.",
  });
  if (!auth.ok) return auth;
  const { usuario } = auth;

  if (!esUuid(invitacionId)) return err("NO_ENCONTRADO", "No se encontró la invitación.");
  if (typeof acepta !== "boolean") return err("DATOS_INVALIDOS");

  const motivo = typeof datos.motivo === "string" ? datos.motivo.trim() : "";
  if (!acepta) {
    const errMotivo = validarTextoOpcional(motivo, MOTIVO_INVITACION_MAXIMO);
    if (errMotivo) return errCampo("motivo", errMotivo);
  }

  const supabase = await createSupabaseServerClient();

  if (acepta) {
    // RLS: solo sus CVs no eliminados. El trigger de la base vuelve a validarlo.
    const { data: cvs, error: errorCvs } = await supabase
      .from("archivos_usuario")
      .select("id")
      .eq("usuario_id", usuario.id)
      .eq("tipo", "cv")
      .is("eliminado_en", null);

    if (errorCvs) {
      const ref = logError("responderInvitacion:cvs", errorCvs, { invitacionId });
      return errConRef("ERROR_INTERNO", "No pudimos registrar tu respuesta. Intentá de nuevo.", ref);
    }
    if (cvs.length === 0) return err("SIN_CV");
    if (!esUuid(datos.cvArchivoId) || !cvs.some((cv) => cv.id === datos.cvArchivoId)) {
      return err("DATOS_INVALIDOS", "El CV que elegiste ya no está en tu perfil. Elegí otro.");
    }
  }

  const { data: resultado, error } = await supabase.rpc("responder_invitacion", {
    p_invitacion_id: invitacionId,
    p_acepta: acepta,
    p_cv_archivo_id: acepta ? datos.cvArchivoId : undefined,
    p_motivo: !acepta && motivo ? motivo : undefined,
  });

  if (error) {
    if (error.code === "P0001" || error.code === "42501") return fromSupabaseError(error);
    const ref = logError("responderInvitacion", error, { invitacionId, acepta });
    return errConRef("ERROR_INTERNO", "No pudimos registrar tu respuesta. Intentá de nuevo.", ref);
  }

  revalidatePath("/invitaciones");
  // Al aceptar se crea una postulación.
  if (acepta) revalidatePath("/mis-postulaciones");

  // La invitación quedó vencida (la oferta dejó de aceptar postulaciones).
  if (resultado === "vencida") return err("ESTADO_INVALIDO", "La oferta ya se cerró.");

  programarEnvioEmails();
  return okMsg(acepta ? "¡Listo! Tu postulación quedó registrada." : "Le avisamos a la Oficina de Empleo.");
}
