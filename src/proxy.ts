import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  INACTIVITY_TIMEOUT_MS,
  LAST_ACTIVITY_COOKIE,
  sessionCookieOptions,
} from "@/lib/session-config";

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
            supabaseResponse.cookies.set(name, value, sessionCookieOptions(options))
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

  // Auth exchange routes must not trigger the inactivity check mid-flow
  const INACTIVITY_EXEMPT_PATHS = ["/auth/callback", "/auth/nueva-contrasena"];
  const isInactivityExempt =
    isServerAction ||
    INACTIVITY_EXEMPT_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );

  // ── Inactivity timeout ────────────────────────────────────────────────────
  if (user && !isInactivityExempt) {
    const lastActivityRaw = request.cookies.get(LAST_ACTIVITY_COOKIE)?.value;
    const now = Date.now();

    if (lastActivityRaw) {
      const lastActivity = parseInt(lastActivityRaw, 10);
      // isNaN guard: corrupted cookie value → reset instead of forcing logout
      const isExpired =
        !isNaN(lastActivity) && now - lastActivity > INACTIVITY_TIMEOUT_MS;

      if (isExpired) {
        // signOut updates supabaseResponse with auth cookie deletions (maxAge: 0)
        await supabase.auth.signOut();

        const timeoutUrl = request.nextUrl.clone();
        timeoutUrl.pathname = "/auth/login";
        timeoutUrl.searchParams.set("motivo", "inactividad");
        const timeoutResponse = NextResponse.redirect(timeoutUrl);

        // Transfer auth cookie deletions to the redirect response.
        // Destructure name/value to avoid passing 'name' inside the options object.
        supabaseResponse.cookies.getAll().forEach(({ name, value, ...opts }) => {
          timeoutResponse.cookies.set(name, value, opts);
        });

        timeoutResponse.cookies.set(LAST_ACTIVITY_COOKIE, "", {
          maxAge: 0,
          path: "/",
          httpOnly: true,
        });

        return timeoutResponse;
      }
    }

    // Active session: stamp current time (session cookie — no maxAge/expires)
    supabaseResponse.cookies.set(LAST_ACTIVITY_COOKIE, String(now), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

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
