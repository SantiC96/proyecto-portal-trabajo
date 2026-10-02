"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { traducirErrorAuth } from "@/lib/auth-errors";

// ─────────────────────────────────────────────────────────────────────────────
// Actualizar datos personales + rubros de interés
// ─────────────────────────────────────────────────────────────────────────────

export async function actualizarPerfil(data: {
  nombre: string;
  apellido: string;
  telefono: string;
  domicilio: string;
  categoriaIds: string[];
}): Promise<{ error?: string; exito?: boolean }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  // Validación básica
  if (!data.nombre.trim() || !data.apellido.trim()) {
    return { error: "El nombre y el apellido son obligatorios." };
  }

  // Obtener el id del postulante (nunca del cliente)
  const { data: postulante, error: postulanteError } = await supabaseAdmin
    .from("postulantes")
    .select("id")
    .eq("usuario_id", user.id)
    .single();

  if (postulanteError || !postulante) {
    return { error: "No se encontró el perfil del postulante." };
  }

  // Actualizar usuarios y postulantes en paralelo
  const [usuariosResult, postulanteResult] = await Promise.all([
    supabaseAdmin
      .from("usuarios")
      .update({
        nombre: data.nombre.trim(),
        apellido: data.apellido.trim(),
        telefono: data.telefono.trim(),
      })
      .eq("id", user.id),
    supabaseAdmin
      .from("postulantes")
      .update({ domicilio: data.domicilio.trim() || null })
      .eq("usuario_id", user.id),
  ]);

  if (usuariosResult.error) {
    return { error: "Error al guardar los datos. Intentá de nuevo." };
  }
  if (postulanteResult.error) {
    return { error: "Error al guardar el domicilio. Intentá de nuevo." };
  }

  // Actualizar rubros: borrar los anteriores e insertar los nuevos
  const { error: deleteError } = await supabaseAdmin
    .from("postulante_categorias")
    .delete()
    .eq("postulante_id", postulante.id);

  if (deleteError) {
    return { error: "Error al actualizar los rubros. Intentá de nuevo." };
  }

  if (data.categoriaIds.length > 0) {
    const filas = data.categoriaIds.map((cid) => ({
      postulante_id: postulante.id,
      categoria_id: cid,
    }));
    const { error: insertError } = await supabaseAdmin
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
  if (!file || file.size === 0) return { error: "No se recibió ningún archivo." };

  const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];
  if (!tiposPermitidos.includes(file.type)) {
    return { error: "Solo se aceptan imágenes JPG, PNG o WEBP." };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { error: "La imagen no puede superar los 2 MB." };
  }

  const ext =
    file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const nuevaRuta = `${user.id}/avatar-${Date.now()}.${ext}`;

  // Subir al storage (nombre único, sin upsert)
  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await supabaseAdmin.storage
    .from("avatares")
    .upload(nuevaRuta, buffer, { contentType: file.type });

  if (uploadError) {
    console.error("subirAvatar: fallo upload a Storage:", uploadError);
    return { error: "Error al subir la imagen. Intentá de nuevo." };
  }

  // Activar nuevo y desactivar anterior en una sola transacción
  const { error: rpcError } = await supabaseAdmin.rpc("activar_archivo_usuario", {
    p_usuario_id: user.id,
    p_tipo: "avatar",
    p_ruta: nuevaRuta,
    p_nombre_original: file.name,
    p_tamano: file.size,
  });

  if (rpcError) {
    console.error("subirAvatar: fallo RPC activar_archivo_usuario:", rpcError);
    return { error: "Error al guardar la foto. Intentá de nuevo." };
  }

  revalidatePath("/perfil");
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
  if (!file || file.size === 0) return { error: "No se recibió ningún archivo." };

  if (file.type !== "application/pdf") {
    return { error: "El CV debe ser un archivo PDF." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: "El CV no puede superar los 5 MB." };
  }

  // Nombre único por timestamp para no sobrescribir archivos anteriores
  const nuevaRuta = `${user.id}/cv-${Date.now()}.pdf`;
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from("cvs")
    .upload(nuevaRuta, buffer, { contentType: "application/pdf" });

  if (uploadError) {
    console.error("subirCV: fallo upload a Storage:", uploadError);
    return { error: "Error al subir el CV. Intentá de nuevo." };
  }

  // Activar nuevo y desactivar anterior en una sola transacción
  const { error: rpcError } = await supabaseAdmin.rpc("activar_archivo_usuario", {
    p_usuario_id: user.id,
    p_tipo: "cv",
    p_ruta: nuevaRuta,
    p_nombre_original: file.name,
    p_tamano: file.size,
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
  if (contrasenaNueva.length < 6)
    return { error: "La contraseña nueva debe tener al menos 6 caracteres." };
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
