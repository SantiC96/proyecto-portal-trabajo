import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  AGRUPACION_POR_PERIODO,
  desdePeriodo,
  type Periodo,
} from "@/lib/indicadores-periodo";
import { indicadoresDeEjemplo, indicadoresPortalDeEjemplo } from "@/lib/indicadores-ejemplo";
import type { FilaIndicadoresPortal, FilaRpc } from "@/types/db";

// Los cálculos viven en la base (migration_047 y 061, docs/decisiones/019):
// acá solo se elige el período y se llaman las funciones.

export type PostulacionesRubro = FilaRpc<"postulaciones_por_rubro">;

/** Una fila del gráfico: primer día del día, semana o mes ("2026-10-01") y su cantidad. */
export type PostulacionesPeriodo = FilaRpc<"postulaciones_por_periodo">;

/** Cantidad de rubros que se muestran antes de agrupar el resto en "Otros rubros". */
export const TOPE_RUBROS = 5;

export async function obtenerIndicadores(periodo: Periodo) {
  const agrupacion = AGRUPACION_POR_PERIODO[periodo];

  // Modo de ejemplo (decisión 032, punto 5): no se consulta la base.
  if (indicadoresDeEjemplo()) {
    const ejemplo = indicadoresPortalDeEjemplo(periodo);
    return {
      agrupacion,
      indicadores: { data: ejemplo.indicadores, error: null },
      porPeriodo: { data: ejemplo.porPeriodo, error: null },
      porRubro: { data: ejemplo.porRubro, error: null },
    };
  }

  const supabase = await createSupabaseServerClient();
  // El mismo p_desde en las tres funciones: el total del gráfico coincide con
  // postulaciones_nuevas.
  const desde = desdePeriodo(periodo);

  const [indicadores, porPeriodo, porRubro] = await Promise.all([
    supabase.rpc("indicadores_portal", { p_desde: desde }).maybeSingle(),
    supabase.rpc("postulaciones_por_periodo", { p_desde: desde, p_agrupacion: agrupacion }),
    supabase.rpc("postulaciones_por_rubro", { p_desde: desde, p_limite: TOPE_RUBROS }),
  ]);

  const fila: FilaIndicadoresPortal | null = indicadores.data ?? null;

  return {
    agrupacion,
    indicadores: { data: fila, error: indicadores.error },
    porPeriodo: { data: porPeriodo.data ?? [], error: porPeriodo.error },
    porRubro: { data: porRubro.data ?? [], error: porRubro.error },
  };
}
