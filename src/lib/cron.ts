import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Valida el encabezado de Vercel Cron ("Authorization: Bearer $CRON_SECRET").
 * Se comparan los hashes: misma longitud siempre, así timingSafeEqual no
 * revela el largo. Sin CRON_SECRET configurado, nadie está autorizado.
 */
export function cronAutorizado(request: Request): boolean {
  const secreto = process.env.CRON_SECRET;
  const encabezado = request.headers.get("authorization");
  if (!secreto || !encabezado) return false;
  const esperado = createHash("sha256").update(`Bearer ${secreto}`).digest();
  const recibido = createHash("sha256").update(encabezado).digest();
  return timingSafeEqual(esperado, recibido);
}
