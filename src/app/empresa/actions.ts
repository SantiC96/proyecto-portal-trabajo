"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
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
}): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado." };

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol, nombre, apellido, telefono")
    .eq("id", user.id)
    .single();

  if (!usuario || usuario.rol !== "empresa") {
    return { error: "No tenés permiso para realizar esta acción." };
  }

  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, estado_aprobacion, razon_social, cuit, rubro, descripcion")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!empresa) return { error: "Empresa no encontrada." };

  if (empresa.estado_aprobacion !== "rechazada") {
    return {
      error: "Solo podés reenviar la solicitud si fue rechazada.",
    };
  }

  // ── Validaciones ─────────────────────────────────────────────────────────
  const errRazon = validarNombre(data.razonSocial);
  if (errRazon) return { error: `Razón social: ${errRazon}` };

  const errCuit = validarCuitConMensaje(data.cuit);
  if (errCuit) return { error: errCuit };

  if (!data.rubro.trim()) return { error: "El rubro es obligatorio." };

  const errNombre = validarNombre(data.nombre);
  if (errNombre) return { error: `Nombre: ${errNombre}` };

  const errApellido = validarNombre(data.apellido);
  if (errApellido) return { error: `Apellido: ${errApellido}` };

  const errTelefono = validarTelefono(data.telefono);
  if (errTelefono) return { error: errTelefono };

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
    return {
      error:
        "Modificá los datos que te indicaron antes de reenviar.",
    };
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
      return { error: "Ya hay una empresa registrada con ese CUIT." };
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
      return { error: "Ya hay una empresa registrada con ese CUIT." };
    }
    console.error("[reenviarSolicitudEmpresa] empresa", errEmpresa);
    return { error: "Error al enviar la solicitud. Intentá de nuevo." };
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
    console.error("[reenviarSolicitudEmpresa] usuario", errUsuario);
  }

  revalidatePath("/empresa");
  revalidatePath("/empresa/solicitud");
  return {};
}
