"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirRol, requerirRolPagina, type Rol } from "@/lib/auth";
import { logError } from "@/lib/logger";
import {
  esLinkInterno,
  marcarLeidasHasta,
  obtenerResumenNotificaciones,
  rutaNotificaciones,
  type ResumenNotificaciones,
} from "@/lib/notificaciones";
import { err, ok, type Resultado } from "@/lib/resultado";
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

/**
 * Al abrir la campanita: devuelve las notificaciones tal como estaban (las
 * nuevas siguen sin leer, para resaltarlas mientras el panel está abierto) y
 * marca como leídas todas hasta la más nueva. Un fallo del marcado no se
 * informa: se registra y se reintenta al volver a abrir.
 */
export async function abrirCampanaNotificaciones(): Promise<Resultado<ResumenNotificaciones>> {
  const auth = await requerirRol(ROLES);
  if (!auth.ok) return auth;

  const resumen = await obtenerResumenNotificaciones(auth.usuario.id);
  const masNueva = resumen.ultimas[0]?.created_at;
  if (resumen.noLeidas > 0 && masNueva) await marcarLeidasHasta(auth.usuario.id, masNueva);
  return ok(resumen);
}

/**
 * Al entrar al listado de notificaciones: marca como leídas las creadas hasta
 * `hasta` (la más nueva sin leer cuando se cargó la página). Sin
 * revalidatePath: la página sigue resaltando las que eran nuevas.
 */
export async function marcarNotificacionesVistas(hasta: string): Promise<Resultado<void>> {
  const auth = await requerirRol(ROLES);
  if (!auth.ok) return auth;
  if (typeof hasta !== "string" || Number.isNaN(Date.parse(hasta))) return err("DATOS_INVALIDOS");

  const marcadas = await marcarLeidasHasta(auth.usuario.id, hasta);
  return marcadas ? ok() : err("ERROR_INTERNO");
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
