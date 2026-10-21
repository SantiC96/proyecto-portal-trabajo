"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirRol } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { err, errCampo, errConRef, fromSupabaseError, okMsg, type Resultado } from "@/lib/resultado";
import { esUuid, LARGO_MAXIMO, MENSAJE_OBLIGATORIO, validarTextoOpcional } from "@/lib/validaciones";
import { programarEnvioEmails } from "@/lib/emails/cola";

// Aprobar y rechazar son updates condicionales (estado = 'pendiente_aprobacion'):
// si otra pestaña ya la resolvió o la empresa la cerró entre la lectura y el
// update, no se pisa ese estado.
const MENSAJE_YA_NO_PENDIENTE =
  "La oferta ya no está pendiente de revisión. Actualizá la página para ver su estado.";

function revalidarOfertas(ofertaId: string) {
  revalidatePath("/admin/ofertas");
  revalidatePath(`/admin/ofertas/${ofertaId}`);
  revalidatePath("/admin");
  revalidatePath("/ofertas");
  // Revalida postulaciones para que FichaAcciones vea el nuevo estado de la oferta
  revalidatePath("/admin/postulaciones");
}

export async function aprobarOferta(ofertaId: string): Promise<Resultado<void>> {
  const auth = await requerirRol("municipalidad");
  if (!auth.ok) return auth;

  if (!esUuid(ofertaId)) return err("DATOS_INVALIDOS");

  const supabase = await createSupabaseServerClient();

  const { data: oferta } = await supabase
    .from("ofertas")
    .select("id, estado, publicado_en")
    .eq("id", ofertaId)
    .single();

  if (!oferta) return err("NO_ENCONTRADO", "Oferta no encontrada.");
  if (oferta.estado !== "pendiente_aprobacion") {
    return err("ESTADO_INVALIDO", "Solo se puede aprobar una oferta pendiente de revisión.");
  }

  const ahora = new Date().toISOString();

  const { data, error } = await supabase
    .from("ofertas")
    .update({
      estado: "activa",
      // publicado_en solo se fija la primera vez; en re-aprobaciones se conserva.
      publicado_en: oferta.publicado_en ?? ahora,
      revisado_por: auth.usuario.id,
      revisado_en: ahora,
      updated_at: ahora,
    })
    .eq("id", ofertaId)
    .eq("estado", "pendiente_aprobacion")
    .select("id");

  if (error) {
    const ref = logError("aprobarOferta", error, { ofertaId });
    return errConRef("ERROR_INTERNO", "No se pudo aprobar la oferta. Intentá de nuevo.", ref);
  }
  if (!data || data.length === 0) return err("ESTADO_INVALIDO", MENSAJE_YA_NO_PENDIENTE);

  programarEnvioEmails();
  revalidarOfertas(ofertaId);
  return okMsg("Oferta aprobada.");
}

export async function rechazarOferta(
  ofertaId: string,
  motivo: string
): Promise<Resultado<void>> {
  const auth = await requerirRol("municipalidad");
  if (!auth.ok) return auth;

  if (!esUuid(ofertaId)) return err("DATOS_INVALIDOS");
  const motivoTrimmed = typeof motivo === "string" ? motivo.trim() : "";
  if (!motivoTrimmed) return errCampo("motivo", MENSAJE_OBLIGATORIO);
  const errMotivo = validarTextoOpcional(motivoTrimmed, LARGO_MAXIMO.motivo);
  if (errMotivo) return errCampo("motivo", errMotivo);

  const supabase = await createSupabaseServerClient();

  const { data: oferta } = await supabase
    .from("ofertas")
    .select("id, estado")
    .eq("id", ofertaId)
    .single();

  if (!oferta) return err("NO_ENCONTRADO", "Oferta no encontrada.");
  if (oferta.estado !== "pendiente_aprobacion") {
    return err("ESTADO_INVALIDO", "Solo se puede rechazar una oferta pendiente de revisión.");
  }

  const ahora = new Date().toISOString();

  const { data, error } = await supabase
    .from("ofertas")
    .update({
      estado: "rechazada",
      motivo_rechazo: motivoTrimmed,
      revisado_por: auth.usuario.id,
      revisado_en: ahora,
      updated_at: ahora,
    })
    .eq("id", ofertaId)
    .eq("estado", "pendiente_aprobacion")
    .select("id");

  if (error) {
    const ref = logError("rechazarOferta", error, { ofertaId });
    return errConRef("ERROR_INTERNO", "No se pudo rechazar la oferta. Intentá de nuevo.", ref);
  }
  if (!data || data.length === 0) return err("ESTADO_INVALIDO", MENSAJE_YA_NO_PENDIENTE);

  programarEnvioEmails();
  revalidarOfertas(ofertaId);
  return okMsg("Oferta rechazada.");
}

/**
 * Invita a un postulante a postularse a la oferta (migration_056,
 * invitar_a_oferta). La base controla el rol, que la oferta siga activa y
 * vigente, que la persona no se haya postulado y que no tenga ya una
 * invitación pendiente; el aviso y el email al postulante salen de un
 * trigger.
 */
export async function invitarAOferta(
  ofertaId: string,
  postulanteId: string,
): Promise<Resultado<void>> {
  const auth = await requerirRol("municipalidad");
  if (!auth.ok) return auth;

  if (!esUuid(ofertaId) || !esUuid(postulanteId)) return err("DATOS_INVALIDOS");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("invitar_a_oferta", {
    p_oferta_id: ofertaId,
    p_postulante_id: postulanteId,
  });

  if (error) {
    if (error.code === "P0001" || error.code === "42501") return fromSupabaseError(error);
    const ref = logError("invitarAOferta", error, { ofertaId, postulanteId });
    return errConRef("ERROR_INTERNO", "No se pudo enviar la invitación. Intentá de nuevo.", ref);
  }

  programarEnvioEmails();
  revalidatePath(`/admin/ofertas/${ofertaId}`);
  revalidatePath(`/admin/ofertas/${ofertaId}/candidatos`);
  revalidatePath(`/admin/postulantes/${postulanteId}`);
  return okMsg("Invitación enviada. Le avisamos a la persona por el portal y por email.");
}
