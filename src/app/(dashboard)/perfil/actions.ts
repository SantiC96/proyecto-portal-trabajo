"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requerirPostulante, requerirRol, requerirUsuario } from "@/lib/auth";
import { traducirErrorAuth } from "@/lib/auth-errors";
import { logError } from "@/lib/logger";
import { err, errCampo, errConRef, fromSupabaseError, okMsg, type Resultado } from "@/lib/resultado";
import {
  LARGO_MAXIMO,
  leerArchivo,
  leerTexto,
  sonUuids,
  validarDNI,
  validarNombre,
  validarPassword,
  validarTelefono,
  validarTextoOpcional,
} from "@/lib/validaciones";
import {
  AVATAR_MAX_SIZE,
  CV_MAX_SIZE,
  ERRORES_ARCHIVO,
  validarTipoAvatar,
  validarTipoCV,
  detectarMimeType,
} from "@/lib/archivos";
import { validarInformacionLaboral } from "@/lib/informacion-laboral";

// ─────────────────────────────────────────────────────────────────────────────
// Actualizar datos personales
// ─────────────────────────────────────────────────────────────────────────────

export async function actualizarPerfil(data: {
  nombre: string;
  apellido: string;
  telefono: string;
  domicilio: string;
  dni: string;
  nivelEducativo: string;
  situacionLaboral: string;
  disponibilidad: string;
  experienciaLaboral: string;
}): Promise<Resultado<void>> {
  const auth = await requerirRol("postulante");
  if (!auth.ok) return auth;
  const user = auth.usuario;

  if (
    typeof data !== "object" ||
    data === null ||
    [data.nombre, data.apellido, data.telefono, data.domicilio, data.dni].some(
      (v) => typeof v !== "string",
    )
  ) {
    return err("DATOS_INVALIDOS");
  }

  const errNombre = validarNombre(data.nombre);
  if (errNombre) return errCampo("nombre", errNombre);
  const errApellido = validarNombre(data.apellido);
  if (errApellido) return errCampo("apellido", errApellido);
  const errDni = validarDNI(data.dni);
  if (errDni) return errCampo("dni", errDni);
  const errTelefono = validarTelefono(data.telefono);
  if (errTelefono) return errCampo("telefono", errTelefono);
  const errDomicilio = validarTextoOpcional(data.domicilio, LARGO_MAXIMO.domicilio);
  if (errDomicilio) return errCampo("domicilio", errDomicilio);
  const errLaboral = validarInformacionLaboral(data);
  if (errLaboral) return errCampo(errLaboral.campo, errLaboral.mensaje);

  const dniLimpio = data.dni.replace(/\D/g, "");

  // usuarios y postulantes (con la información laboral) se actualizan en una
  // transacción: si el DNI está repetido no se guarda nada (040 y 046).
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("actualizar_mi_perfil_postulante", {
    p_nombre: data.nombre.trim(),
    p_apellido: data.apellido.trim(),
    p_telefono: data.telefono.trim(),
    p_domicilio: data.domicilio.trim(),
    p_dni: dniLimpio,
    p_nivel_educativo: data.nivelEducativo,
    p_situacion_laboral: data.situacionLaboral,
    p_disponibilidad: data.disponibilidad,
    p_experiencia_laboral: data.experienciaLaboral.trim(),
  });

  if (error) {
    if (error.code === "23505") {
      return err("CONFLICTO", "Ese DNI ya está registrado en otra cuenta.");
    }
    if (error.code === "P0001" || error.code === "42501") return fromSupabaseError(error);
    const ref = logError("actualizarPerfil", error, { userId: user.id });
    return errConRef("ERROR_INTERNO", "Error al guardar los datos. Intentá de nuevo.", ref);
  }

  revalidatePath("/perfil");
  return okMsg("Perfil actualizado.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Actualizar rubros de interés
// ─────────────────────────────────────────────────────────────────────────────

export async function actualizarRubros(
  categoriaIds: string[]
): Promise<Resultado<void>> {
  const auth = await requerirPostulante({
    mensajeSinPermiso: "No se encontró el perfil del postulante.",
  });
  if (!auth.ok) return auth;
  const { postulante } = auth;

  if (!sonUuids(categoriaIds)) {
    return err("DATOS_INVALIDOS", "Algunas categorías no son válidas.");
  }
  const ids = [...new Set(categoriaIds)];

  // Borrar e insertar en una transacción: si algo falla se conservan los
  // rubros anteriores. La función valida que las categorías existan.
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("reemplazar_mis_rubros", { p_categoria_ids: ids });

  if (error) {
    if (error.code === "P0001" || error.code === "42501") return fromSupabaseError(error);
    const ref = logError("actualizarRubros", error, { postulanteId: postulante.id });
    return errConRef("ERROR_INTERNO", "Error al guardar los rubros. Intentá de nuevo.", ref);
  }

  revalidatePath("/perfil");
  return okMsg("Rubros actualizados.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Archivos: Storage y la base no comparten transacción
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compensación cuando el archivo se subió pero no se pudo registrar en
 * archivos_usuario: borra el archivo para no dejarlo huérfano.
 *
 * Antes de borrar se confirma que ninguna fila apunte a esa ruta: si el
 * registro llegó a guardarse y solo se perdió la respuesta, borrar el archivo
 * dejaría un registro activo sin archivo. Si no se puede confirmar, el archivo
 * queda (huérfano, inofensivo) y se registra en el log.
 */
async function descartarArchivoSubido(
  bucket: "avatares" | "cvs",
  ruta: string,
  contexto: string,
): Promise<void> {
  const { data: registros, error: errorConsulta } = await supabaseAdmin
    .from("archivos_usuario")
    .select("id")
    .eq("ruta", ruta)
    .limit(1);

  if (errorConsulta) {
    logError(`${contexto}:compensacion`, errorConsulta, { bucket, ruta });
    return;
  }
  if (registros.length > 0) return;

  const { error: errorBorrado } = await supabaseAdmin.storage.from(bucket).remove([ruta]);
  if (errorBorrado) logError(`${contexto}:compensacion`, errorBorrado, { bucket, ruta });
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────────────────────

export async function subirAvatar(
  formData: FormData
): Promise<Resultado<void>> {
  const auth = await requerirRol("postulante");
  if (!auth.ok) return auth;
  const user = auth.usuario;

  const file = leerArchivo(formData, "avatar");
  if (!file || file.size === 0) return err("ARCHIVO_INVALIDO", ERRORES_ARCHIVO.vacio);

  if (file.name.length > 200) return err("ARCHIVO_INVALIDO", ERRORES_ARCHIVO.nombreLargo);
  const nombreLimpio = file.name.replace(/[\x00-\x1f\x7f]/g, "");

  if (!validarTipoAvatar(file.type)) {
    return err("ARCHIVO_INVALIDO", ERRORES_ARCHIVO.avatarTipo);
  }
  if (file.size > AVATAR_MAX_SIZE) {
    return err("ARCHIVO_INVALIDO", ERRORES_ARCHIVO.avatarTamano);
  }

  const buffer = await file.arrayBuffer();
  const inicio = new Uint8Array(buffer, 0, Math.min(12, buffer.byteLength));
  const tipoVerificado = detectarMimeType(inicio);

  if (!tipoVerificado || !validarTipoAvatar(tipoVerificado)) {
    return err("ARCHIVO_INVALIDO", ERRORES_ARCHIVO.avatarFirma);
  }

  const ext = tipoVerificado === "image/jpeg" ? "jpg" : tipoVerificado === "image/png" ? "png" : "webp";
  const nuevaRuta = `${user.id}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("avatares")
    .upload(nuevaRuta, buffer, { contentType: tipoVerificado });

  if (uploadError) {
    const ref = logError("subirAvatar:upload", uploadError, { userId: user.id });
    return errConRef("ERROR_INTERNO", "Error al subir la imagen. Intentá de nuevo.", ref);
  }

  // Activar nuevo y desactivar anterior en una sola transacción
  const { error: rpcError } = await supabaseAdmin.rpc("activar_archivo_usuario", {
    p_usuario_id: user.id,
    p_tipo: "avatar",
    p_ruta: nuevaRuta,
    p_nombre_original: nombreLimpio,
    p_tamano: file.size,
    p_mime_type: tipoVerificado,
  });

  if (rpcError) {
    const ref = logError("subirAvatar:rpc", rpcError, { userId: user.id });
    await descartarArchivoSubido("avatares", nuevaRuta, "subirAvatar");
    return errConRef("ERROR_INTERNO", "Error al guardar la foto. Intentá de nuevo.", ref);
  }

  revalidatePath("/perfil");
  return okMsg("Foto de perfil actualizada.");
}

export async function ajustarAvatar(data: {
  x: number;
  y: number;
  zoom: number;
}): Promise<Resultado<void>> {
  const auth = await requerirRol("postulante");
  if (!auth.ok) return auth;
  const user = auth.usuario;

  if (
    typeof data !== "object" ||
    data === null ||
    ![data.x, data.y, data.zoom].every((v) => typeof v === "number" && Number.isFinite(v))
  ) {
    return err("DATOS_INVALIDOS");
  }
  if (data.x < 0 || data.x > 100 || data.y < 0 || data.y > 100) {
    return err("DATOS_INVALIDOS", "Posición fuera de rango.");
  }
  if (data.zoom < 1 || data.zoom > 3) {
    return err("DATOS_INVALIDOS", "Zoom fuera de rango.");
  }

  const { error } = await supabaseAdmin
    .from("archivos_usuario")
    .update({ ajuste_x: data.x, ajuste_y: data.y, ajuste_zoom: data.zoom })
    .eq("usuario_id", user.id)
    .eq("tipo", "avatar")
    .eq("activo", true);

  if (error) {
    const ref = logError("ajustarAvatar", error, { userId: user.id });
    return errConRef("ERROR_INTERNO", "Error al guardar el ajuste. Intentá de nuevo.", ref);
  }

  revalidatePath("/perfil");
  revalidatePath("/", "layout");
  return okMsg("Ajuste guardado.");
}

export async function quitarAvatar(): Promise<Resultado<void>> {
  const auth = await requerirRol("postulante");
  if (!auth.ok) return auth;
  const user = auth.usuario;

  // Eliminación lógica: marcar el activo como inactivo, no borrar del bucket
  const { error } = await supabaseAdmin
    .from("archivos_usuario")
    .update({ activo: false, desactivado_en: new Date().toISOString() })
    .eq("usuario_id", user.id)
    .eq("tipo", "avatar")
    .eq("activo", true);

  if (error) {
    const ref = logError("quitarAvatar", error, { userId: user.id });
    return errConRef("ERROR_INTERNO", "Error al quitar la foto. Intentá de nuevo.", ref);
  }

  revalidatePath("/perfil");
  return okMsg("Foto de perfil quitada.");
}

// ─────────────────────────────────────────────────────────────────────────────
// CV
// ─────────────────────────────────────────────────────────────────────────────

export async function subirCV(
  formData: FormData
): Promise<Resultado<void>> {
  const auth = await requerirRol("postulante");
  if (!auth.ok) return auth;
  const user = auth.usuario;

  const file = leerArchivo(formData, "cv");
  if (!file || file.size === 0) return err("ARCHIVO_INVALIDO", ERRORES_ARCHIVO.vacio);

  if (file.name.length > 200) return err("ARCHIVO_INVALIDO", ERRORES_ARCHIVO.nombreLargo);
  const nombreLimpio = file.name.replace(/[\x00-\x1f\x7f]/g, "");

  if (!validarTipoCV(file.type)) {
    return err("ARCHIVO_INVALIDO", ERRORES_ARCHIVO.cvTipo);
  }
  if (file.size > CV_MAX_SIZE) {
    return err("ARCHIVO_INVALIDO", ERRORES_ARCHIVO.cvTamano);
  }

  const buffer = await file.arrayBuffer();
  const inicio = new Uint8Array(buffer, 0, Math.min(12, buffer.byteLength));
  const tipoVerificado = detectarMimeType(inicio);

  if (tipoVerificado !== "application/pdf") {
    return err("ARCHIVO_INVALIDO", ERRORES_ARCHIVO.cvFirma);
  }

  // Nombre único por timestamp para no sobrescribir archivos anteriores
  const nuevaRuta = `${user.id}/cv-${Date.now()}.pdf`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("cvs")
    .upload(nuevaRuta, buffer, { contentType: tipoVerificado });

  if (uploadError) {
    const ref = logError("subirCV:upload", uploadError, { userId: user.id });
    return errConRef("ERROR_INTERNO", "Error al subir el CV. Intentá de nuevo.", ref);
  }

  // Activar nuevo y desactivar anterior en una sola transacción
  const { error: rpcError } = await supabaseAdmin.rpc("activar_archivo_usuario", {
    p_usuario_id: user.id,
    p_tipo: "cv",
    p_ruta: nuevaRuta,
    p_nombre_original: nombreLimpio,
    p_tamano: file.size,
    p_mime_type: tipoVerificado,
  });

  if (rpcError) {
    const ref = logError("subirCV:rpc", rpcError, { userId: user.id });
    await descartarArchivoSubido("cvs", nuevaRuta, "subirCV");
    return errConRef("ERROR_INTERNO", "Error al guardar la ruta del CV. Intentá de nuevo.", ref);
  }

  revalidatePath("/perfil");
  return okMsg("CV actualizado.");
}

export async function eliminarCV(): Promise<Resultado<void>> {
  const auth = await requerirRol("postulante");
  if (!auth.ok) return auth;
  const user = auth.usuario;

  // Eliminación lógica: marcar el activo como inactivo, no borrar del bucket
  const { error } = await supabaseAdmin
    .from("archivos_usuario")
    .update({ activo: false, desactivado_en: new Date().toISOString() })
    .eq("usuario_id", user.id)
    .eq("tipo", "cv")
    .eq("activo", true);

  if (error) {
    const ref = logError("eliminarCV", error, { userId: user.id });
    return errConRef("ERROR_INTERNO", "Error al eliminar el CV. Intentá de nuevo.", ref);
  }

  revalidatePath("/perfil");
  return okMsg("CV eliminado.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Cambiar contraseña (usuario autenticado)
// ─────────────────────────────────────────────────────────────────────────────

export async function cambiarContrasena(
  formData: FormData
): Promise<Resultado<void>> {
  const contrasenaActual = leerTexto(formData, "contrasenaActual");
  const contrasenaNueva = leerTexto(formData, "contrasenaNueva");
  const repetirContrasena = leerTexto(formData, "repetirContrasena");

  if (!contrasenaActual || !contrasenaNueva || !repetirContrasena)
    return err("DATOS_INVALIDOS", "Completá todos los campos.");
  const errPwd = validarPassword(contrasenaNueva);
  if (errPwd) return errCampo("contrasenaNueva", errPwd);
  if (contrasenaNueva !== repetirContrasena)
    return errCampo("repetirContrasena", "Las contraseñas nuevas no coinciden.");
  if (contrasenaNueva === contrasenaActual)
    return errCampo("contrasenaNueva", "La contraseña nueva debe ser distinta de la actual.");

  const auth = await requerirUsuario();
  if (!auth.ok) return auth;
  const user = auth.usuario;
  if (!user.email) return err("NO_AUTENTICADO");

  // Verificar contraseña actual con el cliente admin (no toca la sesión de cookies)
  const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email: user.email,
    password: contrasenaActual,
  });
  if (signInError) return errCampo("contrasenaActual", "La contraseña actual es incorrecta.");

  const supabase = await createSupabaseServerClient();
  const { error: updateError } = await supabase.auth.updateUser({
    password: contrasenaNueva,
  });
  if (updateError) {
    const r = traducirErrorAuth(updateError);
    if (!r.ok && r.codigo === "ERROR_INTERNO") {
      const ref = logError("cambiarContrasena", updateError, { userId: user.id });
      return errConRef("ERROR_INTERNO", r.mensaje, ref);
    }
    return r;
  }

  return okMsg("Contraseña actualizada.");
}
