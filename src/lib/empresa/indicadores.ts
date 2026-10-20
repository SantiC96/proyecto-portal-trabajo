import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { desdePeriodo, type Periodo } from "@/lib/indicadores-periodo";
import type { FilaIndicadoresEmpresa, FilaIndicadoresPorOfertaEmpresa } from "@/types/db";

// Los cálculos viven en la base (migration_049, docs/decisiones/021). La
// empresa sale de la sesión dentro de cada función: acá no se pasa ningún id.

export async function obtenerIndicadoresEmpresa(periodo: Periodo) {
  const supabase = await createSupabaseServerClient();
  const desde = desdePeriodo(periodo);

  const [indicadores, porOferta] = await Promise.all([
    supabase.rpc("indicadores_empresa", { p_desde: desde }).maybeSingle(),
    supabase.rpc("indicadores_por_oferta_empresa", { p_desde: desde }),
  ]);

  const fila: FilaIndicadoresEmpresa | null = indicadores.data ?? null;
  const ofertas: FilaIndicadoresPorOfertaEmpresa[] = porOferta.data ?? [];

  return {
    indicadores: { data: fila, error: indicadores.error },
    porOferta: { data: ofertas, error: porOferta.error },
  };
}
