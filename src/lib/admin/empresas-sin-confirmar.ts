import type { createSupabaseServerClient } from "@/lib/supabase-server";

type ClienteSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Ids de las empresas pendientes cuyo usuario todavía no confirmó el email
 * (migration_042). La oficina no las ve en ningún listado ni contador hasta
 * que confirman, y la base no deja aprobarlas ni rechazarlas.
 */
export async function idsEmpresasSinConfirmar(supabase: ClienteSupabase) {
  const { data, error } = await supabase.rpc("empresas_email_sin_confirmar");
  if (error) return { ids: null, error } as const;
  return { ids: data.map((fila) => fila.empresa_id), error: null } as const;
}

/** Valor para `.not("id", "in", ...)` de PostgREST. */
export function listaIn(ids: string[]): string {
  return `(${ids.join(",")})`;
}
