import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/recuperar-contrasena?error=link-vencido`
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/recuperar-contrasena?error=link-vencido`
    );
  }

  return NextResponse.redirect(`${origin}/auth/nueva-contrasena/formulario`);
}
