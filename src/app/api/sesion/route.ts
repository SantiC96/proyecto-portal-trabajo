import { NextResponse } from "next/server";
import { obtenerSesionActual } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export async function GET() {
  const sesion = await obtenerSesionActual();
  if (!sesion) {
    return NextResponse.json({ activa: false });
  }
  return NextResponse.json({
    activa: true,
    nombre: sesion.nombre,
    rol: sesion.rol,
    profileHref: sesion.profileHref,
  });
}
