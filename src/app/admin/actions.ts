"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { err, errConRef, ok, type Resultado, type ResultadoError } from "@/lib/resultado";

async function verificarMunicipalidad(): Promise<{ ok: true; userId: string } | ResultadoError> {
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

  if (!usuario || usuario.rol !== "municipalidad") return err("SIN_PERMISO");

  return { ok: true, userId: user.id };
}

export async function aprobarEmpresa(
  empresaId: string
): Promise<Resultado<void>> {
  const auth = await verificarMunicipalidad();
  if (!auth.ok) return auth;

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
    const ref = logError("aprobarEmpresa", error, { empresaId });
    return errConRef("ERROR_INTERNO", "Error al aprobar la empresa. Intentá de nuevo.", ref);
  }
  if (!data || data.length === 0) {
    const ref = logError("aprobarEmpresa:noRow", null, { empresaId });
    return errConRef("ERROR_INTERNO", "No se pudo completar la acción.", ref);
  }

  revalidatePath("/admin/empresas");
  revalidatePath("/admin");
  return ok();
}

export async function rechazarEmpresa(
  empresaId: string,
  motivo: string
): Promise<Resultado<void>> {
  const auth = await verificarMunicipalidad();
  if (!auth.ok) return auth;

  if (!motivo.trim()) {
    return err("DATOS_INVALIDOS", "El motivo de rechazo es obligatorio.");
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
    const ref = logError("rechazarEmpresa", error, { empresaId });
    return errConRef("ERROR_INTERNO", "Error al rechazar la empresa. Intentá de nuevo.", ref);
  }
  if (!data || data.length === 0) {
    const ref = logError("rechazarEmpresa:noRow", null, { empresaId });
    return errConRef("ERROR_INTERNO", "No se pudo completar la acción.", ref);
  }

  revalidatePath("/admin/empresas");
  revalidatePath("/admin");
  return ok();
}
