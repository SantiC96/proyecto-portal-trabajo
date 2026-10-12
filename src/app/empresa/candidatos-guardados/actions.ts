"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type ActionResult = { error?: string };

export async function guardarCandidato(
  postulanteId: string,
  ofertaOrigenId: string | null,
  nota: string | null
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { error } = await supabase.from("candidatos_guardados").insert({
    postulante_id: postulanteId,
    oferta_origen_id: ofertaOrigenId,
    nota: nota || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Este candidato ya está guardado." };
    }
    console.error("[guardarCandidato]", error);
    return { error: error.message || "No se pudo guardar el candidato." };
  }

  revalidatePath("/empresa/candidatos-guardados");
  return {};
}

export async function quitarGuardado(guardadoId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { error } = await supabase
    .from("candidatos_guardados")
    .delete()
    .eq("id", guardadoId);

  if (error) {
    console.error("[quitarGuardado]", error);
    return { error: "No se pudo quitar el candidato." };
  }

  revalidatePath("/empresa/candidatos-guardados");
  return {};
}

export async function actualizarNotaGuardado(
  guardadoId: string,
  nota: string | null
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { error } = await supabase
    .from("candidatos_guardados")
    .update({ nota: nota?.trim() || null })
    .eq("id", guardadoId);

  if (error) {
    console.error("[actualizarNotaGuardado]", error);
    return { error: "No se pudo actualizar la nota." };
  }

  revalidatePath("/empresa/candidatos-guardados");
  return {};
}
