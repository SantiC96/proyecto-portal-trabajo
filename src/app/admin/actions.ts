"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirRol } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { err, errConRef, okMsg, type Resultado } from "@/lib/resultado";
import { esUuid, LARGO_MAXIMO, validarTextoOpcional } from "@/lib/validaciones";

export async function aprobarEmpresa(
  empresaId: string
): Promise<Resultado<void>> {
  const auth = await requerirRol("municipalidad");
  if (!auth.ok) return auth;

  if (!esUuid(empresaId)) return err("DATOS_INVALIDOS");

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
  return okMsg("Empresa aprobada.");
}

export async function rechazarEmpresa(
  empresaId: string,
  motivo: string
): Promise<Resultado<void>> {
  const auth = await requerirRol("municipalidad");
  if (!auth.ok) return auth;

  if (!esUuid(empresaId)) return err("DATOS_INVALIDOS");
  if (typeof motivo !== "string" || !motivo.trim()) {
    return err("DATOS_INVALIDOS", "El motivo de rechazo es obligatorio.");
  }
  const errMotivo = validarTextoOpcional(motivo, LARGO_MAXIMO.motivo);
  if (errMotivo) return err("DATOS_INVALIDOS", `Motivo: ${errMotivo}`);

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
  return okMsg("Empresa rechazada.");
}
