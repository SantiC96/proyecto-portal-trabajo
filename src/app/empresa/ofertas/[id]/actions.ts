"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type ActionResult = { error?: string; ofertaCerrada?: boolean };

async function getEmpresaId(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: empresa } = await supabase
    .from("empresas")
    .select("id")
    .eq("usuario_id", user.id)
    .maybeSingle();

  return empresa?.id ?? null;
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
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const empresaId = await getEmpresaId(supabase);
  if (!empresaId) return { error: "No autenticado." };

  const fechaDate = new Date(fechaEntrevistaISO);
  if (isNaN(fechaDate.getTime())) return { error: "Fecha inválida." };
  if (fechaDate <= new Date()) return { error: "La fecha debe ser posterior al momento actual." };

  if (!lugarEntrevista.trim()) return { error: "El lugar o indicaciones es obligatorio." };

  const { error } = await supabase
    .from("derivaciones")
    .update({
      estado_empresa: "en_proceso",
      fecha_entrevista: fechaEntrevistaISO,
      lugar_entrevista: lugarEntrevista.trim(),
    })
    .eq("id", derivacionId);

  if (error) {
    console.error("[coordinarEntrevista]", error);
    return { error: error.message || "No se pudo coordinar la entrevista." };
  }

  revalidarOferta(ofertaId);
  return {};
}

export async function reprogramarEntrevista(
  derivacionId: string,
  ofertaId: string,
  fechaEntrevistaISO: string,
  lugarEntrevista: string
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const empresaId = await getEmpresaId(supabase);
  if (!empresaId) return { error: "No autenticado." };

  const fechaDate = new Date(fechaEntrevistaISO);
  if (isNaN(fechaDate.getTime())) return { error: "Fecha inválida." };
  if (fechaDate <= new Date()) return { error: "La fecha debe ser posterior al momento actual." };

  if (!lugarEntrevista.trim()) return { error: "El lugar o indicaciones es obligatorio." };

  const { error } = await supabase
    .from("derivaciones")
    .update({
      estado_empresa: "en_proceso",
      fecha_entrevista: fechaEntrevistaISO,
      lugar_entrevista: lugarEntrevista.trim(),
    })
    .eq("id", derivacionId);

  if (error) {
    console.error("[reprogramarEntrevista]", error);
    return { error: error.message || "No se pudo reprogramar la entrevista." };
  }

  revalidarOferta(ofertaId);
  return {};
}

export async function seleccionarCandidato(
  derivacionId: string,
  ofertaId: string
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const empresaId = await getEmpresaId(supabase);
  if (!empresaId) return { error: "No autenticado." };

  const { error } = await supabase
    .from("derivaciones")
    .update({ estado_empresa: "contratado" })
    .eq("id", derivacionId);

  if (error) {
    console.error("[seleccionarCandidato]", error);
    return { error: error.message || "No se pudo seleccionar al candidato." };
  }

  // Detect if the offer auto-closed due to vacancies being filled
  const { data: ofertaData } = await supabase
    .from("ofertas")
    .select("estado")
    .eq("id", ofertaId)
    .maybeSingle();

  revalidarOferta(ofertaId);
  return { ofertaCerrada: ofertaData?.estado === "cerrada" };
}

export async function rechazarCandidato(
  derivacionId: string,
  ofertaId: string,
  motivo: string
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const empresaId = await getEmpresaId(supabase);
  if (!empresaId) return { error: "No autenticado." };

  if (!motivo.trim()) return { error: "Debés indicar el motivo." };

  const { error } = await supabase
    .from("derivaciones")
    .update({ estado_empresa: "rechazado", nota_empresa: motivo.trim() })
    .eq("id", derivacionId);

  if (error) {
    console.error("[rechazarCandidato]", error);
    return { error: error.message || "No se pudo registrar la decisión." };
  }

  revalidarOferta(ofertaId);
  return {};
}
