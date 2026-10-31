import { haceDiasISO, inicioAnioArgentinaISO } from "@/lib/fechas";

// Período de los dashboards de indicadores (oficina y empresa). Viaja en la
// URL como ?periodo= y se traduce al p_desde de las funciones de la base.

export const PERIODOS = ["30d", "90d", "anio", "todo"] as const;
export type Periodo = (typeof PERIODOS)[number];
export const PERIODO_POR_DEFECTO: Periodo = "30d";

export const PERIODO_LABEL: Record<Periodo, string> = {
  "30d": "Últimos 30 días",
  "90d": "Últimos 90 días",
  anio: "Este año",
  todo: "Desde el inicio",
};

/** Cómo se agrupa el gráfico de postulaciones (series_indicadores, migration_066). */
export type Agrupacion = "dia" | "semana" | "mes";

export const AGRUPACION_POR_PERIODO: Record<Periodo, Agrupacion> = {
  "30d": "dia",
  "90d": "semana",
  anio: "mes",
  todo: "mes",
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

export function hrefPeriodo(ruta: string, periodo: Periodo): string {
  return periodo === PERIODO_POR_DEFECTO ? ruta : `${ruta}?periodo=${periodo}`;
}
