"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type ActionResult = { error?: string };

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

function revalidarOfertas(ofertaId: string) {
  revalidatePath("/admin/ofertas");
  revalidatePath(`/admin/ofertas/${ofertaId}`);
  revalidatePath("/admin");
  revalidatePath("/ofertas");
  // Revalida postulaciones para que FichaAcciones vea el nuevo estado de la oferta
  revalidatePath("/admin/postulaciones");
}

export async function aprobarOferta(ofertaId: string): Promise<ActionResult> {
  const auth = await verificarMunicipalidad();
  if ("error" in auth) return auth;

  const supabase = await createSupabaseServerClient();

  const { data: oferta } = await supabase
    .from("ofertas")
    .select("id, estado, publicado_en")
    .eq("id", ofertaId)
    .single();

  if (!oferta) return { error: "Oferta no encontrada." };
  if (oferta.estado !== "pendiente_aprobacion") {
    return { error: "Solo se puede aprobar una oferta pendiente de revisión." };
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
    console.error("[aprobarOferta]", error);
    return { error: "No se pudo aprobar la oferta. Intentá de nuevo." };
  }
  if (!data || data.length === 0) {
    return { error: "No se pudo completar la acción." };
  }

  revalidarOfertas(ofertaId);
  return {};
}

export async function rechazarOferta(
  ofertaId: string,
  motivo: string
): Promise<ActionResult> {
  const auth = await verificarMunicipalidad();
  if ("error" in auth) return auth;

  const motivoTrimmed = motivo.trim();
  if (!motivoTrimmed) return { error: "El motivo del rechazo es obligatorio." };

  const supabase = await createSupabaseServerClient();

  const { data: oferta } = await supabase
    .from("ofertas")
    .select("id, estado")
    .eq("id", ofertaId)
    .single();

  if (!oferta) return { error: "Oferta no encontrada." };
  if (oferta.estado !== "pendiente_aprobacion") {
    return { error: "Solo se puede rechazar una oferta pendiente de revisión." };
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
    console.error("[rechazarOferta]", error);
    return { error: "No se pudo rechazar la oferta. Intentá de nuevo." };
  }
  if (!data || data.length === 0) {
    return { error: "No se pudo completar la acción." };
  }

  revalidarOfertas(ofertaId);
  return {};
}
