// Valores de la regla de rechazos para los textos de la interfaz.
// La regla se calcula en la base con public.parametros_cursos()
// (migration_035): si cambian allá, hay que cambiarlos acá también.
export const UMBRAL_RECHAZOS_CURSO = 3;
export const VENTANA_RECHAZOS_DIAS = 90;

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

export const ESTADO_CURSO_STYLE: Record<EstadoAsignacionCurso, string> = {
  asignado: "bg-amber-100 text-amber-800",
  en_curso: "bg-blue-100 text-blue-800",
  completado: "bg-emerald-100 text-emerald-800",
  abandonado: "bg-gray-100 text-gray-600",
};

export function esEstadoCurso(valor: unknown): valor is EstadoAsignacionCurso {
  return ESTADOS_ASIGNACION_CURSO.includes(valor as EstadoAsignacionCurso);
}

/** Asignado o en curso: el curso todavía está pendiente de completar. */
export function cursoPendiente(estado: EstadoAsignacionCurso): boolean {
  return estado === "asignado" || estado === "en_curso";
}

/** Mismos textos que el trigger asignaciones_curso_alta (migration_039). */
export const MENSAJE_SOLO_SI_NECESITA_CURSO =
  "Solo se puede asignar un curso a postulantes con 3 o más rechazos recientes.";
export const MENSAJE_CURSO_ACTIVO =
  "Este postulante ya tiene un curso asignado o en curso. Podrá recibir otro cuando complete el actual.";

export function textoRechazos(cantidad: number): string {
  return `${cantidad} rechazo${cantidad === 1 ? "" : "s"}`;
}

/** Fila de public.mis_cursos_con_estado() (migration_035). */
export type MiCurso = {
  asignacion_id: string;
  curso_id: string;
  asignado_en: string;
  estado: EstadoAsignacionCurso;
  iniciado_en: string | null;
  completado_en: string | null;
  abandonado_en: string | null;
  nombre: string;
  descripcion: string | null;
  link: string | null;
  indicaciones: string | null;
  por_rechazos: boolean;
};

/** Fila de public.estado_cursos_postulantes() (migration_035). */
export type EstadoCursosPostulante = {
  postulante_id: string;
  rechazos_ventana: number;
  rechazos_totales: number;
  necesita_curso: boolean;
  asignacion_activa_id: string | null;
  asignacion_activa_estado: EstadoAsignacionCurso | null;
  ultima_asignacion_estado: EstadoAsignacionCurso | null;
  ultimo_completado_en: string | null;
};

/**
 * Misma regla que public.estado_cursos_postulantes() (migration_035): un
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
 * tiene uno pendiente o cuya última asignación figura como abandonada (dato
 * histórico: desde migration_038 la oficina ya no marca abandonos). Es solo
 * informativo: la derivación no se bloquea. Devuelve null si no corresponde
 * avisar.
 */
export function avisoCursoAlDerivar(estado: EstadoCursosPostulante | null): string | null {
  if (!estado) return null;

  let situacion: string;
  if (estado.asignacion_activa_estado) {
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
