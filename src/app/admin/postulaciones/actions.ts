"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirRol } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { err, errConRef, okMsg, type Resultado } from "@/lib/resultado";
import type { EstadoDerivacionEmpresa } from "@/lib/derivacion-estados";
import { esUuid, LARGO_MAXIMO, validarTextoOpcional } from "@/lib/validaciones";
import { esValorEnum } from "@/types/db";

function revalidarVistas(postulacionId: string) {
  revalidatePath("/admin/postulaciones");
  revalidatePath(`/admin/postulaciones/${postulacionId}`);
  revalidatePath("/admin");
  revalidatePath("/mis-postulaciones");
}

export async function abrirFicha(postulacionId: string): Promise<void> {
  if (!esUuid(postulacionId)) redirect("/admin/postulaciones");
  const auth = await requerirRol("municipalidad");
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
        revisado_por: auth.usuario.id,
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
  const auth = await requerirRol("municipalidad");
  if (!auth.ok) return auth;

  if (!esUuid(postulacionId)) return err("DATOS_INVALIDOS");

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
      revisado_por: auth.usuario.id,
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
  const auth = await requerirRol("municipalidad");
  if (!auth.ok) return auth;

  if (!esUuid(postulacionId)) return err("DATOS_INVALIDOS");
  const errNota = validarTextoOpcional(nota, LARGO_MAXIMO.nota);
  if (errNota) return err("DATOS_INVALIDOS", `Nota: ${errNota}`);

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

  const oferta = postulacion.ofertas;
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
      revisado_por: auth.usuario.id,
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
  const auth = await requerirRol("municipalidad");
  if (!auth.ok) return auth;

  if (!esUuid(postulacionId)) return err("DATOS_INVALIDOS");
  const errNota = validarTextoOpcional(nota, LARGO_MAXIMO.nota);
  if (errNota) return err("DATOS_INVALIDOS", `Nota: ${errNota}`);

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

  const oferta = postulacion.ofertas;
  if (!oferta || oferta.estado !== "activa") {
    return err("ESTADO_INVALIDO", "La oferta ya no está activa y no puede recibir derivaciones.");
  }

  const { error: insertError } = await supabase
    .from("derivaciones")
    .insert({
      postulacion_id: postulacionId,
      municipalidad_usuario_id: auth.usuario.id,
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
      revisado_por: auth.usuario.id,
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
  const auth = await requerirRol("municipalidad");
  if (!auth.ok) return auth;

  if (!esUuid(postulacionId) || !esUuid(derivacionId)) return err("DATOS_INVALIDOS");
  if (!esValorEnum("estado_empresa", nuevoEstado)) return err("DATOS_INVALIDOS");

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
