"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { err, errConRef, ok, type Resultado } from "@/lib/resultado";

export async function guardarCandidato(
  postulanteId: string,
  ofertaOrigenId: string | null,
  nota: string | null
): Promise<Resultado<void>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("NO_AUTENTICADO");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (!usuario || usuario.rol !== "empresa") return err("SIN_PERMISO");

  const { error } = await supabase.from("candidatos_guardados").insert({
    postulante_id: postulanteId,
    oferta_origen_id: ofertaOrigenId,
    nota: nota || null,
  });

  if (error) {
    if (error.code === "23505") {
      return err("CONFLICTO", "Este candidato ya está guardado.");
    }
    const ref = logError("guardarCandidato", error, { postulanteId });
    return errConRef("ERROR_INTERNO", "No se pudo guardar el candidato.", ref);
  }

  revalidatePath("/empresa/candidatos-guardados");
  return ok();
}

export async function quitarGuardado(guardadoId: string): Promise<Resultado<void>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("NO_AUTENTICADO");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (!usuario || usuario.rol !== "empresa") return err("SIN_PERMISO");

  const { error } = await supabase
    .from("candidatos_guardados")
    .delete()
    .eq("id", guardadoId);

  if (error) {
    const ref = logError("quitarGuardado", error, { guardadoId });
    return errConRef("ERROR_INTERNO", "No se pudo quitar el candidato.", ref);
  }

  revalidatePath("/empresa/candidatos-guardados");
  return ok();
}

export async function actualizarNotaGuardado(
  guardadoId: string,
  nota: string | null
): Promise<Resultado<void>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("NO_AUTENTICADO");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (!usuario || usuario.rol !== "empresa") return err("SIN_PERMISO");

  const { error } = await supabase
    .from("candidatos_guardados")
    .update({ nota: nota?.trim() || null })
    .eq("id", guardadoId);

  if (error) {
    const ref = logError("actualizarNotaGuardado", error, { guardadoId });
    return errConRef("ERROR_INTERNO", "No se pudo actualizar la nota.", ref);
  }

  revalidatePath("/empresa/candidatos-guardados");
  return ok();
}
