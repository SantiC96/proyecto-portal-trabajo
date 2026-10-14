"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { traducirErrorAuth } from "@/lib/auth-errors";
import { validarNombre, validarDNI, validarTelefono, validarPassword } from "@/lib/validaciones";
import {
  AVATAR_MAX_SIZE,
  CV_MAX_SIZE,
  ERRORES_ARCHIVO,
  validarTipoAvatar,
  validarTipoCV,
  detectarMimeType,
} from "@/lib/archivos";

// ─────────────────────────────────────────────────────────────────────────────
// Actualizar datos personales
// ─────────────────────────────────────────────────────────────────────────────

export async function actualizarPerfil(data: {
  nombre: string;
  apellido: string;
  telefono: string;
  domicilio: string;
  dni: string;
}): Promise<{ error?: string; exito?: boolean }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const errNombre = validarNombre(data.nombre);
  if (errNombre) return { error: errNombre };
  const errApellido = validarNombre(data.apellido);
  if (errApellido) return { error: errApellido };
  const errDni = validarDNI(data.dni);
  if (errDni) return { error: errDni };
  const errTelefono = validarTelefono(data.telefono);
  if (errTelefono) return { error: errTelefono };

  const dniLimpio = data.dni.replace(/\D/g, "");

  const [usuariosResult, postulanteResult] = await Promise.all([
    supabase
      .from("usuarios")
      .update({
        nombre: data.nombre.trim(),
        apellido: data.apellido.trim(),
        telefono: data.telefono.trim(),
      })
      .eq("id", user.id)
      .select("id"),
    supabase
      .from("postulantes")
      .update({ domicilio: data.domicilio.trim() || null, dni: dniLimpio })
      .eq("usuario_id", user.id)
      .select("id"),
  ]);

  if (usuariosResult.error) {
    return { error: "Error al guardar los datos. Intentá de nuevo." };
  }
  if (!usuariosResult.data || usuariosResult.data.length === 0) {
    console.error("[actualizarPerfil] usuarios update no afectó ninguna fila", { userId: user.id });
    return { error: "No se pudo completar la acción." };
  }
  if (postulanteResult.error) {
    if (postulanteResult.error.code === "23505") {
      return { error: "Ese DNI ya está registrado en otra cuenta." };
    }
    return { error: "Error al guardar el DNI. Intentá de nuevo." };
  }
  if (!postulanteResult.data || postulanteResult.data.length === 0) {
    console.error("[actualizarPerfil] postulantes update no afectó ninguna fila", { userId: user.id });
    return { error: "No se pudo completar la acción." };
  }

  revalidatePath("/perfil");
  return { exito: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Actualizar rubros de interés
// ─────────────────────────────────────────────────────────────────────────────

export async function actualizarRubros(
  categoriaIds: string[]
): Promise<{ error?: string; exito?: boolean }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const ids = [...new Set(categoriaIds)];

  const { data: postulante, error: postulanteError } = await supabase
    .from("postulantes")
    .select("id")
    .eq("usuario_id", user.id)
    .single();

  if (postulanteError || !postulante) {
    return { error: "No se encontró el perfil del postulante." };
  }

  if (ids.length > 0) {
    const { data: categoriasExistentes } = await supabase
      .from("categorias")
      .select("id")
      .in("id", ids);

    if (!categoriasExistentes || categoriasExistentes.length !== ids.length) {
      return { error: "Algunas categorías no son válidas." };
    }
  }

  const { error: deleteError } = await supabase
    .from("postulante_categorias")
    .delete()
    .eq("postulante_id", postulante.id);

  if (deleteError) {
    return { error: "Error al actualizar los rubros. Intentá de nuevo." };
  }

  if (ids.length > 0) {
    const filas = ids.map((cid) => ({
      postulante_id: postulante.id,
      categoria_id: cid,
    }));
    const { error: insertError } = await supabase
      .from("postulante_categorias")
      .insert(filas);
    if (insertError) {
      return { error: "Error al guardar los rubros. Intentá de nuevo." };
    }
  }

  revalidatePath("/perfil");
  return { exito: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────────────────────

export async function subirAvatar(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) return { error: ERRORES_ARCHIVO.vacio };

  if (file.name.length > 200) return { error: ERRORES_ARCHIVO.nombreLargo };
  const nombreLimpio = file.name.replace(/[\x00-\x1f\x7f]/g, "");

  if (!validarTipoAvatar(file.type)) {
    return { error: ERRORES_ARCHIVO.avatarTipo };
  }
  if (file.size > AVATAR_MAX_SIZE) {
    return { error: ERRORES_ARCHIVO.avatarTamano };
  }

  const buffer = await file.arrayBuffer();
  const inicio = new Uint8Array(buffer, 0, Math.min(12, buffer.byteLength));
  const tipoVerificado = detectarMimeType(inicio);

  if (!tipoVerificado || !validarTipoAvatar(tipoVerificado)) {
    return { error: ERRORES_ARCHIVO.avatarFirma };
  }

  const ext = tipoVerificado === "image/jpeg" ? "jpg" : tipoVerificado === "image/png" ? "png" : "webp";
  const nuevaRuta = `${user.id}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("avatares")
    .upload(nuevaRuta, buffer, { contentType: tipoVerificado });

  if (uploadError) {
    console.error("subirAvatar: fallo upload a Storage:", uploadError);
    return { error: "Error al subir la imagen. Intentá de nuevo." };
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
    console.error("subirAvatar: fallo RPC activar_archivo_usuario:", rpcError);
    return { error: "Error al guardar la foto. Intentá de nuevo." };
  }

  revalidatePath("/perfil");
  return {};
}

export async function ajustarAvatar(data: {
  x: number;
  y: number;
  zoom: number;
}): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  if (data.x < 0 || data.x > 100 || data.y < 0 || data.y > 100) {
    return { error: "Posición fuera de rango." };
  }
  if (data.zoom < 1 || data.zoom > 3) {
    return { error: "Zoom fuera de rango." };
  }

  const { error } = await supabaseAdmin
    .from("archivos_usuario")
    .update({ ajuste_x: data.x, ajuste_y: data.y, ajuste_zoom: data.zoom })
    .eq("usuario_id", user.id)
    .eq("tipo", "avatar")
    .eq("activo", true);

  if (error) return { error: "Error al guardar el ajuste. Intentá de nuevo." };

  revalidatePath("/perfil");
  revalidatePath("/", "layout");
  return {};
}

export async function quitarAvatar(): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  // Eliminación lógica: marcar el activo como inactivo, no borrar del bucket
  const { error } = await supabaseAdmin
    .from("archivos_usuario")
    .update({ activo: false, desactivado_en: new Date().toISOString() })
    .eq("usuario_id", user.id)
    .eq("tipo", "avatar")
    .eq("activo", true);

  if (error) return { error: "Error al quitar la foto. Intentá de nuevo." };

  revalidatePath("/perfil");
  return {};
}

// ─────────────────────────────────────────────────────────────────────────────
// CV
// ─────────────────────────────────────────────────────────────────────────────

export async function subirCV(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const file = formData.get("cv") as File | null;
  if (!file || file.size === 0) return { error: ERRORES_ARCHIVO.vacio };

  if (file.name.length > 200) return { error: ERRORES_ARCHIVO.nombreLargo };
  const nombreLimpio = file.name.replace(/[\x00-\x1f\x7f]/g, "");

  if (!validarTipoCV(file.type)) {
    return { error: ERRORES_ARCHIVO.cvTipo };
  }
  if (file.size > CV_MAX_SIZE) {
    return { error: ERRORES_ARCHIVO.cvTamano };
  }

  const buffer = await file.arrayBuffer();
  const inicio = new Uint8Array(buffer, 0, Math.min(12, buffer.byteLength));
  const tipoVerificado = detectarMimeType(inicio);

  if (tipoVerificado !== "application/pdf") {
    return { error: ERRORES_ARCHIVO.cvFirma };
  }

  // Nombre único por timestamp para no sobrescribir archivos anteriores
  const nuevaRuta = `${user.id}/cv-${Date.now()}.pdf`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("cvs")
    .upload(nuevaRuta, buffer, { contentType: tipoVerificado });

  if (uploadError) {
    console.error("subirCV: fallo upload a Storage:", uploadError);
    return { error: "Error al subir el CV. Intentá de nuevo." };
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
    console.error("subirCV: fallo RPC activar_archivo_usuario:", rpcError);
    return { error: "Error al guardar la ruta del CV. Intentá de nuevo." };
  }

  revalidatePath("/perfil");
  return {};
}

export async function eliminarCV(): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  // Eliminación lógica: marcar el activo como inactivo, no borrar del bucket
  const { error } = await supabaseAdmin
    .from("archivos_usuario")
    .update({ activo: false, desactivado_en: new Date().toISOString() })
    .eq("usuario_id", user.id)
    .eq("tipo", "cv")
    .eq("activo", true);

  if (error) return { error: "Error al eliminar el CV. Intentá de nuevo." };

  revalidatePath("/perfil");
  return {};
}

// ─────────────────────────────────────────────────────────────────────────────
// Cambiar contraseña (usuario autenticado)
// ─────────────────────────────────────────────────────────────────────────────

export async function cambiarContrasena(
  formData: FormData
): Promise<{ error?: string }> {
  const contrasenaActual = formData.get("contrasenaActual") as string;
  const contrasenaNueva = formData.get("contrasenaNueva") as string;
  const repetirContrasena = formData.get("repetirContrasena") as string;

  if (!contrasenaActual || !contrasenaNueva || !repetirContrasena)
    return { error: "Completá todos los campos." };
  const errPwd = validarPassword(contrasenaNueva);
  if (errPwd) return { error: errPwd };
  if (contrasenaNueva !== repetirContrasena)
    return { error: "Las contraseñas nuevas no coinciden." };
  if (contrasenaNueva === contrasenaActual)
    return { error: "La contraseña nueva debe ser distinta de la actual." };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user?.email) return { error: "No autenticado." };

  // Verificar contraseña actual con el cliente admin (no toca la sesión de cookies)
  const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email: user.email,
    password: contrasenaActual,
  });
  if (signInError) return { error: "La contraseña actual es incorrecta." };

  const { error: updateError } = await supabase.auth.updateUser({
    password: contrasenaNueva,
  });
  if (updateError) return { error: traducirErrorAuth(updateError) };

  return {};
}
