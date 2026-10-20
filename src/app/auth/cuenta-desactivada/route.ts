import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { cuentaDesactivada, obtenerUsuarioActual } from "@/lib/auth";
import { LAST_ACTIVITY_COOKIE } from "@/lib/session-config";

// requerirUsuarioPagina() redirige acá a una cuenta desactivada con la sesión
// abierta: los Server Components no pueden borrar cookies, un Route Handler sí.
// Solo cierra la sesión si la cuenta está desactivada, así un link a esta ruta
// no saca a nadie más.
export async function GET(request: NextRequest) {
  const usuario = await obtenerUsuarioActual();

  if (!usuario || !cuentaDesactivada(usuario)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
  (await cookies()).delete(LAST_ACTIVITY_COOKIE);

  return NextResponse.redirect(
    new URL("/auth/login?motivo=cuenta-desactivada", request.url),
  );
}
