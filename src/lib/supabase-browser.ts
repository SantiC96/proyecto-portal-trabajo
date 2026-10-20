import { createBrowserClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { sessionCookieOptions } from "@/lib/session-config";

function leerCookies(): { name: string; value: string }[] {
  if (!document.cookie) return [];
  return document.cookie.split(/;\s*/).flatMap((par) => {
    const igual = par.indexOf("=");
    if (igual <= 0) return [];
    const name = par.slice(0, igual).trim();
    const crudo = par.slice(igual + 1);
    let value = crudo;
    try {
      value = decodeURIComponent(crudo);
    } catch {
      // Valor con % mal formado: se deja tal cual.
    }
    return [{ name, value }];
  });
}

function serializarCookie(name: string, value: string, options: CookieOptions): string {
  const partes = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) partes.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.expires) partes.push(`Expires=${options.expires.toUTCString()}`);
  if (options.domain) partes.push(`Domain=${options.domain}`);
  partes.push(`Path=${options.path ?? "/"}`);
  if (options.sameSite) {
    const sameSite = options.sameSite === true ? "strict" : options.sameSite;
    partes.push(`SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`);
  }
  if (options.secure) partes.push("Secure");
  if (options.partitioned) partes.push("Partitioned");
  return partes.join("; ");
}

// Sin cookies propias, @supabase/ssr escribe las de auth con maxAge de 400 días
// al renovar el token en el navegador y la sesión sobrevive al cierre. Se
// aplican las mismas opciones que en el servidor (sessionCookieOptions): sin
// vencimiento, salvo maxAge: 0 para borrar al cerrar sesión.
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return leerCookies();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            document.cookie = serializarCookie(name, value, sessionCookieOptions(options));
          });
        },
      },
    }
  );
}
