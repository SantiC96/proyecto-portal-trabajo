import type { TonoBadge } from "@/components/ui/badge";
import type { ConNulos, FilaRpc } from "@/types/db";

// Valores de la regla de rechazos para los textos de la interfaz.
// La regla se calcula en la base con public.parametros_cursos()
// (migration_035): si cambian allá, hay que cambiarlos acá también.
export const UMBRAL_RECHAZOS_CURSO = 3;
export const VENTANA_RECHAZOS_DIAS = 90;

/** asignaciones_curso.estado es text con un CHECK (migration_035), no un enum. */
export type EstadoAsignacionCurso = "asignado" | "en_curso" | "completado" | "abandonado";

export const ESTADOS_ASIGNACION_CURSO: EstadoAsignacionCurso[] = [
  "asignado",
  "en_curso",
  "completado",
  "abandonado",
];

export const ESTADO_CURSO_LABEL: Record<EstadoAsignacionCurso, string> = {
  asignado: "Asignado",
  en_curso: "En curso",
  completado: "Completado",
  abandonado: "Abandonado",
};

export const ESTADO_CURSO_TONO: Record<EstadoAsignacionCurso, TonoBadge> = {
  asignado: "violet",
  en_curso: "violet",
  completado: "success",
  abandonado: "neutral",
};

export function esEstadoCurso(valor: unknown): valor is EstadoAsignacionCurso {
  return ESTADOS_ASIGNACION_CURSO.some((estado) => estado === valor);
}

/** Mismos textos que el trigger asignaciones_curso_alta (migration_046). */
export const MENSAJE_SOLO_SI_PUEDE_RECIBIR_CURSO =
  "Solo se puede asignar un curso a postulantes con 3 o más rechazos recientes.";
export const MENSAJE_MISMO_CURSO_PENDIENTE = "Este postulante ya tiene este curso pendiente.";

export function textoRechazos(cantidad: number): string {
  return `${cantidad} rechazo${cantidad === 1 ? "" : "s"}`;
}

export function textoCursosPendientes(cantidad: number): string {
  return cantidad === 1
    ? "1 curso pendiente por terminar"
    : `${cantidad} cursos pendientes por terminar`;
}

type FilaMiCurso = FilaRpc<"mis_cursos_con_estado">;

/** Fila de public.mis_cursos_con_estado() (migration_035). */
export type MiCurso = Omit<
  ConNulos<
    FilaMiCurso,
    "iniciado_en" | "completado_en" | "abandonado_en" | "descripcion" | "link" | "indicaciones"
  >,
  "estado"
> & { estado: EstadoAsignacionCurso };

/**
 * Tipa el estado de filas que lo traen como text (asignaciones_curso y las
 * funciones que la leen). Descarta las filas con un estado desconocido: el
 * CHECK de la base no las permite.
 */
export function conEstadoCurso<T extends { estado: string }>(
  filas: readonly T[],
): (Omit<T, "estado"> & { estado: EstadoAsignacionCurso })[] {
  return filas.flatMap((fila) => {
    const { estado } = fila;
    return esEstadoCurso(estado) ? [{ ...fila, estado }] : [];
  });
}

export function aMisCursos(filas: readonly FilaMiCurso[]): MiCurso[] {
  return conEstadoCurso(filas);
}

type FilaEstadoCursos = FilaRpc<"estado_cursos_postulantes">;

/**
 * Fila de public.estado_cursos_postulantes() (035, 046).
 *   puede_recibir_curso  cumple la regla de rechazos (se le puede asignar un
 *                        curso aunque tenga otros pendientes).
 *   necesita_curso       puede_recibir_curso y sin cursos pendientes.
 *   asignacion_activa_*  una de las pendientes (la en curso más reciente o,
 *                        si no hay, la asignada más reciente).
 */
export type EstadoCursosPostulante = Omit<
  ConNulos<FilaEstadoCursos, "asignacion_activa_id" | "ultimo_completado_en">,
  "asignacion_activa_estado" | "ultima_asignacion_estado"
> & {
  asignacion_activa_estado: EstadoAsignacionCurso | null;
  ultima_asignacion_estado: EstadoAsignacionCurso | null;
};

export function aEstadoCursos(fila: FilaEstadoCursos): EstadoCursosPostulante {
  const { asignacion_activa_estado: activa, ultima_asignacion_estado: ultima } = fila;
  return {
    ...fila,
    asignacion_activa_estado: esEstadoCurso(activa) ? activa : null,
    ultima_asignacion_estado: esEstadoCurso(ultima) ? ultima : null,
  };
}

/**
 * Misma regla que public.estado_cursos_calculo() (035, 046): un
 * rechazo cuenta para el curso si cae dentro de la ventana y es posterior al
 * último curso completado.
 */
export function rechazoCuentaParaCurso(
  fechaRechazo: string,
  ultimoCompletadoEn: string | null,
): boolean {
  const t = new Date(fechaRechazo).getTime();
  const inicioVentana = Date.now() - VENTANA_RECHAZOS_DIAS * 24 * 60 * 60 * 1000;
  if (t < inicioVentana) return false;
  return ultimoCompletadoEn === null || t > new Date(ultimoCompletadoEn).getTime();
}

/** Ventana de la lista "Cursos completados en los últimos N días" (/admin/cursos/completados). */
export const DIAS_CURSOS_COMPLETADOS_RECIENTES = 7;

/**
 * Aviso que ve la oficina antes de derivar a un postulante que necesita curso,
 * tiene cursos pendientes o cuya última asignación figura como abandonada (dato
 * histórico: desde migration_038 la oficina ya no marca abandonos). Es solo
 * informativo: la derivación no se bloquea. Devuelve null si no corresponde
 * avisar.
 */
export function avisoCursoAlDerivar(estado: EstadoCursosPostulante | null): string | null {
  if (!estado) return null;

  const pendientes = Number(estado.cursos_activos);
  let situacion: string;
  if (pendientes > 1) {
    situacion = `no completó los ${pendientes} cursos asignados`;
  } else if (pendientes === 1) {
    situacion = "no completó el curso asignado";
  } else if (estado.ultima_asignacion_estado === "abandonado") {
    situacion = "abandonó el curso";
  } else if (estado.necesita_curso) {
    situacion = "todavía no tiene curso asignado";
  } else {
    return null;
  }

  const rechazos = Number(estado.rechazos_ventana);
  const inicio =
    rechazos > 0
      ? `Este postulante tiene ${textoRechazos(rechazos)} recientes y ${situacion}.`
      : `Este postulante ${situacion}.`;
  return `${inicio} Podés derivarlo igual.`;
}
