"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";

async function verificarMunicipalidad(): Promise<{ error: string } | { userId: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado." };

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!usuario || usuario.rol !== "municipalidad") {
    return { error: "No tenés permiso para realizar esta acción." };
  }

  return { userId: user.id };
}

export async function aprobarEmpresa(
  empresaId: string
): Promise<{ error?: string }> {
  const auth = await verificarMunicipalidad();
  if ("error" in auth) return auth;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("empresas")
    .update({
      estado_aprobacion: "aprobada",
      fecha_decision: new Date().toISOString(),
      motivo_rechazo: null,
    })
    .eq("id", empresaId)
    .select("id");

  if (error) {
    console.error("[aprobarEmpresa]", error);
    return { error: "Error al aprobar la empresa. Intentá de nuevo." };
  }
  if (!data || data.length === 0) {
    console.error("[aprobarEmpresa] update no afectó ninguna fila", { empresaId });
    return { error: "No se pudo completar la acción." };
  }

  revalidatePath("/admin/empresas");
  revalidatePath("/admin");
  return {};
}

export async function rechazarEmpresa(
  empresaId: string,
  motivo: string
): Promise<{ error?: string }> {
  const auth = await verificarMunicipalidad();
  if ("error" in auth) return auth;

  if (!motivo.trim()) {
    return { error: "El motivo de rechazo es obligatorio." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("empresas")
    .update({
      estado_aprobacion: "rechazada",
      fecha_decision: new Date().toISOString(),
      motivo_rechazo: motivo.trim(),
    })
    .eq("id", empresaId)
    .select("id");

  if (error) {
    console.error("[rechazarEmpresa]", error);
    return { error: "Error al rechazar la empresa. Intentá de nuevo." };
  }
  if (!data || data.length === 0) {
    console.error("[rechazarEmpresa] update no afectó ninguna fila", { empresaId });
    return { error: "No se pudo completar la acción." };
  }

  revalidatePath("/admin/empresas");
  revalidatePath("/admin");
  return {};
}
