export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
export const LAST_ACTIVITY_COOKIE = "ftl_last_activity";

// @supabase/ssr forces maxAge: 400 days on writes and maxAge: 0 on removals.
// Strip positive maxAge/expires to make auth cookies session-only (cleared on
// browser close), but keep maxAge: 0 so signOut immediately deletes cookies.
export function sessionCookieOptions<T extends object>(options: T): T {
  const copy = { ...options } as Record<string, unknown>;
  if (copy["maxAge"] !== 0) delete copy["maxAge"];
  delete copy["expires"];
  return copy as T;
}
