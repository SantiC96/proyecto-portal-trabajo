import { NextResponse, type NextRequest } from "next/server";
import { cronAutorizado } from "@/lib/cron";
import { ejecutarMantenimiento } from "@/lib/mantenimiento";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cron diario (vercel.json): purga lo que ya no se puede restaurar.
export async function GET(request: NextRequest) {
  if (!cronAutorizado(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const tareas = await ejecutarMantenimiento();
  const ok = tareas.every((t) => t.ok);
  return NextResponse.json({ tareas }, { status: ok ? 200 : 500 });
}
