import type { Rol } from "@/types/db";

/**
 * Encabezado de la request con la ruta pedida (pathname + search). Lo pone el
 * proxy en cada request; las páginas lo leen para volver a la misma ruta
 * después del login o al avisar que la sesión es de otro rol.
 */
export const HEADER_RUTA_ACTUAL = "x-ruta-actual";

const BASE_VALIDACION = "http://portal.invalid";

/**
 * Única validación de rutas de vuelta (login, logout, avisos). Acepta solo
 * rutas internas: empiezan con "/", no con "//" ni "/\" y no tienen esquema.
 * Los navegadores tratan "\" como "/" e ignoran tabs y saltos de línea, por eso
 * también se rechazan.
 */
export function esRutaInterna(valor: unknown): valor is string {
  if (typeof valor !== "string" || valor.length === 0 || valor.length > 2048) return false;
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) return false;
  if (/[\\\u0000-\u001f\u007f]/.test(valor)) return false;
  try {
    return new URL(valor, BASE_VALIDACION).origin === BASE_VALIDACION;
  } catch {
    return false;
  }
}

/** La ruta si es interna; si no, `porDefecto`. */
export function rutaInterna(valor: unknown, porDefecto = "/"): string {
  return esRutaInterna(valor) ? valor : porDefecto;
}

/** Login que, al entrar, vuelve a `ruta` (si es interna y no es de /auth). */
export function urlLogin(ruta?: string | null, extra?: Record<string, string>): string {
  const params = new URLSearchParams(extra);
  if (esRutaInterna(ruta) && ruta !== "/" && !ruta.startsWith("/auth")) {
    params.set("redirect", ruta);
  }
  const query = params.toString();
  return query ? `/auth/login?${query}` : "/auth/login";
}

const ROLES: readonly Rol[] = ["postulante", "empresa", "municipalidad"];

export function esRol(valor: unknown): valor is Rol {
  return ROLES.some((r) => r === valor);
}

/**
 * Aviso del inicio cuando la sesión es de otro rol que el de la página
 * (reutiliza ?aviso=sesion-activa). `roles` son los roles de la página.
 */
export function urlAvisoOtroRol(roles: readonly Rol[], ruta: string | null): string {
  const params = new URLSearchParams({
    aviso: "sesion-activa",
    accion: "otro-rol",
    rol: roles.join(","),
  });
  if (esRutaInterna(ruta)) params.set("redirectTo", ruta);
  return `/?${params.toString()}`;
}
