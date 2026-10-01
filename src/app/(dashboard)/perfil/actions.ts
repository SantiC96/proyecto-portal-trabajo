"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

  // Leer avatar_path actual para borrarlo
  const { data: usuarioActual } = await supabaseAdmin
    .from("usuarios")
    .select("avatar_path")
    .eq("id", user.id)
    .single();

  const ext =
    file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const nuevaRuta = `${user.id}/avatar-${Date.now()}.${ext}`;

  // Borrar avatar anterior si existe
  if (usuarioActual?.avatar_path) {
    await supabaseAdmin.storage.from("avatares").remove([usuarioActual.avatar_path]);
  }

  // Subir nuevo avatar
  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await supabaseAdmin.storage
    .from("avatares")
    .upload(nuevaRuta, buffer, { contentType: file.type });

  if (uploadError) {
    return { error: "Error al subir la imagen. Intentá de nuevo." };
  }

  // Guardar ruta en DB
  const { error: dbError } = await supabaseAdmin
    .from("usuarios")
    .update({ avatar_path: nuevaRuta })
    .eq("id", user.id);

  if (dbError) {
    await supabaseAdmin.storage.from("avatares").remove([nuevaRuta]);
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

  const { data: usuarioActual } = await supabaseAdmin
    .from("usuarios")
    .select("avatar_path")
    .eq("id", user.id)
    .single();

  if (usuarioActual?.avatar_path) {
    await supabaseAdmin.storage.from("avatares").remove([usuarioActual.avatar_path]);
  }

  const { error } = await supabaseAdmin
    .from("usuarios")
    .update({ avatar_path: null })
    .eq("id", user.id);

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

  const ruta = `${user.id}/cv.pdf`;
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from("cvs")
    .upload(ruta, buffer, { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    return { error: "Error al subir el CV. Intentá de nuevo." };
  }

  const { error: dbError } = await supabaseAdmin
    .from("postulantes")
    .update({ cv_path: ruta })
    .eq("usuario_id", user.id);

  if (dbError) {
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

  const ruta = `${user.id}/cv.pdf`;
  await supabaseAdmin.storage.from("cvs").remove([ruta]);

  const { error } = await supabaseAdmin
    .from("postulantes")
    .update({ cv_path: null })
    .eq("usuario_id", user.id);

  if (error) return { error: "Error al eliminar el CV. Intentá de nuevo." };

  revalidatePath("/perfil");
  return {};
}
