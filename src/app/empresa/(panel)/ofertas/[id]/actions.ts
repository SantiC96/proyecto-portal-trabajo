"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirEmpresa } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { err, errConRef, okMsg, type Resultado } from "@/lib/resultado";
import { esUuid, LARGO_MAXIMO, validarTextoOpcional } from "@/lib/validaciones";

function validarEntrevista(fechaEntrevistaISO: string, lugarEntrevista: string): string | null {
  if (typeof fechaEntrevistaISO !== "string") return "Fecha inválida.";
  const fechaDate = new Date(fechaEntrevistaISO);
  if (isNaN(fechaDate.getTime())) return "Fecha inválida.";
  if (fechaDate <= new Date()) return "La fecha debe ser posterior al momento actual.";

  if (typeof lugarEntrevista !== "string" || !lugarEntrevista.trim())
    return "El lugar o indicaciones es obligatorio.";
  const errLugar = validarTextoOpcional(lugarEntrevista, LARGO_MAXIMO.lugarEntrevista);
  if (errLugar) return `Lugar o indicaciones: ${errLugar}`;
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
  if (errEntrevista) return err("DATOS_INVALIDOS", errEntrevista);

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
    const ref = logError("coordinarEntrevista", error, { derivacionId });
    return errConRef("ERROR_INTERNO", "No se pudo coordinar la entrevista.", ref);
  }

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
  if (errEntrevista) return err("DATOS_INVALIDOS", errEntrevista);

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
    const ref = logError("reprogramarEntrevista", error, { derivacionId });
    return errConRef("ERROR_INTERNO", "No se pudo reprogramar la entrevista.", ref);
  }

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
    const ref = logError("seleccionarCandidato", error, { derivacionId });
    return errConRef("ERROR_INTERNO", "No se pudo seleccionar al candidato.", ref);
  }

  // Detect if the offer auto-closed due to vacancies being filled
  const { data: ofertaData } = await supabase
    .from("ofertas")
    .select("estado")
    .eq("id", ofertaId)
    .maybeSingle();

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
    return err("DATOS_INVALIDOS", "Debés indicar el motivo.");
  const errMotivo = validarTextoOpcional(motivo, LARGO_MAXIMO.motivo);
  if (errMotivo) return err("DATOS_INVALIDOS", `Motivo: ${errMotivo}`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("derivaciones")
    .update({ estado_empresa: "rechazado", nota_empresa: motivo.trim() })
    .eq("id", derivacionId);

  if (error) {
    const ref = logError("rechazarCandidato", error, { derivacionId });
    return errConRef("ERROR_INTERNO", "No se pudo registrar la decisión.", ref);
  }

  revalidarOferta(ofertaId);
  return okMsg("Decisión guardada.");
}
