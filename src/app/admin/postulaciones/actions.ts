"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { err, errConRef, okMsg, type Resultado, type ResultadoError } from "@/lib/resultado";
import type { EstadoDerivacionEmpresa } from "@/lib/derivacion-estados";

async function verificarMunicipalidad(): Promise<{ ok: true; userId: string } | ResultadoError> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return err("NO_AUTENTICADO");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!usuario || usuario.rol !== "municipalidad") return err("SIN_PERMISO");

  return { ok: true, userId: user.id };
}

function revalidarVistas(postulacionId: string) {
  revalidatePath("/admin/postulaciones");
  revalidatePath(`/admin/postulaciones/${postulacionId}`);
  revalidatePath("/admin");
  revalidatePath("/mis-postulaciones");
}

export async function abrirFicha(postulacionId: string): Promise<void> {
  const auth = await verificarMunicipalidad();
  if (!auth.ok) {
    redirect(`/admin/postulaciones/${postulacionId}`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: postulacion } = await supabase
    .from("postulaciones")
    .select("estado")
    .eq("id", postulacionId)
    .single();

  if (postulacion?.estado === "recibida") {
    const { error } = await supabase
      .from("postulaciones")
      .update({
        estado: "en_revision",
        revisado_por: auth.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postulacionId);

    if (error) {
      logError("abrirFicha", error, { postulacionId });
    } else {
      revalidarVistas(postulacionId);
    }
  }

  redirect(`/admin/postulaciones/${postulacionId}`);
}

export async function marcarEnRevision(
  postulacionId: string
): Promise<Resultado<void>> {
  const auth = await verificarMunicipalidad();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  const { data: postulacion } = await supabase
    .from("postulaciones")
    .select("estado")
    .eq("id", postulacionId)
    .single();

  if (!postulacion) return err("NO_ENCONTRADO", "Postulación no encontrada.");

  if (
    postulacion.estado !== "recibida" &&
    postulacion.estado !== "rechazada_municipalidad"
  ) {
    return err(
      "ESTADO_INVALIDO",
      "Solo se puede marcar en revisión desde «Recibida» o «No seleccionado».",
    );
  }

  const { data, error } = await supabase
    .from("postulaciones")
    .update({
      estado: "en_revision",
      revisado_por: auth.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postulacionId)
    .select("id");

  if (error) {
    const ref = logError("marcarEnRevision", error, { postulacionId });
    return errConRef("ERROR_INTERNO", "Error al actualizar la postulación. Intentá de nuevo.", ref);
  }
  if (!data || data.length === 0) {
    const ref = logError("marcarEnRevision:noRow", null, { postulacionId });
    return errConRef("ERROR_INTERNO", "No se pudo completar la acción.", ref);
  }

  revalidarVistas(postulacionId);
  return okMsg("Postulación marcada como «En revisión».");
}

export async function descartarPostulacion(
  postulacionId: string,
  nota?: string
): Promise<Resultado<void>> {
  const auth = await verificarMunicipalidad();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  const { data: postulacion } = await supabase
    .from("postulaciones")
    .select("estado, ofertas!oferta_id(estado)")
    .eq("id", postulacionId)
    .single();

  if (!postulacion) return err("NO_ENCONTRADO", "Postulación no encontrada.");

  if (
    postulacion.estado !== "recibida" &&
    postulacion.estado !== "en_revision"
  ) {
    return err(
      "ESTADO_INVALIDO",
      "Solo se puede descartar desde 'recibida' o 'en revisión'.",
    );
  }

  const oferta = postulacion.ofertas as unknown as { estado: string } | null;
  if (!oferta || oferta.estado !== "activa") {
    return err(
      "ESTADO_INVALIDO",
      "La oferta está en revisión y no se puede procesar la postulación hasta que vuelva a aprobarse.",
    );
  }

  const { data, error } = await supabase
    .from("postulaciones")
    .update({
      estado: "rechazada_municipalidad",
      nota_oficina: nota?.trim() || null,
      revisado_por: auth.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postulacionId)
    .select("id");

  if (error) {
    const ref = logError("descartarPostulacion", error, { postulacionId });
    return errConRef("ERROR_INTERNO", "Error al descartar la postulación. Intentá de nuevo.", ref);
  }
  if (!data || data.length === 0) {
    const ref = logError("descartarPostulacion:noRow", null, { postulacionId });
    return errConRef("ERROR_INTERNO", "No se pudo completar la acción.", ref);
  }

  revalidarVistas(postulacionId);
  return okMsg("Postulante marcado como «No seleccionado».");
}

export async function derivarPostulacion(
  postulacionId: string,
  nota?: string
): Promise<Resultado<void>> {
  const auth = await verificarMunicipalidad();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  const { data: postulacion } = await supabase
    .from("postulaciones")
    .select("estado, ofertas!oferta_id(estado)")
    .eq("id", postulacionId)
    .single();

  if (!postulacion) return err("NO_ENCONTRADO", "Postulación no encontrada.");

  if (
    postulacion.estado !== "en_revision" &&
    postulacion.estado !== "recibida"
  ) {
    return err("ESTADO_INVALIDO", "Solo se puede derivar desde 'recibida' o 'en revisión'.");
  }

  const oferta = postulacion.ofertas as unknown as { estado: string } | null;
  if (!oferta || oferta.estado !== "activa") {
    return err("ESTADO_INVALIDO", "La oferta ya no está activa y no puede recibir derivaciones.");
  }

  const { error: insertError } = await supabase
    .from("derivaciones")
    .insert({
      postulacion_id: postulacionId,
      municipalidad_usuario_id: auth.userId,
      nota_municipalidad: nota?.trim() || null,
    });

  if (insertError) {
    if (insertError.code === "23505") {
      return err("CONFLICTO", "Esta postulación ya fue derivada.");
    }
    const ref = logError("derivarPostulacion:insert", insertError, { postulacionId });
    return errConRef("ERROR_INTERNO", "Error al derivar la postulación. Intentá de nuevo.", ref);
  }

  const { data, error: updateError } = await supabase
    .from("postulaciones")
    .update({
      estado: "derivada",
      revisado_por: auth.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postulacionId)
    .select("id");

  if (updateError) {
    const ref = logError("derivarPostulacion:update", updateError, { postulacionId });
    return errConRef(
      "ERROR_INTERNO",
      "La derivación se registró pero no se pudo actualizar el estado. Contactá a soporte.",
      ref,
    );
  }
  if (!data || data.length === 0) {
    const ref = logError("derivarPostulacion:noRow", null, { postulacionId });
    return errConRef(
      "ERROR_INTERNO",
      "La derivación se registró pero no se pudo actualizar el estado. Contactá a soporte.",
      ref,
    );
  }

  revalidarVistas(postulacionId);
  return okMsg("Postulación derivada a la empresa.");
}

export async function corregirEstadoDerivacion(
  postulacionId: string,
  derivacionId: string,
  nuevoEstado: EstadoDerivacionEmpresa
): Promise<Resultado<void>> {
  const auth = await verificarMunicipalidad();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("derivaciones")
    .update({ estado_empresa: nuevoEstado })
    .eq("id", derivacionId);

  if (error) {
    const ref = logError("corregirEstadoDerivacion", error, { derivacionId });
    return errConRef("ERROR_INTERNO", "No se pudo corregir el estado. Intentá de nuevo.", ref);
  }

  revalidarVistas(postulacionId);
  return okMsg("Estado corregido.");
}
