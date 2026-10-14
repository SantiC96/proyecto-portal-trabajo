"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { err, errConRef, ok, type Resultado, type ResultadoError } from "@/lib/resultado";

async function verificarEmpresa(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<{ ok: true; empresaId: string } | ResultadoError> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("NO_AUTENTICADO");

  const { data: empresa } = await supabase
    .from("empresas")
    .select("id")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!empresa) return err("SIN_PERMISO");
  return { ok: true, empresaId: empresa.id };
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
  const supabase = await createSupabaseServerClient();
  const empresaResult = await verificarEmpresa(supabase);
  if (!empresaResult.ok) return empresaResult;

  const fechaDate = new Date(fechaEntrevistaISO);
  if (isNaN(fechaDate.getTime())) return err("DATOS_INVALIDOS", "Fecha inválida.");
  if (fechaDate <= new Date()) return err("DATOS_INVALIDOS", "La fecha debe ser posterior al momento actual.");

  if (!lugarEntrevista.trim()) return err("DATOS_INVALIDOS", "El lugar o indicaciones es obligatorio.");

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
  return ok();
}

export async function reprogramarEntrevista(
  derivacionId: string,
  ofertaId: string,
  fechaEntrevistaISO: string,
  lugarEntrevista: string
): Promise<Resultado<void>> {
  const supabase = await createSupabaseServerClient();
  const empresaResult = await verificarEmpresa(supabase);
  if (!empresaResult.ok) return empresaResult;

  const fechaDate = new Date(fechaEntrevistaISO);
  if (isNaN(fechaDate.getTime())) return err("DATOS_INVALIDOS", "Fecha inválida.");
  if (fechaDate <= new Date()) return err("DATOS_INVALIDOS", "La fecha debe ser posterior al momento actual.");

  if (!lugarEntrevista.trim()) return err("DATOS_INVALIDOS", "El lugar o indicaciones es obligatorio.");

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
  return ok();
}

export async function seleccionarCandidato(
  derivacionId: string,
  ofertaId: string
): Promise<Resultado<{ ofertaCerrada: boolean }>> {
  const supabase = await createSupabaseServerClient();
  const empresaResult = await verificarEmpresa(supabase);
  if (!empresaResult.ok) return empresaResult;

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
  return ok({ ofertaCerrada: ofertaData?.estado === "cerrada" });
}

export async function rechazarCandidato(
  derivacionId: string,
  ofertaId: string,
  motivo: string
): Promise<Resultado<void>> {
  const supabase = await createSupabaseServerClient();
  const empresaResult = await verificarEmpresa(supabase);
  if (!empresaResult.ok) return empresaResult;

  if (!motivo.trim()) return err("DATOS_INVALIDOS", "Debés indicar el motivo.");

  const { error } = await supabase
    .from("derivaciones")
    .update({ estado_empresa: "rechazado", nota_empresa: motivo.trim() })
    .eq("id", derivacionId);

  if (error) {
    const ref = logError("rechazarCandidato", error, { derivacionId });
    return errConRef("ERROR_INTERNO", "No se pudo registrar la decisión.", ref);
  }

  revalidarOferta(ofertaId);
  return ok();
}
