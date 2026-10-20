"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requerirRol } from "@/lib/auth";
import { traducirErrorAuth } from "@/lib/auth-errors";
import { logError } from "@/lib/logger";
import {
  err,
  errCampo,
  errConRef,
  fromSupabaseError,
  okMsg,
  type Resultado,
} from "@/lib/resultado";
import { esUuid, validarEmail, validarNombre, validarTelefono } from "@/lib/validaciones";

// Cuentas de la Oficina de Empleo (decisión 023). Todas las cuentas activas
// tienen los mismos permisos. Las reglas (mínimo una cuenta activa, nadie se
// desactiva a sí mismo) están en la base (migration_050); acá se repiten
// solo para dar el mensaje antes.

const RUTA = "/admin/cuentas";

/** Ban de Supabase Auth sin fecha de fin práctica (100 años). */
const BAN_CUENTA_DESACTIVADA = "876000h";

const MENSAJE_EMAIL_EXISTE = "Ya existe una cuenta con ese email.";

export async function invitarCuenta(data: {
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
}): Promise<Resultado<void>> {
  const auth = await requerirRol("municipalidad");
  if (!auth.ok) return auth;

  if (
    typeof data !== "object" ||
    data === null ||
    [data.nombre, data.apellido, data.telefono, data.email].some((v) => typeof v !== "string")
  ) {
    return err("DATOS_INVALIDOS");
  }

  const errNombre = validarNombre(data.nombre);
  if (errNombre) return errCampo("nombre", errNombre);
  const errApellido = validarNombre(data.apellido);
  if (errApellido) return errCampo("apellido", errApellido);
  const errTelefono = validarTelefono(data.telefono);
  if (errTelefono) return errCampo("telefono", errTelefono);
  const errEmail = validarEmail(data.email);
  if (errEmail) return errCampo("email", errEmail);

  const nombre = data.nombre.trim();
  const apellido = data.apellido.trim();
  const telefono = data.telefono.trim();
  const email = data.email.trim().toLowerCase();

  // Supabase reutiliza al invitar un usuario que no confirmó su email: sin
  // este control, un postulante o una empresa a medio registrar pasaría a ser
  // una cuenta de la oficina.
  const { data: existe, error: errorExiste } = await supabaseAdmin.rpc("email_registrado", {
    p_email: email,
  });
  if (errorExiste) {
    const ref = logError("invitarCuenta:emailRegistrado", errorExiste);
    return errConRef("ERROR_INTERNO", "No se pudo enviar la invitación. Intentá de nuevo.", ref);
  }
  if (existe) return errCampo("email", MENSAJE_EMAIL_EXISTE);

  const { data: invitacion, error: inviteError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { nombre, apellido, telefono },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/aceptar-invitacion`,
    });

  if (inviteError) {
    if (inviteError.code === "email_exists" || inviteError.code === "user_already_exists") {
      return errCampo("email", MENSAJE_EMAIL_EXISTE);
    }
    const r = traducirErrorAuth(inviteError);
    if (!r.ok && r.codigo !== "ERROR_INTERNO") return r;
    const ref = logError("invitarCuenta:invite", inviteError);
    return errConRef("ERROR_INTERNO", "No se pudo enviar la invitación. Intentá de nuevo.", ref);
  }

  // El trigger on_auth_user_created creó la fila con rol 'postulante' (nunca
  // toma el rol de los metadatos para la oficina); el rol se asigna acá, igual
  // que en el alta manual (docs/guias/guia-usuarios-oficina.md).
  const userId = invitacion.user.id;
  const { error: rolError } = await supabaseAdmin
    .from("usuarios")
    .update({ rol: "municipalidad", nombre, apellido, telefono })
    .eq("id", userId);

  if (rolError) {
    const ref = logError("invitarCuenta:rol", rolError, { userId });
    // Sin el rol, el link del email no sirve: se borra el usuario para poder
    // invitarlo de nuevo.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) logError("invitarCuenta:deleteUser", deleteError, { userId });
    return errConRef("ERROR_INTERNO", "No se pudo crear la cuenta. Intentá de nuevo.", ref);
  }

  revalidatePath(RUTA);
  return okMsg(`Invitación enviada a ${email}.`);
}

export async function desactivarCuenta(usuarioId: string): Promise<Resultado<void>> {
  const auth = await requerirRol("municipalidad");
  if (!auth.ok) return auth;
  if (!esUuid(usuarioId)) return err("DATOS_INVALIDOS");
  if (usuarioId === auth.usuario.id) {
    return err("REGLA_DE_NEGOCIO", "No podés desactivar tu propia cuenta.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("desactivar_cuenta_oficina", {
    p_usuario_id: usuarioId,
  });
  if (error) {
    // P0001: último admin activo, uno mismo o cuenta que no es de la oficina.
    if (error.code === "P0001" || error.code === "42501") return fromSupabaseError(error);
    const ref = logError("desactivarCuenta", error, { usuarioId });
    return errConRef("ERROR_INTERNO", "No se pudo desactivar la cuenta. Intentá de nuevo.", ref);
  }

  // El ban corta el ingreso y la renovación de la sesión en Supabase Auth. Si
  // falla, la cuenta igual queda sin acceso: la base (rol_actual) y el login
  // revisan usuarios.activo. Desactivar otra vez reintenta el ban.
  const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(usuarioId, {
    ban_duration: BAN_CUENTA_DESACTIVADA,
  });
  if (banError) logError("desactivarCuenta:ban", banError, { usuarioId });

  revalidatePath(RUTA);
  return okMsg("Cuenta desactivada.");
}

export async function reactivarCuenta(usuarioId: string): Promise<Resultado<void>> {
  const auth = await requerirRol("municipalidad");
  if (!auth.ok) return auth;
  if (!esUuid(usuarioId)) return err("DATOS_INVALIDOS");

  const supabase = await createSupabaseServerClient();
  const { data: cuenta, error: cuentaError } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", usuarioId)
    .maybeSingle();
  if (cuentaError) {
    const ref = logError("reactivarCuenta:cuenta", cuentaError, { usuarioId });
    return errConRef("ERROR_INTERNO", "No se pudo reactivar la cuenta. Intentá de nuevo.", ref);
  }
  if (cuenta?.rol !== "municipalidad") {
    return err("NO_ENCONTRADO", "La cuenta no existe o no es de la Oficina de Empleo.");
  }

  // Primero se saca el ban y después se activa en la base: si algo falla, la
  // cuenta sigue figurando desactivada (sin acceso, por usuarios.activo) y se
  // puede reintentar desde la pantalla.
  const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(usuarioId, {
    ban_duration: "none",
  });
  if (banError) {
    const ref = logError("reactivarCuenta:ban", banError, { usuarioId });
    return errConRef("ERROR_INTERNO", "No se pudo reactivar la cuenta. Intentá de nuevo.", ref);
  }

  const { error } = await supabase.rpc("reactivar_cuenta_oficina", {
    p_usuario_id: usuarioId,
  });
  if (error) {
    if (error.code === "P0001" || error.code === "42501") return fromSupabaseError(error);
    const ref = logError("reactivarCuenta", error, { usuarioId });
    return errConRef("ERROR_INTERNO", "No se pudo reactivar la cuenta. Intentá de nuevo.", ref);
  }

  revalidatePath(RUTA);
  return okMsg("Cuenta reactivada.");
}
