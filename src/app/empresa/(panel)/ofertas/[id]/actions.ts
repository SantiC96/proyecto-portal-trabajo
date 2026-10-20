"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirEmpresa } from "@/lib/auth";
import { logError } from "@/lib/logger";
import {
  err,
  errCampo,
  errConRef,
  fromSupabaseError,
  okMsg,
  type Resultado,
  type ResultadoError,
} from "@/lib/resultado";
import { esUuid, LARGO_MAXIMO, MENSAJE_OBLIGATORIO, validarTextoOpcional } from "@/lib/validaciones";
import { programarEnvioEmails } from "@/lib/emails/cola";

// Los campos "fecha" y "lugar" son los del diálogo de entrevista de la empresa.
function validarEntrevista(fechaEntrevistaISO: string, lugarEntrevista: string): ResultadoError | null {
  if (typeof fechaEntrevistaISO !== "string") return errCampo("fecha", "Fecha inválida.");
  const fechaDate = new Date(fechaEntrevistaISO);
  if (isNaN(fechaDate.getTime())) return errCampo("fecha", "Fecha inválida.");
  if (fechaDate <= new Date()) return errCampo("fecha", "La fecha debe ser posterior al momento actual.");

  if (typeof lugarEntrevista !== "string" || !lugarEntrevista.trim())
    return errCampo("lugar", MENSAJE_OBLIGATORIO);
  const errLugar = validarTextoOpcional(lugarEntrevista, LARGO_MAXIMO.lugarEntrevista);
  if (errLugar) return errCampo("lugar", errLugar);
  return null;
}

function revalidarOferta(ofertaId: string) {
  revalidatePath(`/empresa/ofertas/${ofertaId}`);
  revalidatePath("/empresa/ofertas");
  revalidatePath("/empresa");
}

export async function coordinarEntrevista(
  derivacionId: string,
  ofertaId: string,
  fechaEntrevistaISO: string,
  lugarEntrevista: string
): Promise<Resultado<void>> {
  const auth = await requerirEmpresa({ aprobada: true });
  if (!auth.ok) return auth;

  if (!esUuid(derivacionId) || !esUuid(ofertaId)) return err("DATOS_INVALIDOS");

  const errEntrevista = validarEntrevista(fechaEntrevistaISO, lugarEntrevista);
  if (errEntrevista) return errEntrevista;

  // El trigger derivaciones_empresa_update (028/029) valida la transición; sus
  // mensajes (P0001) llegan al usuario, por ejemplo si otra pestaña ya cerró
  // el proceso.
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("derivaciones")
    .update({
      estado_empresa: "en_proceso",
      fecha_entrevista: fechaEntrevistaISO,
      lugar_entrevista: lugarEntrevista.trim(),
    })
    .eq("id", derivacionId);

  if (error) {
    if (error.code === "P0001") return fromSupabaseError(error);
    const ref = logError("coordinarEntrevista", error, { derivacionId });
    return errConRef("ERROR_INTERNO", "No se pudo coordinar la entrevista.", ref);
  }

  programarEnvioEmails();
  revalidarOferta(ofertaId);
  return okMsg("Entrevista coordinada.");
}

export async function reprogramarEntrevista(
  derivacionId: string,
  ofertaId: string,
  fechaEntrevistaISO: string,
  lugarEntrevista: string
): Promise<Resultado<void>> {
  const auth = await requerirEmpresa({ aprobada: true });
  if (!auth.ok) return auth;

  if (!esUuid(derivacionId) || !esUuid(ofertaId)) return err("DATOS_INVALIDOS");

  const errEntrevista = validarEntrevista(fechaEntrevistaISO, lugarEntrevista);
  if (errEntrevista) return errEntrevista;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("derivaciones")
    .update({
      estado_empresa: "en_proceso",
      fecha_entrevista: fechaEntrevistaISO,
      lugar_entrevista: lugarEntrevista.trim(),
    })
    .eq("id", derivacionId);

  if (error) {
    if (error.code === "P0001") return fromSupabaseError(error);
    const ref = logError("reprogramarEntrevista", error, { derivacionId });
    return errConRef("ERROR_INTERNO", "No se pudo reprogramar la entrevista.", ref);
  }

  programarEnvioEmails();
  revalidarOferta(ofertaId);
  return okMsg("Entrevista reprogramada.");
}

export async function seleccionarCandidato(
  derivacionId: string,
  ofertaId: string
): Promise<Resultado<{ ofertaCerrada: boolean }>> {
  const auth = await requerirEmpresa({ aprobada: true });
  if (!auth.ok) return auth;

  if (!esUuid(derivacionId) || !esUuid(ofertaId)) return err("DATOS_INVALIDOS");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("derivaciones")
    .update({ estado_empresa: "contratado" })
    .eq("id", derivacionId);

  if (error) {
    if (error.code === "P0001") return fromSupabaseError(error);
    const ref = logError("seleccionarCandidato", error, { derivacionId });
    return errConRef("ERROR_INTERNO", "No se pudo seleccionar al candidato.", ref);
  }

  // Detect if the offer auto-closed due to vacancies being filled
  const { data: ofertaData } = await supabase
    .from("ofertas")
    .select("estado")
    .eq("id", ofertaId)
    .maybeSingle();

  programarEnvioEmails();
  revalidarOferta(ofertaId);
  return { ok: true, data: { ofertaCerrada: ofertaData?.estado === "cerrada" }, mensaje: "Candidato seleccionado." };
}

export async function rechazarCandidato(
  derivacionId: string,
  ofertaId: string,
  motivo: string
): Promise<Resultado<void>> {
  const auth = await requerirEmpresa({ aprobada: true });
  if (!auth.ok) return auth;

  if (!esUuid(derivacionId) || !esUuid(ofertaId)) return err("DATOS_INVALIDOS");

  if (typeof motivo !== "string" || !motivo.trim())
    return errCampo("motivo", MENSAJE_OBLIGATORIO);
  const errMotivo = validarTextoOpcional(motivo, LARGO_MAXIMO.motivo);
  if (errMotivo) return errCampo("motivo", errMotivo);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("derivaciones")
    .update({ estado_empresa: "rechazado", nota_empresa: motivo.trim() })
    .eq("id", derivacionId);

  if (error) {
    if (error.code === "P0001") return fromSupabaseError(error);
    const ref = logError("rechazarCandidato", error, { derivacionId });
    return errConRef("ERROR_INTERNO", "No se pudo registrar la decisión.", ref);
  }

  programarEnvioEmails();
  revalidarOferta(ofertaId);
  return okMsg("Decisión guardada.");
}
