import type { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { idsEmpresasSinConfirmar } from "@/lib/admin/empresas-sin-confirmar";

type ClienteSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** Trabajo pendiente de la oficina que muestra la navegación lateral. */
export type PendientesOficina = {
  ofertas: number;
  empresas: number;
  comprobantes: number;
};

/**
 * Mismas consultas que el panel de la oficina (/admin) y el listado de
 * empresas: las empresas que no confirmaron el email no cuentan como
 * pendientes (migration_042). Si alguna falla, devuelve null y la navegación
 * no muestra contadores.
 */
export async function contarPendientesOficina(
  supabase: ClienteSupabase,
): Promise<PendientesOficina | null> {
  const [ofertas, empresas, comprobantes, sinConfirmar] = await Promise.all([
    supabase
      .from("ofertas")
      .select("*", { count: "exact", head: true })
      .eq("estado", "pendiente_aprobacion"),
    supabase
      .from("empresas")
      .select("*", { count: "exact", head: true })
      .eq("estado_aprobacion", "pendiente"),
    supabase
      .from("archivos_usuario")
      .select("id", { count: "exact", head: true })
      .eq("tipo", "comprobante_domicilio")
      .is("eliminado_en", null)
      .eq("verificacion_estado", "pendiente"),
    idsEmpresasSinConfirmar(supabase),
  ]);

  const error = ofertas.error ?? empresas.error ?? comprobantes.error ?? sinConfirmar.error;
  if (error) {
    logError("contadores_navegacion_oficina", error);
    return null;
  }

  return {
    ofertas: ofertas.count ?? 0,
    empresas: Math.max(0, (empresas.count ?? 0) - (sinConfirmar.ids?.length ?? 0)),
    comprobantes: comprobantes.count ?? 0,
  };
}
