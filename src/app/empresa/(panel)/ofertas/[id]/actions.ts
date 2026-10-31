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
  okMsg,
  type Resultado,
  type ResultadoError,
} from "@/lib/resultado";
import { esUuid, LARGO_MAXIMO, MENSAJE_OBLIGATORIO, validarTextoOpcional } from "@/lib/validaciones";
import {
  normalizarDatosEntrevista,
  validarDatosEntrevista,
  type ModalidadEntrevista,
} from "@/lib/entrevistas";
import { programarEnvioEmails } from "@/lib/emails/cola";

/** Lo que manda el formulario de la entrevista (migration_064). */
type DatosEntrevistaEmpresa = {
  fechaHoraISO: string;
  modalidad: ModalidadEntrevista;
  lugar: string;
  link: string;
};

// Los campos del error son los del formulario: fechaHora, modalidad, lugar y link.
function validarEntrevista(datos: DatosEntrevistaEmpresa): ResultadoError | null {
  if (typeof datos !== "object" || datos === null) return err("DATOS_INVALIDOS");
  const error = validarDatosEntrevista(datos);
  return error ? errCampo(error.campo, error.mensaje) : null;
}

/** Columnas de la entrevista: presencial con lugar y sin link, online con link y sin lugar. */
function columnasEntrevista(datos: DatosEntrevistaEmpresa) {
  const { lugar, link } = normalizarDatosEntrevista(datos.modalidad, datos.lugar, datos.link);
  return {
    estado_empresa: "en_proceso" as const,
    fecha_entrevista: datos.fechaHoraISO,
    modalidad_entrevista: datos.modalidad,
    lugar_entrevista: lugar,
    link_entrevista: link,
  };
}

function revalidarOferta(ofertaId: string) {
  revalidatePath(`/empresa/ofertas/${ofertaId}`);
  revalidatePath("/empresa/ofertas");
  revalidatePath("/empresa");
}

export async function coordinarEntrevista(
  derivacionId: string,
  ofertaId: string,
  datos: DatosEntrevistaEmpresa
): Promise<Resultado<void>> {
  const auth = await requerirEmpresa({ aprobada: true });
  if (!auth.ok) return auth;

  if (!esUuid(derivacionId) || !esUuid(ofertaId)) return err("DATOS_INVALIDOS");

  const errEntrevista = validarEntrevista(datos);
  if (errEntrevista) return errEntrevista;

  // El trigger derivaciones_empresa_update (028, última versión en la 064)
  // valida la transición y los datos; sus mensajes (P0001) llegan al usuario,
  // por ejemplo si otra pestaña ya cerró el proceso.
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("derivaciones")
    .update(columnasEntrevista(datos))
    .eq("id", derivacionId);

  if (error) {
    if (error.code === "P0001") return fromSupabaseError(error);
    const ref = logError("coordinarEntrevista", error, { derivacionId });
    return errConRef("ERROR_INTERNO", "No se pudo coordinar la entrevista.", ref);
  }

  programarEnvioEmails();
  revalidarOferta(ofertaId);
  return okMsg("Entrevista coordinada. Le avisamos al candidato.");
}

export async function reprogramarEntrevista(
  derivacionId: string,
  ofertaId: string,
  datos: DatosEntrevistaEmpresa
): Promise<Resultado<void>> {
  const auth = await requerirEmpresa({ aprobada: true });
  if (!auth.ok) return auth;

  if (!esUuid(derivacionId) || !esUuid(ofertaId)) return err("DATOS_INVALIDOS");

  const errEntrevista = validarEntrevista(datos);
  if (errEntrevista) return errEntrevista;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("derivaciones")
    .update(columnasEntrevista(datos))
    .eq("id", derivacionId);

  if (error) {
    if (error.code === "P0001") return fromSupabaseError(error);
    const ref = logError("reprogramarEntrevista", error, { derivacionId });
    return errConRef("ERROR_INTERNO", "No se pudo reprogramar la entrevista.", ref);
  }

  programarEnvioEmails();
  revalidarOferta(ofertaId);
  return okMsg("Entrevista reprogramada. Le avisamos al candidato.");
}

export async function seleccionarCandidato(
  derivacionId: string,
  ofertaId: string
): Promise<Resultado<{ ofertaCerrada: boolean }>> {
  const auth = await requerirEmpresa({ aprobada: true });
  if (!auth.ok) return auth;

  if (!esUuid(derivacionId) || !esUuid(ofertaId)) return err("DATOS_INVALIDOS");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("derivaciones")
    .update({ estado_empresa: "contratado" })
    .eq("id", derivacionId);

  if (error) {
    if (error.code === "P0001") return fromSupabaseError(error);
    const ref = logError("seleccionarCandidato", error, { derivacionId });
    return errConRef("ERROR_INTERNO", "No se pudo seleccionar al candidato.", ref);
  }

  // Detect if the offer auto-closed due to vacancies being filled
  const { data: ofertaData } = await supabase
    .from("ofertas")
    .select("estado")
    .eq("id", ofertaId)
    .maybeSingle();

  programarEnvioEmails();
  revalidarOferta(ofertaId);
  return { ok: true, data: { ofertaCerrada: ofertaData?.estado === "cerrada" }, mensaje: "Candidato seleccionado." };
}

export async function rechazarCandidato(
  derivacionId: string,
  ofertaId: string,
  motivo: string
): Promise<Resultado<void>> {
  const auth = await requerirEmpresa({ aprobada: true });
  if (!auth.ok) return auth;

  if (!esUuid(derivacionId) || !esUuid(ofertaId)) return err("DATOS_INVALIDOS");

  if (typeof motivo !== "string" || !motivo.trim())
    return errCampo("motivo", MENSAJE_OBLIGATORIO);
  const errMotivo = validarTextoOpcional(motivo, LARGO_MAXIMO.motivo);
  if (errMotivo) return errCampo("motivo", errMotivo);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("derivaciones")
    .update({ estado_empresa: "rechazado", nota_empresa: motivo.trim() })
    .eq("id", derivacionId);

  if (error) {
    if (error.code === "P0001") return fromSupabaseError(error);
    const ref = logError("rechazarCandidato", error, { derivacionId });
    return errConRef("ERROR_INTERNO", "No se pudo registrar la decisión.", ref);
  }

  programarEnvioEmails();
  revalidarOferta(ofertaId);
  return okMsg("Decisión guardada.");
}
