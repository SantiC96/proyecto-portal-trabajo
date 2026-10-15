import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";

/** Fila de public.notificaciones (migration_038). */
export type Notificacion = {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  link: string | null;
  leida_en: string | null;
  created_at: string;
};

export type ResumenNotificaciones = {
  noLeidas: number;
  ultimas: Notificacion[];
};

/** Cantidad de avisos que muestra la campanita. */
export const NOTIFICACIONES_EN_CAMPANA = 5;

export const COLUMNAS_NOTIFICACION =
  "id, tipo, titulo, mensaje, link, leida_en, created_at";

/**
 * Solo rutas internas ("/admin/..."). La base ya lo exige con un CHECK; se
 * vuelve a validar antes de redirigir.
 */
export function esLinkInterno(link: string | null | undefined): link is string {
  return typeof link === "string" && link.startsWith("/") && !link.startsWith("//");
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
    ultimas: (ultimas.data ?? []) as Notificacion[],
  };
}
