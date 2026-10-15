"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import {
  esLinkInterno,
  obtenerResumenNotificaciones,
  type ResumenNotificaciones,
} from "@/lib/notificaciones";
import { err, errConRef, ok, okMsg, type Resultado } from "@/lib/resultado";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RUTA_LISTADO = "/admin/notificaciones";

async function usuarioActual(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function revalidarNotificaciones() {
  // La campanita vive en la navbar del layout raíz.
  revalidatePath("/", "layout");
  revalidatePath(RUTA_LISTADO);
}

/** Datos frescos para la campanita al abrirla. */
export async function obtenerNotificacionesRecientes(): Promise<
  Resultado<ResumenNotificaciones>
> {
  const usuarioId = await usuarioActual();
  if (!usuarioId) return err("NO_AUTENTICADO");
  return ok(await obtenerResumenNotificaciones(usuarioId));
}

export async function marcarNotificacionLeida(id: string): Promise<Resultado<void>> {
  const usuarioId = await usuarioActual();
  if (!usuarioId) return err("NO_AUTENTICADO");
  if (!UUID.test(id)) return err("DATOS_INVALIDOS");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("notificaciones")
    .update({ leida_en: new Date().toISOString() })
    .eq("id", id)
    .eq("usuario_id", usuarioId)
    .is("leida_en", null);

  if (error) {
    const ref = logError("marcarNotificacionLeida", error, { id });
    return errConRef("ERROR_INTERNO", "No se pudo marcar la notificación como leída.", ref);
  }

  revalidarNotificaciones();
  return okMsg("Notificación marcada como leída.");
}

export async function marcarTodasLeidas(): Promise<Resultado<void>> {
  const usuarioId = await usuarioActual();
  if (!usuarioId) return err("NO_AUTENTICADO");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("notificaciones")
    .update({ leida_en: new Date().toISOString() })
    .eq("usuario_id", usuarioId)
    .is("leida_en", null);

  if (error) {
    const ref = logError("marcarTodasLeidas", error);
    return errConRef("ERROR_INTERNO", "No se pudieron marcar las notificaciones como leídas.", ref);
  }

  revalidarNotificaciones();
  return okMsg("Marcaste todas las notificaciones como leídas.");
}

/** Abre el link de una notificación y la marca como leída. */
export async function abrirNotificacion(id: string): Promise<void> {
  const usuarioId = await usuarioActual();
  if (!usuarioId) redirect("/auth/login");
  if (!UUID.test(id)) redirect(RUTA_LISTADO);

  const supabase = await createSupabaseServerClient();
  const { data: notificacion } = await supabase
    .from("notificaciones")
    .select("link, leida_en")
    .eq("id", id)
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  if (!notificacion) redirect(RUTA_LISTADO);

  if (!notificacion.leida_en) {
    const { error } = await supabase
      .from("notificaciones")
      .update({ leida_en: new Date().toISOString() })
      .eq("id", id)
      .eq("usuario_id", usuarioId);
    if (error) logError("abrirNotificacion", error, { id });
    revalidarNotificaciones();
  }

  redirect(esLinkInterno(notificacion.link) ? notificacion.link : RUTA_LISTADO);
}
