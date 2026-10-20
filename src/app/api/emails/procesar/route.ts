import { NextResponse, type NextRequest } from "next/server";
import { procesarColaEmails } from "@/lib/emails/cola";
import { cronAutorizado } from "@/lib/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!cronAutorizado(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { enviados, fallidos } = await procesarColaEmails(50);
  return NextResponse.json({ enviados, fallidos });
}
