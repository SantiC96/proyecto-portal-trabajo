"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirEmpresa } from "@/lib/auth";
import { logError } from "@/lib/logger";
import {
  err,
  errCampo,
  errConRef,
  fromSupabaseError,
  ok,
  okMsg,
  type Resultado,
  type ResultadoError,
} from "@/lib/resultado";
import {
  esUuid,
  validarBorradorRecibido,
  validarOfertaRecibida,
  type OfertaData,
  type OfertaValidada,
} from "@/lib/validaciones";
import { programarEnvioEmails } from "@/lib/emails/cola";
import { DIAS_RESTAURACION_OFERTA } from "@/lib/oferta-estados";

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

function errorDeValidacion(validacion: { mensaje: string; campo?: string }): ResultadoError {
  return validacion.campo
    ? errCampo(validacion.campo, validacion.mensaje)
    : err("DATOS_INVALIDOS", validacion.mensaje);
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
  if (!validacion.ok) return errorDeValidacion(validacion);

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

  programarEnvioEmails();
  revalidatePath("/empresa/ofertas");
  revalidatePath("/ofertas");
  return okMsg("Oferta enviada a revisión.");
}

export async function editarOferta(id: string, datos: OfertaData): Promise<Resultado<void>> {
  const empresaResult = await getEmpresaAprobada();
  if (!empresaResult.ok) return empresaResult;

  if (!esUuid(id)) return err("NO_ENCONTRADO", "No se encontró la oferta o no tenés permiso para editarla.");

  const validacion = validarOfertaRecibida(datos);
  if (!validacion.ok) return errorDeValidacion(validacion);

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

  programarEnvioEmails();
  revalidatePath("/empresa/ofertas");
  revalidatePath(`/empresa/ofertas/${id}/editar`);
  revalidatePath("/ofertas");
  return okMsg("Oferta guardada. Volvió a revisión de la Oficina de Empleo.");
}

function revalidarMisOfertas(id?: string) {
  revalidatePath("/empresa/ofertas");
  revalidatePath("/empresa");
  if (id) {
    revalidatePath(`/empresa/ofertas/${id}`);
    revalidatePath(`/empresa/ofertas/${id}/editar`);
  }
}

/** Errores de las funciones de la base: P0001/42501 traen un mensaje para el usuario. */
function errorDeRpc(contexto: string, error: { code?: string; message: string }, ofertaId: string | null, mensaje: string) {
  if (error.code === "23505") {
    return err("CONFLICTO", "Este borrador ya se guardó. Lo vas a encontrar en tu listado de ofertas.");
  }
  if (error.code === "P0001" || error.code === "42501") return fromSupabaseError(error);
  const ref = logError(contexto, error, { ofertaId });
  return errConRef("ERROR_INTERNO", mensaje, ref);
}

/**
 * El generador de tipos de Supabase marca todos los parámetros de las
 * funciones como obligatorios y no nulos, aunque la función acepte NULL.
 * Este cast se aplica a un solo argumento cuya función SQL sí acepta NULL;
 * el resto del objeto sigue tipado.
 */
function argumentoNulable<T>(valor: T | null): T {
  return valor as T;
}

/**
 * Guarda un borrador (migration_051): sin `ofertaId` lo crea con la clave de
 * envío del formulario; con `ofertaId` actualiza un borrador propio. Solo
 * exige el título.
 */
export async function guardarBorrador(
  datos: OfertaData,
  claveEnvio: string,
  ofertaId?: string,
): Promise<Resultado<{ id: string }>> {
  const empresaResult = await getEmpresaAprobada();
  if (!empresaResult.ok) return empresaResult;

  if (!esUuid(claveEnvio) || (ofertaId !== undefined && !esUuid(ofertaId))) return err("DATOS_INVALIDOS");
  const validacion = validarBorradorRecibido(datos);
  if (!validacion.ok) return errorDeValidacion(validacion);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("guardar_borrador_oferta", {
    // NULL crea un borrador nuevo (guardar_borrador_oferta, migration_051).
    p_oferta_id: argumentoNulable(ofertaId ?? null),
    ...contenidoOferta(validacion.oferta),
    p_clave_envio: claveEnvio,
  });

  if (error || !data) {
    return errorDeRpc("guardarBorrador", error ?? { message: "sin id" }, ofertaId ?? null,
      "No se pudo guardar el borrador. Intentá de nuevo.");
  }

  revalidarMisOfertas(ofertaId);
  return ok({ id: data });
}

/**
 * Guarda el contenido del formulario y manda el borrador a revisión en una
 * sola transacción. La base vuelve a exigir los obligatorios (migration_051).
 */
export async function enviarBorrador(ofertaId: string, datos: OfertaData, claveEnvio: string): Promise<Resultado<void>> {
  const empresaResult = await getEmpresaAprobada();
  if (!empresaResult.ok) return empresaResult;

  if (!esUuid(ofertaId) || !esUuid(claveEnvio)) return err("DATOS_INVALIDOS");
  const validacion = validarOfertaRecibida(datos);
  if (!validacion.ok) return errorDeValidacion(validacion);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("guardar_borrador_oferta", {
    p_oferta_id: ofertaId,
    ...contenidoOferta(validacion.oferta),
    p_clave_envio: claveEnvio,
    p_enviar: true,
  });

  if (error) return errorDeRpc("enviarBorrador", error, ofertaId, "No se pudo enviar la oferta. Intentá de nuevo.");

  programarEnvioEmails();
  revalidarMisOfertas(ofertaId);
  return okMsg("Oferta enviada a revisión.");
}

/**
 * Borrado lógico (migration_051): la oferta pasa a la pestaña "Eliminadas" y
 * se puede restaurar durante DIAS_RESTAURACION_OFERTA días. La base controla
 * propiedad, estado y que no tenga postulaciones.
 */
export async function eliminarOferta(id: string): Promise<Resultado<void>> {
  const empresaResult = await getEmpresaAprobada();
  if (!empresaResult.ok) return empresaResult;
  if (!esUuid(id)) return err("NO_ENCONTRADO", "No se encontró la oferta o no tenés permiso para eliminarla.");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("eliminar_oferta", { p_oferta_id: id });
  if (error) return errorDeRpc("eliminarOferta", error, id, "No se pudo eliminar la oferta. Intentá de nuevo.");

  revalidarMisOfertas(id);
  return okMsg(`Oferta eliminada. Podés restaurarla durante ${DIAS_RESTAURACION_OFERTA} días desde la pestaña Eliminadas.`);
}

export async function restaurarOferta(id: string): Promise<Resultado<void>> {
  const empresaResult = await getEmpresaAprobada();
  if (!empresaResult.ok) return empresaResult;
  if (!esUuid(id)) return err("NO_ENCONTRADO", "No se encontró la oferta o no tenés permiso para restaurarla.");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("restaurar_oferta", { p_oferta_id: id });
  if (error) return errorDeRpc("restaurarOferta", error, id, "No se pudo restaurar la oferta. Intentá de nuevo.");

  programarEnvioEmails();
  revalidarMisOfertas(id);
  return okMsg("Oferta restaurada.");
}

/**
 * Retira una oferta pendiente de revisión, publicada (también vencida) o
 * rechazada con postulaciones: queda cerrada y la base cierra en la misma
 * transacción las postulaciones y derivaciones abiertas con el motivo "La
 * empresa retiró la oferta", sin que cuente como rechazo, y avisa a los
 * postulantes y a la oficina (retirar_oferta, migration_051 y 052).
 */
export async function retirarOferta(id: string): Promise<Resultado<void>> {
  const empresaResult = await getEmpresaAprobada();
  if (!empresaResult.ok) return empresaResult;
  if (!esUuid(id)) return err("NO_ENCONTRADO", "No se encontró la oferta o no tenés permiso para retirarla.");

  const supabase = await createSupabaseServerClient();
  const { data: cerrados, error } = await supabase.rpc("retirar_oferta", { p_oferta_id: id });
  if (error) return errorDeRpc("retirarOferta", error, id, "No se pudo retirar la oferta. Intentá de nuevo.");

  programarEnvioEmails();
  revalidarMisOfertas(id);
  revalidatePath("/ofertas");
  revalidatePath(`/ofertas/${id}`);
  revalidatePath("/");
  return okMsg(
    !cerrados
      ? "Oferta retirada."
      : `Oferta retirada. Se ${cerrados === 1 ? "cerró 1 proceso" : `cerraron ${cerrados} procesos`} en curso y les avisamos a los candidatos.`,
  );
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
