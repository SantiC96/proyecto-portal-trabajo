import { createSupabaseServerClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { programarEnvioEmails } from "@/lib/emails/cola";
import { LAST_ACTIVITY_COOKIE, lastActivityCookieOptions } from "@/lib/session-config";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=confirmacion`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/auth/login?error=confirmacion`);
  }

  // El proxy no controla esta ruta: la cookie de actividad se crea acá para que
  // el redirect siguiente no se tome como una sesión de un navegador anterior.
  const cookieStore = await cookies();
  cookieStore.set(LAST_ACTIVITY_COOKIE, String(Date.now()), lastActivityCookieOptions());

  // Confirmar el email de una empresa genera el aviso a la oficina (042).
  programarEnvioEmails();
  return NextResponse.redirect(`${origin}/`);
}
