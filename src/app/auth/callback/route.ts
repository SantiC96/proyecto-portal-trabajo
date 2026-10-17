import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse, type NextRequest } from "next/server";
import { programarEnvioEmails } from "@/lib/emails/cola";

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

  // Confirmar el email de una empresa genera el aviso a la oficina (042).
  programarEnvioEmails();
  return NextResponse.redirect(`${origin}/`);
}
