"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirRol, requerirRolPagina } from "@/lib/auth";
import { logError } from "@/lib/logger";
import {
  esLinkInterno,
  obtenerResumenNotificaciones,
  type ResumenNotificaciones,
} from "@/lib/notificaciones";
import { err, errConRef, ok, okMsg, type Resultado } from "@/lib/resultado";
import { esUuid } from "@/lib/validaciones";

const RUTA_LISTADO = "/admin/notificaciones";

function revalidarNotificaciones() {
  // La campanita vive en la navbar del layout raíz.
  revalidatePath("/", "layout");
  revalidatePath(RUTA_LISTADO);
}

/** Datos frescos para la campanita al abrirla. */
export async function obtenerNotificacionesRecientes(): Promise<
  Resultado<ResumenNotificaciones>
> {
  const auth = await requerirRol("municipalidad");
  if (!auth.ok) return auth;
  return ok(await obtenerResumenNotificaciones(auth.usuario.id));
}

export async function marcarNotificacionLeida(id: string): Promise<Resultado<void>> {
  const auth = await requerirRol("municipalidad");
  if (!auth.ok) return auth;
  const usuarioId = auth.usuario.id;
  if (!esUuid(id)) return err("DATOS_INVALIDOS");

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
  const auth = await requerirRol("municipalidad");
  if (!auth.ok) return auth;
  const usuarioId = auth.usuario.id;

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
  const { id: usuarioId } = await requerirRolPagina("municipalidad");
  if (!esUuid(id)) redirect(RUTA_LISTADO);

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
