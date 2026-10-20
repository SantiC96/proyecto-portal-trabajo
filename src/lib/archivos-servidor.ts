import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logError } from "@/lib/logger";

/** Buckets privados del portal. Todas las subidas van por el servidor (migration_054). */
export type BucketArchivos = "avatares" | "cvs" | "comprobantes";

/**
 * Compensación cuando el archivo se subió pero no se pudo registrar en
 * archivos_usuario: borra el archivo para no dejarlo huérfano.
 *
 * Antes de borrar se confirma que ninguna fila apunte a esa ruta: si el
 * registro llegó a guardarse y solo se perdió la respuesta, borrar el archivo
 * dejaría un registro activo sin archivo. Si no se puede confirmar, el archivo
 * queda (huérfano, inofensivo) y se registra en el log.
 */
export async function descartarArchivoSubido(
  bucket: BucketArchivos,
  ruta: string,
  contexto: string,
): Promise<void> {
  const { data: registros, error: errorConsulta } = await supabaseAdmin
    .from("archivos_usuario")
    .select("id")
    .eq("ruta", ruta)
    .limit(1);

  if (errorConsulta) {
    logError(`${contexto}:compensacion`, errorConsulta, { bucket, ruta });
    return;
  }
  if (registros.length > 0) return;

  const { error: errorBorrado } = await supabaseAdmin.storage.from(bucket).remove([ruta]);
  if (errorBorrado) logError(`${contexto}:compensacion`, errorBorrado, { bucket, ruta });
}
