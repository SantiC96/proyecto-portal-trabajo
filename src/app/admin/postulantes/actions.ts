"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirRol } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { err, errCampo, errConRef, fromSupabaseError, okMsg, type Resultado } from "@/lib/resultado";
import { MENSAJE_OBLIGATORIO, esUuid, validarTextoOpcional } from "@/lib/validaciones";
import { MOTIVO_RECHAZO_COMPROBANTE_MAXIMO } from "@/lib/procedencia";
import { programarEnvioEmails } from "@/lib/emails/cola";

/**
 * Aprueba o rechaza el comprobante de domicilio de un postulante
 * (revisar_comprobante_domicilio, migration_055). La base vuelve a validar el
 * rol, que el comprobante siga vigente y pendiente, y el motivo; recalcula el
 * nivel de prioridad y avisa al postulante (aviso y email).
 */
export async function revisarComprobante(
  archivoId: string,
  aprobar: boolean,
  motivo?: string,
): Promise<Resultado<void>> {
  const auth = await requerirRol("municipalidad");
  if (!auth.ok) return auth;

  if (!esUuid(archivoId) || typeof aprobar !== "boolean") return err("DATOS_INVALIDOS");
  if (!aprobar) {
    if (typeof motivo !== "string" || !motivo.trim()) return errCampo("motivo", MENSAJE_OBLIGATORIO);
    const errMotivo = validarTextoOpcional(motivo, MOTIVO_RECHAZO_COMPROBANTE_MAXIMO);
    if (errMotivo) return errCampo("motivo", errMotivo);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("revisar_comprobante_domicilio", {
    p_archivo_id: archivoId,
    p_aprobar: aprobar,
    p_motivo: aprobar ? undefined : motivo?.trim(),
  });

  if (error) {
    if (error.code === "P0001" || error.code === "42501") return fromSupabaseError(error);
    const ref = logError("revisarComprobante", error, { archivoId });
    return errConRef("ERROR_INTERNO", "Error al guardar la revisión. Intentá de nuevo.", ref);
  }

  programarEnvioEmails();
  revalidatePath("/admin", "layout");
  return okMsg(aprobar ? "Domicilio verificado." : "Comprobante rechazado.");
}
