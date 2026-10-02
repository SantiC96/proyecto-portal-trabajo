import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // request.cookies.set only accepts [name, value] without options
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the session and validates the token server-side
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/ofertas") ||
    pathname.startsWith("/auth");

  // Routes only accessible to guests — logged-in users are bounced to home
  const AUTH_GUEST_ONLY = [
    "/auth/login",
    "/auth/registro",
    "/auth/recuperar-contrasena",
    "/auth/reset-enviado",
  ];
  const isGuestOnly = AUTH_GUEST_ONLY.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  // Don't redirect Server Action POSTs — a redirect there breaks the action
  const isServerAction = request.headers.get("next-action") !== null;

  if (user && isGuestOnly && !isServerAction) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
