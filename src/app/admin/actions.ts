"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirRol } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { err, errCampo, errConRef, fromSupabaseError, ok, okMsg, type Resultado } from "@/lib/resultado";
import { esUuid, LARGO_MAXIMO, MENSAJE_OBLIGATORIO, validarTextoOpcional } from "@/lib/validaciones";
import { programarEnvioEmails } from "@/lib/emails/cola";
import { contarPendientesOficina, type PendientesOficina } from "@/lib/admin/pendientes";

// Aprobar y rechazar son updates condicionales: repetir la misma decisión
// (doble envío, dos pestañas) no afecta filas, así que no sobrescribe
// fecha_decision ni el motivo que ya quedó en el historial (migration_031).

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
    .neq("estado_aprobacion", "aprobada")
    .select("id");

  if (error) {
    // P0001: la empresa todavía no confirmó su email (migration_042).
    if (error.code === "P0001") return fromSupabaseError(error);
    const ref = logError("aprobarEmpresa", error, { empresaId });
    return errConRef("ERROR_INTERNO", "Error al aprobar la empresa. Intentá de nuevo.", ref);
  }
  if (!data || data.length === 0) {
    return err("ESTADO_INVALIDO", "La empresa ya está aprobada. Actualizá la página para ver su estado.");
  }

  programarEnvioEmails();
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
    return errCampo("motivo", MENSAJE_OBLIGATORIO);
  }
  const errMotivo = validarTextoOpcional(motivo, LARGO_MAXIMO.motivo);
  if (errMotivo) return errCampo("motivo", errMotivo);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("empresas")
    .update({
      estado_aprobacion: "rechazada",
      fecha_decision: new Date().toISOString(),
      motivo_rechazo: motivo.trim(),
    })
    .eq("id", empresaId)
    .neq("estado_aprobacion", "rechazada")
    .select("id");

  if (error) {
    // P0001: la empresa todavía no confirmó su email (migration_042).
    if (error.code === "P0001") return fromSupabaseError(error);
    const ref = logError("rechazarEmpresa", error, { empresaId });
    return errConRef("ERROR_INTERNO", "Error al rechazar la empresa. Intentá de nuevo.", ref);
  }
  if (!data || data.length === 0) {
    return err("ESTADO_INVALIDO", "La empresa ya está rechazada. Actualizá la página para ver su estado.");
  }

  programarEnvioEmails();
  revalidatePath("/admin/empresas");
  revalidatePath("/admin");
  return okMsg("Empresa rechazada.");
}

/**
 * Contadores de la navegación lateral de la oficina. Los layouts no se vuelven
 * a ejecutar al navegar, así que la navegación los pide al montarse y en cada
 * cambio de ruta (igual que la campanita).
 */
export async function obtenerPendientesNavegacion(): Promise<Resultado<PendientesOficina>> {
  const auth = await requerirRol("municipalidad");
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  const pendientes = await contarPendientesOficina(supabase);
  return pendientes ? ok(pendientes) : err("ERROR_INTERNO");
}
