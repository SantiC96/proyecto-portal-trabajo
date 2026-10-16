"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirRol, requerirRolPagina, type Rol } from "@/lib/auth";
import { logError } from "@/lib/logger";
import {
  esLinkInterno,
  obtenerResumenNotificaciones,
  rutaNotificaciones,
  type ResumenNotificaciones,
} from "@/lib/notificaciones";
import { err, errConRef, ok, okMsg, type Resultado } from "@/lib/resultado";
import { esUuid } from "@/lib/validaciones";

// Acciones compartidas por la campanita y los listados de los tres roles. Cada
// una filtra por el usuario de la sesión (y RLS solo deja ver y marcar las
// propias).
const ROLES: readonly Rol[] = ["postulante", "empresa", "municipalidad"];

/** Datos frescos para la campanita: al montarla, al navegar y al abrirla. */
export async function obtenerNotificacionesRecientes(): Promise<
  Resultado<ResumenNotificaciones>
> {
  const auth = await requerirRol(ROLES);
  if (!auth.ok) return auth;
  return ok(await obtenerResumenNotificaciones(auth.usuario.id));
}

export async function marcarNotificacionLeida(id: string): Promise<Resultado<void>> {
  const auth = await requerirRol(ROLES);
  if (!auth.ok) return auth;
  const { id: usuarioId, perfil } = auth.usuario;
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

  revalidatePath(rutaNotificaciones(perfil.rol));
  return okMsg("Notificación marcada como leída.");
}

export async function marcarTodasLeidas(): Promise<Resultado<void>> {
  const auth = await requerirRol(ROLES);
  if (!auth.ok) return auth;
  const { id: usuarioId, perfil } = auth.usuario;

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

  revalidatePath(rutaNotificaciones(perfil.rol));
  return okMsg("Marcaste todas las notificaciones como leídas.");
}

/** Abre el link de una notificación y la marca como leída. */
export async function abrirNotificacion(id: string): Promise<void> {
  const { id: usuarioId, perfil } = await requerirRolPagina(ROLES);
  const rutaListado = rutaNotificaciones(perfil.rol);
  if (!esUuid(id)) redirect(rutaListado);

  const supabase = await createSupabaseServerClient();
  const { data: notificacion } = await supabase
    .from("notificaciones")
    .select("link, leida_en")
    .eq("id", id)
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  if (!notificacion) redirect(rutaListado);

  if (!notificacion.leida_en) {
    const { error } = await supabase
      .from("notificaciones")
      .update({ leida_en: new Date().toISOString() })
      .eq("id", id)
      .eq("usuario_id", usuarioId);
    if (error) logError("abrirNotificacion", error, { id });
    revalidatePath(rutaListado);
  }

  redirect(esLinkInterno(notificacion.link) ? notificacion.link : rutaListado);
}
