export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
export const LAST_ACTIVITY_COOKIE = "ftl_last_activity";

// Cookie de sesión (sin maxAge/expires): desaparece al cerrar el navegador.
// Si hay usuario y falta esta cookie, el proxy cierra la sesión (decisión 022),
// así que todo flujo que inicia sesión tiene que crearla.
export function lastActivityCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
  };
}
export const RECOVERY_COOKIE = "ftl_recovery";
export const RECOVERY_COOKIE_PATH = "/auth/nueva-contrasena";

// Misma cookie de reintento para aceptar una invitación de la oficina.
export const INVITACION_COOKIE = "ftl_invitacion";
export const INVITACION_COOKIE_PATH = "/auth/aceptar-invitacion";

/** Cookie que guarda el refresh token para reintentar sin un link nuevo. */
export function cookieReintentoOptions(path: string) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path,
    maxAge: 15 * 60,
  };
}

export function recoveryCookieOptions() {
  return cookieReintentoOptions(RECOVERY_COOKIE_PATH);
}

// @supabase/ssr forces maxAge: 400 days on writes and maxAge: 0 on removals.
// Strip positive maxAge/expires to make auth cookies session-only (cleared on
// browser close), but keep maxAge: 0 so signOut immediately deletes cookies.
export function sessionCookieOptions<T extends object>(options: T): T {
  const copy = { ...options } as Record<string, unknown>;
  if (copy["maxAge"] !== 0) delete copy["maxAge"];
  delete copy["expires"];
  return copy as T;
}
