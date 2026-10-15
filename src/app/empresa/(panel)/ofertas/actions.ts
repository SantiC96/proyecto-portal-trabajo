"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requerirEmpresa } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { err, errConRef, fromSupabaseError, okMsg, type Resultado } from "@/lib/resultado";
import {
  esUuid,
  validarOfertaRecibida,
  type OfertaData,
  type OfertaValidada,
} from "@/lib/validaciones";

function getEmpresaAprobada() {
  return requerirEmpresa({
    aprobada: true,
    mensajeNoAprobada: "Tu empresa no está aprobada para publicar ofertas.",
  });
}

const UBICACION_OFERTA = "Funes, Santa Fe";

function contenidoOferta(data: OfertaValidada) {
  return {
    p_titulo: data.titulo.trim(),
    p_descripcion: data.descripcion.trim(),
    p_ubicacion: UBICACION_OFERTA,
    p_modalidad: data.modalidad,
    p_jornada: data.jornada,
    p_requisitos: data.requisitos.map((r) => r.trim()).filter(Boolean),
    p_beneficios: data.beneficios.map((b) => b.trim()).filter(Boolean),
    p_duracion_dias: data.duracionDias,
    p_categoria_ids: data.categorias,
    p_cantidad_vacantes: data.cantidadVacantes,
  };
}

/**
 * `claveEnvio` la genera el formulario al abrirse: un segundo envío del mismo
 * formulario (doble click, reintento) trae la misma clave y la base lo
 * rechaza en vez de crear otra oferta (migration_040).
 */
export async function crearOferta(datos: OfertaData, claveEnvio: string): Promise<Resultado<void>> {
  const empresaResult = await getEmpresaAprobada();
  if (!empresaResult.ok) return empresaResult;
  const { empresa } = empresaResult;

  if (!esUuid(claveEnvio)) return err("DATOS_INVALIDOS");
  const validacion = validarOfertaRecibida(datos);
  if (!validacion.ok) return err("DATOS_INVALIDOS", validacion.mensaje);

  // La función crea la oferta, sus categorías y sus vacantes en una sola
  // transacción y valida las categorías.
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("crear_oferta_empresa", {
    ...contenidoOferta(validacion.oferta),
    p_clave_envio: claveEnvio,
  });

  if (error) {
    if (error.code === "23505") {
      return err("CONFLICTO", "Esta oferta ya se envió. La vas a encontrar en tu listado de ofertas.");
    }
    // P0001: mensajes de la función y de los triggers, aptos para el usuario.
    if (error.code === "P0001" || error.code === "42501") return fromSupabaseError(error);
    const ref = logError("crearOferta", error, { empresaId: empresa.id });
    return errConRef("ERROR_INTERNO", "No se pudo crear la oferta. Intentá de nuevo.", ref);
  }

  revalidatePath("/empresa/ofertas");
  revalidatePath("/ofertas");
  return okMsg("Oferta enviada a revisión.");
}

export async function editarOferta(id: string, datos: OfertaData): Promise<Resultado<void>> {
  const empresaResult = await getEmpresaAprobada();
  if (!empresaResult.ok) return empresaResult;

  if (!esUuid(id)) return err("NO_ENCONTRADO", "No se encontró la oferta o no tenés permiso para editarla.");

  const validacion = validarOfertaRecibida(datos);
  if (!validacion.ok) return err("DATOS_INVALIDOS", validacion.mensaje);

  // La función verifica que la oferta sea propia y no esté cerrada, que las
  // vacantes no queden por debajo de los seleccionados y que las categorías
  // existan; actualiza todo en una transacción. Los triggers de ofertas
  // siguen bloqueando la edición en revisión (024) y mandando la oferta de
  // nuevo a revisión cuando cambia el contenido (027).
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("editar_oferta_empresa", {
    p_oferta_id: id,
    ...contenidoOferta(validacion.oferta),
  });

  if (error) {
    if (error.code === "P0001" || error.code === "42501") return fromSupabaseError(error);
    const ref = logError("editarOferta", error, { ofertaId: id });
    return errConRef("ERROR_INTERNO", "No se pudo guardar la oferta. Intentá de nuevo.", ref);
  }

  revalidatePath("/empresa/ofertas");
  revalidatePath(`/empresa/ofertas/${id}/editar`);
  revalidatePath("/ofertas");
  return okMsg("Oferta guardada. Volvió a revisión de la Oficina de Empleo.");
}

export async function eliminarOferta(id: string): Promise<Resultado<void>> {
  const empresaResult = await getEmpresaAprobada();
  if (!empresaResult.ok) return empresaResult;
  const { empresa } = empresaResult;

  if (!esUuid(id)) return err("NO_ENCONTRADO", "No se encontró la oferta o no tenés permiso para eliminarla.");

  const supabase = await createSupabaseServerClient();

  const { data: oferta } = await supabase
    .from("ofertas")
    .select("id, estado")
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .maybeSingle();

  if (!oferta) return err("NO_ENCONTRADO", "No se encontró la oferta o no tenés permiso para eliminarla.");
  if (oferta.estado !== "pendiente_aprobacion" && oferta.estado !== "rechazada")
    return err("ESTADO_INVALIDO", "Solo podés eliminar una oferta pendiente de revisión o rechazada.");

  // Usar supabaseAdmin porque empresa no tiene SELECT en postulaciones
  const { count } = await supabaseAdmin
    .from("postulaciones")
    .select("id", { count: "exact", head: true })
    .eq("oferta_id", id);

  if (count && count > 0)
    return err("ESTADO_INVALIDO", "Esta oferta ya tiene postulaciones y no se puede eliminar.");

  const { error: errorDelete } = await supabase
    .from("ofertas")
    .delete()
    .eq("id", id)
    .eq("empresa_id", empresa.id);

  if (errorDelete) {
    const ref = logError("eliminarOferta", errorDelete, { ofertaId: id });
    return errConRef("ERROR_INTERNO", "No se pudo eliminar la oferta. Intentá de nuevo.", ref);
  }

  revalidatePath("/empresa/ofertas");
  revalidatePath("/ofertas");
  return okMsg("El envío fue eliminado.");
}

export async function cerrarOferta(id: string): Promise<Resultado<void>> {
  const empresaResult = await getEmpresaAprobada();
  if (!empresaResult.ok) return empresaResult;
  const { empresa } = empresaResult;

  if (!esUuid(id)) return err("NO_ENCONTRADO", "No se encontró la oferta o no tenés permiso para cerrarla.");

  const supabase = await createSupabaseServerClient();

  const { data: oferta } = await supabase
    .from("ofertas")
    .select("id, estado")
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .maybeSingle();

  if (!oferta) return err("NO_ENCONTRADO", "No se encontró la oferta o no tenés permiso para cerrarla.");
  if (oferta.estado === "cerrada") return err("ESTADO_INVALIDO", "La oferta ya está cerrada.");
  if (oferta.estado === "rechazada") return err("ESTADO_INVALIDO", "No podés cerrar una oferta rechazada.");
  if (oferta.estado !== "activa" && oferta.estado !== "pendiente_aprobacion")
    return err("ESTADO_INVALIDO", "No se puede cerrar esta oferta.");

  // Pendiente con postulaciones es el único caso de pendiente que puede cerrarse.
  if (oferta.estado === "pendiente_aprobacion") {
    const { count } = await supabaseAdmin
      .from("postulaciones")
      .select("id", { count: "exact", head: true })
      .eq("oferta_id", id);

    if (!count || count === 0)
      return err(
        "ESTADO_INVALIDO",
        "No podés cerrar una oferta pendiente sin postulaciones. Usá «Eliminar envío» para borrarla.",
      );
  }

  const { data: actualizada, error } = await supabase
    .from("ofertas")
    .update({ estado: "cerrada", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .select("id");

  if (error) {
    const ref = logError("cerrarOferta", error, { ofertaId: id });
    return errConRef("ERROR_INTERNO", "No se pudo cerrar la oferta. Intentá de nuevo.", ref);
  }
  if (!actualizada || actualizada.length === 0)
    return err("ESTADO_INVALIDO", "No se encontró la oferta o ya está cerrada.");

  revalidatePath("/empresa/ofertas");
  revalidatePath("/ofertas");
  return okMsg("Oferta cerrada.");
}

/**
 * Renueva una oferta publicada y vencida por la misma duración, sin pasar
 * por revisión (el contenido no cambia). La función de la base verifica que
 * la oferta sea de la empresa y que esté vencida (migration_036).
 */
export async function renovarOferta(id: string): Promise<Resultado<void>> {
  const empresaResult = await getEmpresaAprobada();
  if (!empresaResult.ok) return empresaResult;
  const { empresa } = empresaResult;

  if (!esUuid(id)) return err("DATOS_INVALIDOS");

  const supabase = await createSupabaseServerClient();

  const { data: oferta } = await supabase
    .from("ofertas")
    .select("id, estado, vence_en")
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .maybeSingle();

  if (!oferta) return err("NO_ENCONTRADO", "No se encontró la oferta o no tenés permiso para renovarla.");
  if (oferta.estado !== "activa" || !oferta.vence_en || new Date(oferta.vence_en) > new Date())
    return err("ESTADO_INVALIDO", "Solo podés renovar una oferta publicada que ya venció.");

  const { error } = await supabase.rpc("renovar_oferta", { p_oferta_id: id });

  if (error) {
    if (error.code === "P0001" || error.code === "42501") return fromSupabaseError(error);
    const ref = logError("renovarOferta", error, { ofertaId: id });
    return errConRef("ERROR_INTERNO", "No se pudo renovar la oferta. Intentá de nuevo.", ref);
  }

  revalidatePath("/empresa/ofertas");
  revalidatePath(`/empresa/ofertas/${id}`);
  revalidatePath("/empresa");
  revalidatePath("/ofertas");
  revalidatePath(`/ofertas/${id}`);
  revalidatePath("/");
  revalidatePath("/admin/ofertas");
  return okMsg("Oferta renovada. Ya se ve de nuevo en el portal.");
}
