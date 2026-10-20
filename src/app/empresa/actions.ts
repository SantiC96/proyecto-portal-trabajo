"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { obtenerEmpresaActual, requerirRol } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { err, errCampo, errConRef, fromSupabaseError, okMsg, type Resultado } from "@/lib/resultado";
import { formatearCUIT } from "@/lib/cuit";
import {
  LARGO_MAXIMO,
  MENSAJE_OBLIGATORIO,
  validarCuitConMensaje,
  validarNombre,
  validarTelefono,
  validarTextoOpcional,
} from "@/lib/validaciones";
import { programarEnvioEmails } from "@/lib/emails/cola";

export async function reenviarSolicitudEmpresa(data: {
  razonSocial: string;
  cuit: string;
  rubro: string;
  descripcion: string;
  nombre: string;
  apellido: string;
  telefono: string;
}): Promise<Resultado<void>> {
  const auth = await requerirRol("empresa");
  if (!auth.ok) return auth;

  const empresa = await obtenerEmpresaActual();
  if (!empresa) return err("NO_ENCONTRADO", "Empresa no encontrada.");

  if (empresa.estado_aprobacion !== "rechazada") {
    return err("ESTADO_INVALIDO", "Solo podés reenviar la solicitud si fue rechazada.");
  }

  // ── Validaciones ─────────────────────────────────────────────────────────
  if (
    typeof data !== "object" ||
    data === null ||
    [
      data.razonSocial,
      data.cuit,
      data.rubro,
      data.descripcion,
      data.nombre,
      data.apellido,
      data.telefono,
    ].some((v) => typeof v !== "string")
  ) {
    return err("DATOS_INVALIDOS");
  }

  const errRazon = validarNombre(data.razonSocial);
  if (errRazon) return errCampo("razonSocial", errRazon);

  const errCuit = validarCuitConMensaje(data.cuit);
  if (errCuit) return errCampo("cuit", errCuit);

  if (!data.rubro.trim()) return errCampo("rubro", MENSAJE_OBLIGATORIO);
  const errRubro = validarTextoOpcional(data.rubro, LARGO_MAXIMO.rubro);
  if (errRubro) return errCampo("rubro", errRubro);
  const errDescripcion = validarTextoOpcional(data.descripcion, LARGO_MAXIMO.descripcion);
  if (errDescripcion) return errCampo("descripcion", errDescripcion);

  const errNombre = validarNombre(data.nombre);
  if (errNombre) return errCampo("nombre", errNombre);

  const errApellido = validarNombre(data.apellido);
  if (errApellido) return errCampo("apellido", errApellido);

  // Mismo criterio que el formulario de registro de empresa, que lo pide como obligatorio.
  if (!data.telefono.trim()) return errCampo("telefono", MENSAJE_OBLIGATORIO);
  const errTelefono = validarTelefono(data.telefono);
  if (errTelefono) return errCampo("telefono", errTelefono);

  // ── Reenviar ─────────────────────────────────────────────────────────────
  // usuarios y empresas se actualizan en una transacción (migration_040). La
  // función bloquea la empresa y vuelve a controlar el estado: un segundo
  // envío ve la solicitud ya pendiente. El reset a 'pendiente' y el historial
  // los hace el trigger de la 031, que solo resetea si cambió algún dato de
  // la empresa; si no cambió, la función lo rechaza.
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("reenviar_solicitud_empresa", {
    p_razon_social: data.razonSocial.trim(),
    p_cuit: formatearCUIT(data.cuit),
    p_rubro: data.rubro,
    p_descripcion: data.descripcion.trim(),
    p_nombre: data.nombre.trim(),
    p_apellido: data.apellido.trim(),
    p_telefono: data.telefono.trim(),
  });

  if (error) {
    if (error.code === "23505") {
      return err("CONFLICTO", "Ya hay una empresa registrada con ese CUIT.");
    }
    if (error.code === "P0001" || error.code === "42501") return fromSupabaseError(error);
    const ref = logError("reenviarSolicitudEmpresa", error, { empresaId: empresa.id });
    return errConRef("ERROR_INTERNO", "Error al enviar la solicitud. Intentá de nuevo.", ref);
  }

  programarEnvioEmails();
  // La razón social es el nombre que se muestra de la sesión (menú del usuario).
  revalidatePath("/", "layout");
  return okMsg("Solicitud reenviada. La Oficina de Empleo la revisará pronto.");
}
