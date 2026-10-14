"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { err, errConRef, ok, type Resultado, type ResultadoError } from "@/lib/resultado";

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

function revalidarOfertas(ofertaId: string) {
  revalidatePath("/admin/ofertas");
  revalidatePath(`/admin/ofertas/${ofertaId}`);
  revalidatePath("/admin");
  revalidatePath("/ofertas");
  // Revalida postulaciones para que FichaAcciones vea el nuevo estado de la oferta
  revalidatePath("/admin/postulaciones");
}

export async function aprobarOferta(ofertaId: string): Promise<Resultado<void>> {
  const auth = await verificarMunicipalidad();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();

  const { data: oferta } = await supabase
    .from("ofertas")
    .select("id, estado, publicado_en")
    .eq("id", ofertaId)
    .single();

  if (!oferta) return err("NO_ENCONTRADO", "Oferta no encontrada.");
  if (oferta.estado !== "pendiente_aprobacion") {
    return err("ESTADO_INVALIDO", "Solo se puede aprobar una oferta pendiente de revisión.");
  }

  const ahora = new Date().toISOString();

  const { data, error } = await supabase
    .from("ofertas")
    .update({
      estado: "activa",
      // publicado_en solo se fija la primera vez; en re-aprobaciones se conserva.
      publicado_en: (oferta as { publicado_en: string | null }).publicado_en ?? ahora,
      revisado_por: auth.userId,
      revisado_en: ahora,
      updated_at: ahora,
    })
    .eq("id", ofertaId)
    .select("id");

  if (error) {
    const ref = logError("aprobarOferta", error, { ofertaId });
    return errConRef("ERROR_INTERNO", "No se pudo aprobar la oferta. Intentá de nuevo.", ref);
  }
  if (!data || data.length === 0) {
    const ref = logError("aprobarOferta:noRow", null, { ofertaId });
    return errConRef("ERROR_INTERNO", "No se pudo completar la acción.", ref);
  }

  revalidarOfertas(ofertaId);
  return ok();
}

export async function rechazarOferta(
  ofertaId: string,
  motivo: string
): Promise<Resultado<void>> {
  const auth = await verificarMunicipalidad();
  if (!auth.ok) return auth;

  const motivoTrimmed = motivo.trim();
  if (!motivoTrimmed) return err("DATOS_INVALIDOS", "El motivo del rechazo es obligatorio.");

  const supabase = await createSupabaseServerClient();

  const { data: oferta } = await supabase
    .from("ofertas")
    .select("id, estado")
    .eq("id", ofertaId)
    .single();

  if (!oferta) return err("NO_ENCONTRADO", "Oferta no encontrada.");
  if (oferta.estado !== "pendiente_aprobacion") {
    return err("ESTADO_INVALIDO", "Solo se puede rechazar una oferta pendiente de revisión.");
  }

  const ahora = new Date().toISOString();

  const { data, error } = await supabase
    .from("ofertas")
    .update({
      estado: "rechazada",
      motivo_rechazo: motivoTrimmed,
      revisado_por: auth.userId,
      revisado_en: ahora,
      updated_at: ahora,
    })
    .eq("id", ofertaId)
    .select("id");

  if (error) {
    const ref = logError("rechazarOferta", error, { ofertaId });
    return errConRef("ERROR_INTERNO", "No se pudo rechazar la oferta. Intentá de nuevo.", ref);
  }
  if (!data || data.length === 0) {
    const ref = logError("rechazarOferta:noRow", null, { ofertaId });
    return errConRef("ERROR_INTERNO", "No se pudo completar la acción.", ref);
  }

  revalidarOfertas(ofertaId);
  return ok();
}
