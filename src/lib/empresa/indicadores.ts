import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { desdePeriodo, type Periodo } from "@/lib/indicadores-periodo";
import { indicadoresDeEjemplo, indicadoresEmpresaDeEjemplo } from "@/lib/indicadores-ejemplo";
import type { FilaIndicadoresEmpresa, FilaIndicadoresPorOfertaEmpresa } from "@/types/db";

// Los cálculos viven en la base (migration_049, docs/decisiones/021). La
// empresa sale de la sesión dentro de cada función: acá no se pasa ningún id.

export async function obtenerIndicadoresEmpresa(periodo: Periodo) {
  // Modo de ejemplo (decisión 032, punto 5): no se consulta la base.
  if (indicadoresDeEjemplo()) {
    const ejemplo = indicadoresEmpresaDeEjemplo(periodo);
    return {
      indicadores: { data: ejemplo.indicadores, error: null },
      porOferta: { data: ejemplo.porOferta, error: null },
    };
  }

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
