"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirRol } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { err, errConRef, fromSupabaseError, okMsg, type Resultado } from "@/lib/resultado";
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
    // Condicional: si entretanto se derivó o descartó, no la pisa.
    const { error } = await supabase
      .from("postulaciones")
      .update({
        estado: "en_revision",
        revisado_por: auth.usuario.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postulacionId)
      .eq("estado", "recibida");

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

  const mensajeEstado = "Solo se puede marcar en revisión desde «Recibida» o «No seleccionado».";
  if (
    postulacion.estado !== "recibida" &&
    postulacion.estado !== "rechazada_municipalidad"
  ) {
    return err("ESTADO_INVALIDO", mensajeEstado);
  }

  // Condicional: si otra pestaña la derivó entre la lectura y el update, no
  // afecta filas y no deja una postulación derivada «en revisión».
  const { data, error } = await supabase
    .from("postulaciones")
    .update({
      estado: "en_revision",
      revisado_por: auth.usuario.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postulacionId)
    .in("estado", ["recibida", "rechazada_municipalidad"])
    .select("id");

  if (error) {
    const ref = logError("marcarEnRevision", error, { postulacionId });
    return errConRef("ERROR_INTERNO", "Error al actualizar la postulación. Intentá de nuevo.", ref);
  }
  if (!data || data.length === 0) return err("ESTADO_INVALIDO", mensajeEstado);

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

  const mensajeEstado = "Solo se puede descartar desde 'recibida' o 'en revisión'.";
  if (
    postulacion.estado !== "recibida" &&
    postulacion.estado !== "en_revision"
  ) {
    return err("ESTADO_INVALIDO", mensajeEstado);
  }

  const oferta = postulacion.ofertas;
  if (!oferta || oferta.estado !== "activa") {
    return err(
      "ESTADO_INVALIDO",
      "La oferta está en revisión y no se puede procesar la postulación hasta que vuelva a aprobarse.",
    );
  }

  // Condicional: si otra pestaña la derivó entre la lectura y el update, no
  // afecta filas y no deja una derivación con la postulación descartada.
  const { data, error } = await supabase
    .from("postulaciones")
    .update({
      estado: "rechazada_municipalidad",
      nota_oficina: nota?.trim() || null,
      revisado_por: auth.usuario.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postulacionId)
    .in("estado", ["recibida", "en_revision"])
    .select("id");

  if (error) {
    const ref = logError("descartarPostulacion", error, { postulacionId });
    return errConRef("ERROR_INTERNO", "Error al descartar la postulación. Intentá de nuevo.", ref);
  }
  if (!data || data.length === 0) return err("ESTADO_INVALIDO", mensajeEstado);

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

  // La función inserta la derivación y cambia el estado en una transacción, y
  // controla el estado de la postulación y de la oferta (migration_040).
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("derivar_postulacion", {
    p_postulacion_id: postulacionId,
    p_nota: nota?.trim() ?? "",
  });

  if (error) {
    if (error.code === "23505") return err("CONFLICTO", "Esta postulación ya fue derivada.");
    if (error.code === "P0001" || error.code === "42501") return fromSupabaseError(error);
    const ref = logError("derivarPostulacion", error, { postulacionId });
    return errConRef("ERROR_INTERNO", "Error al derivar la postulación. Intentá de nuevo.", ref);
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
    // derivaciones_limite_vacantes (040) también aplica a la oficina.
    if (error.code === "P0001") return fromSupabaseError(error);
    const ref = logError("corregirEstadoDerivacion", error, { derivacionId });
    return errConRef("ERROR_INTERNO", "No se pudo corregir el estado. Intentá de nuevo.", ref);
  }

  revalidarVistas(postulacionId);
  return okMsg("Estado corregido.");
}
