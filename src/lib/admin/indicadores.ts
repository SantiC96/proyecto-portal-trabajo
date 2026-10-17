import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { haceDiasISO, inicioAnioArgentinaISO } from "@/lib/fechas";
import type { FilaIndicadoresPortal, FilaRpc } from "@/types/db";

// Los cálculos viven en la base (migration_047, docs/decisiones/019): acá
// solo se elige el período y se llaman las funciones.

export const PERIODOS = ["30d", "90d", "anio", "todo"] as const;
export type Periodo = (typeof PERIODOS)[number];
export const PERIODO_POR_DEFECTO: Periodo = "30d";

export const PERIODO_LABEL: Record<Periodo, string> = {
  "30d": "Últimos 30 días",
  "90d": "Últimos 90 días",
  anio: "Este año",
  todo: "Desde el inicio",
};

export function leerPeriodo(valor: string | undefined): Periodo {
  return PERIODOS.find((p) => p === valor) ?? PERIODO_POR_DEFECTO;
}

/** Comienzo del período en ISO; undefined = desde el inicio. */
export function desdePeriodo(periodo: Periodo): string | undefined {
  switch (periodo) {
    case "30d":
      return haceDiasISO(30);
    case "90d":
      return haceDiasISO(90);
    case "anio":
      return inicioAnioArgentinaISO();
    case "todo":
      return undefined;
  }
}

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
