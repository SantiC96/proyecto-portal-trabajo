"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { obtenerEmpresaActual, requerirRol } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { err, errConRef, okMsg, type Resultado } from "@/lib/resultado";
import { formatearCUIT } from "@/lib/cuit";
import {
  LARGO_MAXIMO,
  validarCuitConMensaje,
  validarNombre,
  validarTelefono,
  validarTextoOpcional,
} from "@/lib/validaciones";

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
  const user = auth.usuario;

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
  if (errRazon) return err("DATOS_INVALIDOS", `Razón social: ${errRazon}`);

  const errCuit = validarCuitConMensaje(data.cuit);
  if (errCuit) return err("DATOS_INVALIDOS", errCuit);

  if (!data.rubro.trim()) return err("DATOS_INVALIDOS", "El rubro es obligatorio.");
  const errRubro = validarTextoOpcional(data.rubro, LARGO_MAXIMO.rubro);
  if (errRubro) return err("DATOS_INVALIDOS", `Rubro: ${errRubro}`);
  const errDescripcion = validarTextoOpcional(data.descripcion, LARGO_MAXIMO.descripcion);
  if (errDescripcion) return err("DATOS_INVALIDOS", `Descripción: ${errDescripcion}`);

  const errNombre = validarNombre(data.nombre);
  if (errNombre) return err("DATOS_INVALIDOS", `Nombre: ${errNombre}`);

  const errApellido = validarNombre(data.apellido);
  if (errApellido) return err("DATOS_INVALIDOS", `Apellido: ${errApellido}`);

  // Mismo criterio que el formulario de registro de empresa, que lo pide como obligatorio.
  if (!data.telefono.trim()) return err("DATOS_INVALIDOS", "El teléfono es obligatorio.");
  const errTelefono = validarTelefono(data.telefono);
  if (errTelefono) return err("DATOS_INVALIDOS", errTelefono);

  // ── Verificar que al menos un dato de empresa cambió ────────────────────
  // Solo los cambios en razon_social / cuit / rubro / descripcion disparan
  // el reset de estado en el trigger (mismo comportamiento que la 027 para
  // ofertas). Si solo cambiaron datos de contacto, actualizamos usuarios
  // pero no hay reenvío de solicitud.
  const cuitNormalizado = formatearCUIT(data.cuit);
  const empresaDataCambio =
    data.razonSocial.trim() !== empresa.razon_social ||
    cuitNormalizado !== empresa.cuit ||
    data.rubro !== empresa.rubro ||
    (data.descripcion.trim() || null) !== (empresa.descripcion ?? null);

  if (!empresaDataCambio) {
    return err("DATOS_INVALIDOS", "Modificá los datos que te indicaron antes de reenviar.");
  }

  // ── Verificar unicidad del CUIT si cambió ────────────────────────────────
  const supabase = await createSupabaseServerClient();
  if (cuitNormalizado !== empresa.cuit) {
    const { data: otra } = await supabase
      .from("empresas")
      .select("id")
      .eq("cuit", cuitNormalizado)
      .neq("id", empresa.id)
      .maybeSingle();

    if (otra) {
      return err("CONFLICTO", "Ya hay una empresa registrada con ese CUIT.");
    }
  }

  // ── Actualizar datos de contacto en usuarios ─────────────────────────────
  // Va antes que empresas: el update de empresas dispara el reenvío, así que
  // si el contacto falla la solicitud no queda reenviada a medias.
  const { error: errUsuario } = await supabase
    .from("usuarios")
    .update({
      nombre: data.nombre.trim(),
      apellido: data.apellido.trim(),
      telefono: data.telefono.trim(),
    })
    .eq("id", user.id);

  if (errUsuario) {
    const ref = logError("reenviarSolicitudEmpresa:usuario", errUsuario, { userId: user.id });
    return errConRef("ERROR_INTERNO", "Error al enviar la solicitud. Intentá de nuevo.", ref);
  }

  // ── Actualizar empresa (trigger resetea estado_aprobacion → 'pendiente') ─
  const { error: errEmpresa } = await supabase
    .from("empresas")
    .update({
      razon_social: data.razonSocial.trim(),
      cuit: cuitNormalizado,
      rubro: data.rubro,
      descripcion: data.descripcion.trim() || null,
    })
    .eq("id", empresa.id);

  if (errEmpresa) {
    if (errEmpresa.code === "23505") {
      return err("CONFLICTO", "Ya hay una empresa registrada con ese CUIT.");
    }
    const ref = logError("reenviarSolicitudEmpresa:empresa", errEmpresa, { empresaId: empresa.id });
    return errConRef("ERROR_INTERNO", "Error al enviar la solicitud. Intentá de nuevo.", ref);
  }

  revalidatePath("/empresa");
  revalidatePath("/empresa/solicitud");
  return okMsg("Solicitud reenviada. La Oficina de Empleo la revisará pronto.");
}
