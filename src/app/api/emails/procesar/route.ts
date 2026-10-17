import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { procesarColaEmails } from "@/lib/emails/cola";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vercel Cron manda "Authorization: Bearer $CRON_SECRET". Se comparan los
// hashes: misma longitud siempre, así timingSafeEqual no revela el largo.
function autorizado(encabezado: string | null): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || !encabezado) return false;
  const esperado = createHash("sha256").update(`Bearer ${secreto}`).digest();
  const recibido = createHash("sha256").update(encabezado).digest();
  return timingSafeEqual(esperado, recibido);
}

export async function GET(request: NextRequest) {
  if (!autorizado(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { enviados, fallidos } = await procesarColaEmails(50);
  return NextResponse.json({ enviados, fallidos });
}
