import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { desdePeriodo, type Periodo } from "@/lib/indicadores-periodo";
import type { FilaIndicadoresPortal, FilaRpc } from "@/types/db";

// Los cálculos viven en la base (migration_047, docs/decisiones/019): acá
// solo se elige el período y se llaman las funciones.

export type PostulacionesMes = FilaRpc<"postulaciones_por_mes">;
export type PostulacionesRubro = FilaRpc<"postulaciones_por_rubro">;

/** Cantidad de rubros que se muestran antes de agrupar el resto en "Otros rubros". */
export const TOPE_RUBROS = 8;

export async function obtenerIndicadores(periodo: Periodo) {
  const supabase = await createSupabaseServerClient();
  const desde = desdePeriodo(periodo);

  const [indicadores, porMes, porRubro] = await Promise.all([
    supabase.rpc("indicadores_portal", { p_desde: desde }).maybeSingle(),
    supabase.rpc("postulaciones_por_mes"),
    supabase.rpc("postulaciones_por_rubro", { p_desde: desde, p_limite: TOPE_RUBROS }),
  ]);

  const fila: FilaIndicadoresPortal | null = indicadores.data ?? null;

  return {
    indicadores: { data: fila, error: indicadores.error },
    porMes: { data: porMes.data ?? [], error: porMes.error },
    porRubro: { data: porRubro.data ?? [], error: porRubro.error },
  };
}
