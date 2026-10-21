import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { DIAS_AVISO_VENCIMIENTO } from "@/lib/ofertas-vencimiento";
import { programarEnvioEmails } from "@/lib/emails/cola";
import { esRutaInterna } from "@/lib/redirect";
import type { Rol, Tabla } from "@/types/db";

/** Fila de public.notificaciones (migration_038). */
export type Notificacion = Pick<
  Tabla<"notificaciones">,
  "id" | "tipo" | "titulo" | "mensaje" | "link" | "leida_en" | "created_at"
>;

export type ResumenNotificaciones = {
  noLeidas: number;
  ultimas: Notificacion[];
};

/** Cantidad de avisos que muestra la campanita. */
export const NOTIFICACIONES_EN_CAMPANA = 5;

export const COLUMNAS_NOTIFICACION =
  "id, tipo, titulo, mensaje, link, leida_en, created_at";

/** Listado completo de notificaciones dentro del panel de cada rol. */
export function rutaNotificaciones(rol: Rol): string {
  if (rol === "empresa") return "/empresa/notificaciones";
  if (rol === "municipalidad") return "/admin/notificaciones";
  return "/notificaciones";
}

/**
 * Solo rutas internas ("/admin/..."). La base ya lo exige con un CHECK; se
 * vuelve a validar antes de redirigir.
 */
export function esLinkInterno(link: string | null | undefined): link is string {
  return esRutaInterna(link);
}

/** No leídas y últimos avisos del usuario de la sesión (RLS: solo los suyos). */
export async function obtenerResumenNotificaciones(
  usuarioId: string,
): Promise<ResumenNotificaciones> {
  const supabase = await createSupabaseServerClient();
  const [conteo, ultimas] = await Promise.all([
    supabase
      .from("notificaciones")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", usuarioId)
      .is("leida_en", null),
    supabase
      .from("notificaciones")
      .select(COLUMNAS_NOTIFICACION)
      .eq("usuario_id", usuarioId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(NOTIFICACIONES_EN_CAMPANA),
  ]);

  if (conteo.error) logError("notificaciones_conteo", conteo.error);
  if (ultimas.error) logError("notificaciones_ultimas", ultimas.error);

  return {
    noLeidas: conteo.count ?? 0,
    ultimas: ultimas.data ?? [],
  };
}

/**
 * Marca como leídas las notificaciones del usuario creadas hasta `hasta`
 * (fecha de la más nueva que vio). Las que llegan después siguen nuevas. Si
 * falla, se registra y devuelve false: se reintenta la próxima vez que abra
 * la campanita o el listado, sin mostrarle un error.
 */
export async function marcarLeidasHasta(usuarioId: string, hasta: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("notificaciones")
    .update({ leida_en: new Date().toISOString() })
    .eq("usuario_id", usuarioId)
    .is("leida_en", null)
    .lte("created_at", hasta);

  if (error) {
    logError("marcarLeidasHasta", error);
    return false;
  }
  return true;
}

/**
 * Crea los avisos de "por vencer" y "vencida" que le falten a la empresa del
 * usuario actual (migration_041; no hay cron). Si falla, se registra y la
 * página sigue cargando.
 */
export async function generarAvisosVencimientoEmpresa(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: creados, error } = await supabase.rpc("generar_avisos_vencimiento_empresa", {
    p_dias_aviso: DIAS_AVISO_VENCIMIENTO,
  });
  if (error) logError("generarAvisosVencimientoEmpresa", error);
  else if (creados > 0) programarEnvioEmails();
}
