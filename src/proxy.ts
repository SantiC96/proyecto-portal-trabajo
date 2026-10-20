import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { NextResponse, type NextRequest } from "next/server";
import {
  INACTIVITY_TIMEOUT_MS,
  LAST_ACTIVITY_COOKIE,
  lastActivityCookieOptions,
  sessionCookieOptions,
} from "@/lib/session-config";
import { HEADER_RUTA_ACTUAL, urlLogin } from "@/lib/redirect";

export async function proxy(request: NextRequest) {
  // Siempre se pisa: el valor que mande el cliente no se usa.
  const rutaActual = request.nextUrl.pathname + request.nextUrl.search;
  request.headers.set(HEADER_RUTA_ACTUAL, rutaActual);

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
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
    data: { user: usuarioDeCookies },
  } = await supabase.auth.getUser();
  let user = usuarioDeCookies;

  const { pathname } = request.nextUrl;
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/ofertas") ||
    pathname.startsWith("/auth") ||
    // Crons (emails y mantenimiento): sin sesión, los protege CRON_SECRET en
    // la ruta (src/lib/cron.ts).
    pathname === "/api/emails/procesar" ||
    pathname === "/api/mantenimiento/purgar";

  // Routes only accessible to guests — logged-in users are bounced to home
  const AUTH_GUEST_ONLY = [
    "/auth/recuperar-contrasena",
    "/auth/reset-enviado",
  ];
  const isGuestOnly = AUTH_GUEST_ONLY.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  // Don't redirect Server Action POSTs — a redirect there breaks the action
  const isServerAction = request.headers.get("next-action") !== null;

  // Ruta a la que se vuelve después del login. Las APIs no son una página a
  // la que volver.
  const rutaDeVuelta =
    pathname.startsWith("/api/") || isServerAction ? null : rutaActual;

  // Auth exchange routes must not trigger the inactivity check mid-flow
  const INACTIVITY_EXEMPT_PATHS = [
    "/auth/callback",
    "/auth/nueva-contrasena",
    "/auth/aceptar-invitacion",
  ];
  const isInactivityExempt =
    isServerAction ||
    INACTIVITY_EXEMPT_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );

  // ── Inactivity timeout / sesión de un navegador anterior ──────────────────
  if (user && !isInactivityExempt) {
    const lastActivityRaw = request.cookies.get(LAST_ACTIVITY_COOKIE)?.value;
    const now = Date.now();
    const lastActivity = lastActivityRaw ? parseInt(lastActivityRaw, 10) : NaN;

    // Sin cookie de actividad (es de sesión) la sesión viene de un navegador que
    // se cerró: los flujos que inician sesión la crean antes del primer request.
    const sesionAnterior = !lastActivityRaw;
    // isNaN guard: corrupted cookie value → reset instead of forcing logout
    const isExpired =
      !sesionAnterior &&
      !isNaN(lastActivity) &&
      now - lastActivity > INACTIVITY_TIMEOUT_MS;

    if (sesionAnterior || isExpired) {
      // signOut updates supabaseResponse with auth cookie deletions (maxAge: 0).
      // Por sesión anterior se cierra solo este navegador: los otros
      // dispositivos del usuario pueden tener una sesión válida.
      await supabase.auth.signOut(sesionAnterior ? { scope: "local" } : undefined);

      // Transfer auth cookie deletions to the response.
      // Destructure name/value to avoid passing 'name' inside the options object.
      const conCookiesDeCierre = (response: NextResponse) => {
        supabaseResponse.cookies.getAll().forEach(({ name, value, ...opts }) => {
          response.cookies.set(name, value, opts);
        });
        response.cookies.set(LAST_ACTIVITY_COOKIE, "", {
          maxAge: 0,
          path: "/",
          httpOnly: true,
        });
        return response;
      };

      // For the session-check API, return JSON instead of redirecting so the
      // client can handle the expired state without a full page navigation.
      if (pathname === "/api/sesion") {
        return conCookiesDeCierre(NextResponse.json({ activa: false }));
      }

      if (sesionAnterior && isPublic) {
        // Las rutas públicas se siguen mostrando, ahora como visitante. Los
        // borrados de signOut ya están en la request y en supabaseResponse.
        user = null;
      } else {
        const motivo = isExpired ? "inactividad" : "sesion-anterior";
        return conCookiesDeCierre(
          NextResponse.redirect(new URL(urlLogin(rutaDeVuelta, { motivo }), request.url))
        );
      }
    } else {
      // Active session: stamp current time (session cookie — no maxAge/expires)
      supabaseResponse.cookies.set(
        LAST_ACTIVITY_COOKIE,
        String(now),
        lastActivityCookieOptions()
      );
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  if (user && pathname === "/auth/registro" && !isServerAction) {
    const redirectTo = encodeURIComponent("/auth/registro" + request.nextUrl.search);
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = `?aviso=sesion-activa&accion=registro&redirectTo=${redirectTo}`;
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/auth/login" && !isServerAction) {
    const loginWithQuery = "/auth/login" + (request.nextUrl.search || "");
    const redirectTo = encodeURIComponent(loginWithQuery);
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = `?aviso=sesion-activa&accion=login&redirectTo=${redirectTo}`;
    return NextResponse.redirect(url);
  }

  if (user && isGuestOnly && !isServerAction) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL(urlLogin(rutaDeVuelta), request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
