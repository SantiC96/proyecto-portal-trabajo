import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  AGRUPACION_POR_PERIODO,
  desdePeriodo,
  type Periodo,
} from "@/lib/indicadores-periodo";
import { indicadoresDeEjemplo, indicadoresPortalDeEjemplo } from "@/lib/indicadores-ejemplo";
import type { EstadoDerivacionEmpresa } from "@/lib/derivacion-estados";
import type { EstadoPostulacion } from "@/lib/admin/postulacion-estados";
import type { ClienteSupabase, ConNulos, FilaIndicadoresPortal, FilaRpc } from "@/types/db";

// Los cálculos viven en la base (migration_047, 061, 065 y 066, docs/decisiones/019
// y 032): acá solo se elige el período y se llaman las funciones.

export type PostulacionesRubro = FilaRpc<"postulaciones_por_rubro">;

/** Ofertas vigentes por rubro (migration_065). Una oferta con varios rubros cuenta en cada uno. */
export type OfertasVigentesRubro = FilaRpc<"contar_ofertas_vigentes_por_rubro">;

/** Valores del período y del anterior (migration_066). Los *_anterior son NULL "desde el inicio". */
export type IndicadoresComparados = ConNulos<
  FilaRpc<"indicadores_comparados">,
  | "postulantes_nuevos_anterior"
  | "ofertas_publicadas_anterior"
  | "postulaciones_nuevas_anterior"
  | "derivaciones_anterior"
  | "contrataciones_anterior"
  | "tasa_contratacion"
  | "tasa_contratacion_anterior"
>;

/** Fila de series_indicadores (primer día del día, semana o mes). */
export type FilaSerie = FilaRpc<"series_indicadores">;

/** Estado de las postulaciones del período. Las cinco suman las postulaciones nuevas. */
export type EstadoPostulacionesPeriodo = FilaRpc<"estado_postulaciones_periodo">;

/** Una fila de "Últimas postulaciones". `id` es null en el modo de ejemplo (sin ficha). */
export type UltimaPostulacion = {
  id: string | null;
  fecha: string;
  postulante: string;
  puesto: string;
  estado: EstadoPostulacion;
  estadoEmpresa: EstadoDerivacionEmpresa | null;
};

/** Cantidad de rubros que se muestran antes de agrupar el resto en "Otros rubros". */
export const TOPE_RUBROS = 5;

/** Cantidad de filas de "Últimas postulaciones". */
export const CANTIDAD_ULTIMAS = 5;

type Resultado<T> = { data: T; error: PostgrestError | null };

export type DatosIndicadores = {
  agrupacion: ReturnType<typeof agrupacionDe>;
  /** Modo de ejemplo: las filas de "Últimas postulaciones" no llevan a ninguna ficha. */
  deEjemplo: boolean;
  indicadores: Resultado<FilaIndicadoresPortal | null>;
  comparados: Resultado<IndicadoresComparados | null>;
  series: Resultado<FilaSerie[]>;
  estado: Resultado<EstadoPostulacionesPeriodo | null>;
  porRubro: Resultado<PostulacionesRubro[]>;
  ofertasPorRubro: Resultado<OfertasVigentesRubro[]>;
  ultimas: Resultado<UltimaPostulacion[]>;
};

function agrupacionDe(periodo: Periodo) {
  return AGRUPACION_POR_PERIODO[periodo];
}

const sinError = <T,>(data: T): Resultado<T> => ({ data, error: null });

async function ultimasPostulaciones(
  supabase: ClienteSupabase,
): Promise<Resultado<UltimaPostulacion[]>> {
  const { data, error } = await supabase
    .from("postulaciones")
    .select(
      `
      id,
      estado,
      created_at,
      postulantes!postulante_id(usuarios!usuario_id(nombre, apellido)),
      ofertas!oferta_id(titulo),
      derivaciones(estado_empresa)
    `,
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(CANTIDAD_ULTIMAS);

  if (error) return { data: [], error };

  return {
    data: (data ?? []).map((r) => {
      const usuario = r.postulantes?.usuarios;
      return {
        id: r.id,
        fecha: r.created_at,
        postulante: usuario ? `${usuario.nombre} ${usuario.apellido}`.trim() : "Postulante",
        puesto: r.ofertas?.titulo ?? "—",
        estado: r.estado,
        estadoEmpresa: r.derivaciones?.estado_empresa ?? null,
      };
    }),
    error: null,
  };
}

export async function obtenerIndicadores(periodo: Periodo): Promise<DatosIndicadores> {
  const agrupacion = agrupacionDe(periodo);

  // Modo de ejemplo (decisión 032, punto 5): no se consulta la base.
  if (indicadoresDeEjemplo()) {
    const ejemplo = indicadoresPortalDeEjemplo(periodo);
    return {
      agrupacion,
      deEjemplo: true,
      indicadores: sinError(ejemplo.indicadores),
      comparados: sinError(ejemplo.comparados),
      series: sinError(ejemplo.series),
      estado: sinError(ejemplo.estado),
      porRubro: sinError(ejemplo.porRubro),
      ofertasPorRubro: sinError(ejemplo.ofertasPorRubro),
      ultimas: sinError(ejemplo.ultimas),
    };
  }

  const supabase = await createSupabaseServerClient();
  // El mismo p_desde en todas las funciones: la suma de la serie coincide con
  // las tarjetas y el estado de las postulaciones suma las postulaciones nuevas.
  const desde = desdePeriodo(periodo) ?? null;

  const [indicadores, comparados, series, estado, porRubro, ofertasPorRubro, ultimas] =
    await Promise.all([
      supabase.rpc("indicadores_portal", { p_desde: desde ?? undefined }).maybeSingle(),
      supabase.rpc("indicadores_comparados", { p_desde: desde ?? undefined }).maybeSingle(),
      supabase.rpc("series_indicadores", { p_desde: desde ?? undefined, p_agrupacion: agrupacion }),
      supabase.rpc("estado_postulaciones_periodo", { p_desde: desde ?? undefined }).maybeSingle(),
      supabase.rpc("postulaciones_por_rubro", { p_desde: desde ?? undefined, p_limite: TOPE_RUBROS }),
      supabase.rpc("contar_ofertas_vigentes_por_rubro"),
      ultimasPostulaciones(supabase),
    ]);

  const fila: FilaIndicadoresPortal | null = indicadores.data ?? null;

  return {
    agrupacion,
    deEjemplo: false,
    indicadores: { data: fila, error: indicadores.error },
    comparados: { data: comparados.data ?? null, error: comparados.error },
    series: { data: series.data ?? [], error: series.error },
    estado: { data: estado.data ?? null, error: estado.error },
    porRubro: { data: porRubro.data ?? [], error: porRubro.error },
    ofertasPorRubro: { data: ofertasPorRubro.data ?? [], error: ofertasPorRubro.error },
    ultimas,
  };
}
