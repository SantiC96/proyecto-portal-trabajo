"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { err, errConRef, ok, type Resultado } from "@/lib/resultado";
import { formatearCUIT } from "@/lib/cuit";
import {
  validarCuitConMensaje,
  validarNombre,
  validarTelefono,
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
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return err("NO_AUTENTICADO");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol, nombre, apellido, telefono")
    .eq("id", user.id)
    .single();

  if (!usuario || usuario.rol !== "empresa") return err("SIN_PERMISO");

  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, estado_aprobacion, razon_social, cuit, rubro, descripcion")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!empresa) return err("NO_ENCONTRADO", "Empresa no encontrada.");

  if (empresa.estado_aprobacion !== "rechazada") {
    return err("ESTADO_INVALIDO", "Solo podés reenviar la solicitud si fue rechazada.");
  }

  // ── Validaciones ─────────────────────────────────────────────────────────
  const errRazon = validarNombre(data.razonSocial);
  if (errRazon) return err("DATOS_INVALIDOS", `Razón social: ${errRazon}`);

  const errCuit = validarCuitConMensaje(data.cuit);
  if (errCuit) return err("DATOS_INVALIDOS", errCuit);

  if (!data.rubro.trim()) return err("DATOS_INVALIDOS", "El rubro es obligatorio.");

  const errNombre = validarNombre(data.nombre);
  if (errNombre) return err("DATOS_INVALIDOS", `Nombre: ${errNombre}`);

  const errApellido = validarNombre(data.apellido);
  if (errApellido) return err("DATOS_INVALIDOS", `Apellido: ${errApellido}`);

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

  // ── Actualizar datos de contacto en usuarios ─────────────────────────────
  const { error: errUsuario } = await supabase
    .from("usuarios")
    .update({
      nombre: data.nombre.trim(),
      apellido: data.apellido.trim(),
      telefono: data.telefono.trim() || null,
    })
    .eq("id", user.id);

  if (errUsuario) {
    logError("reenviarSolicitudEmpresa:usuario", errUsuario, { userId: user.id });
  }

  revalidatePath("/empresa");
  revalidatePath("/empresa/solicitud");
  return ok();
}
