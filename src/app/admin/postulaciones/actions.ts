"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function verificarMunicipalidad(): Promise<{ error: string } | { userId: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado." };

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!usuario || usuario.rol !== "municipalidad") {
    return { error: "No tenés permiso para realizar esta acción." };
  }

  return { userId: user.id };
}

function revalidarVistas(postulacionId: string) {
  revalidatePath("/admin/postulaciones");
  revalidatePath(`/admin/postulaciones/${postulacionId}`);
  revalidatePath("/admin");
  revalidatePath("/mis-postulaciones");
}

export async function abrirFicha(postulacionId: string): Promise<void> {
  const auth = await verificarMunicipalidad();
  if ("error" in auth) {
    redirect(`/admin/postulaciones/${postulacionId}`);
  }

  const { data: postulacion } = await supabaseAdmin
    .from("postulaciones")
    .select("estado")
    .eq("id", postulacionId)
    .single();

  if (postulacion?.estado === "recibida") {
    const { error } = await supabaseAdmin
      .from("postulaciones")
      .update({
        estado: "en_revision",
        revisado_por: auth.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postulacionId);

    if (!error) {
      revalidarVistas(postulacionId);
    } else {
      console.error("[abrirFicha]", error);
    }
  }

  redirect(`/admin/postulaciones/${postulacionId}`);
}

export async function marcarEnRevision(
  postulacionId: string
): Promise<{ error?: string }> {
  const auth = await verificarMunicipalidad();
  if ("error" in auth) return auth;

  const { data: postulacion } = await supabaseAdmin
    .from("postulaciones")
    .select("estado")
    .eq("id", postulacionId)
    .single();

  if (!postulacion) return { error: "Postulación no encontrada." };

  if (
    postulacion.estado !== "recibida" &&
    postulacion.estado !== "rechazada_municipalidad"
  ) {
    return {
      error:
        "Solo se puede marcar en revisión desde 'recibida' o 'no seleccionada'.",
    };
  }

  const { error } = await supabaseAdmin
    .from("postulaciones")
    .update({
      estado: "en_revision",
      revisado_por: auth.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postulacionId);

  if (error) {
    console.error("[marcarEnRevision]", error);
    return { error: "Error al actualizar la postulación. Intentá de nuevo." };
  }

  revalidarVistas(postulacionId);
  return {};
}

export async function descartarPostulacion(
  postulacionId: string,
  nota?: string
): Promise<{ error?: string }> {
  const auth = await verificarMunicipalidad();
  if ("error" in auth) return auth;

  const { data: postulacion } = await supabaseAdmin
    .from("postulaciones")
    .select("estado")
    .eq("id", postulacionId)
    .single();

  if (!postulacion) return { error: "Postulación no encontrada." };

  if (
    postulacion.estado !== "recibida" &&
    postulacion.estado !== "en_revision"
  ) {
    return {
      error: "Solo se puede descartar desde 'recibida' o 'en revisión'.",
    };
  }

  const { error } = await supabaseAdmin
    .from("postulaciones")
    .update({
      estado: "rechazada_municipalidad",
      nota_oficina: nota?.trim() || null,
      revisado_por: auth.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postulacionId);

  if (error) {
    console.error("[descartarPostulacion]", error);
    return { error: "Error al descartar la postulación. Intentá de nuevo." };
  }

  revalidarVistas(postulacionId);
  return {};
}

export async function derivarPostulacion(
  postulacionId: string,
  nota?: string
): Promise<{ error?: string }> {
  const auth = await verificarMunicipalidad();
  if ("error" in auth) return auth;

  const { data: postulacion } = await supabaseAdmin
    .from("postulaciones")
    .select("estado, ofertas!oferta_id(estado)")
    .eq("id", postulacionId)
    .single();

  if (!postulacion) return { error: "Postulación no encontrada." };

  if (
    postulacion.estado !== "en_revision" &&
    postulacion.estado !== "recibida"
  ) {
    return { error: "Solo se puede derivar desde 'recibida' o 'en revisión'." };
  }

  const oferta = postulacion.ofertas as unknown as { estado: string } | null;
  if (!oferta || oferta.estado !== "activa") {
    return {
      error: "La oferta ya no está activa y no puede recibir derivaciones.",
    };
  }

  const { error: insertError } = await supabaseAdmin
    .from("derivaciones")
    .insert({
      postulacion_id: postulacionId,
      municipalidad_usuario_id: auth.userId,
      nota_municipalidad: nota?.trim() || null,
    });

  if (insertError) {
    if (insertError.code === "23505") {
      return { error: "Esta postulación ya fue derivada." };
    }
    console.error("[derivarPostulacion] insert derivacion", insertError);
    return { error: "Error al derivar la postulación. Intentá de nuevo." };
  }

  const { error: updateError } = await supabaseAdmin
    .from("postulaciones")
    .update({
      estado: "derivada",
      revisado_por: auth.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postulacionId);

  if (updateError) {
    console.error("[derivarPostulacion] update estado", updateError);
    return {
      error:
        "La derivación se registró pero no se pudo actualizar el estado. Contactá a soporte.",
    };
  }

  revalidarVistas(postulacionId);
  return {};
}
