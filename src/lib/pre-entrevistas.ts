import { formatFechaHoraCorta } from "@/lib/fechas";
import { LARGO_MAXIMO, MENSAJE_OBLIGATORIO, validarTextoOpcional } from "@/lib/validaciones";
import type { Tabla } from "@/types/db";

// Pre-entrevista de la Oficina de Empleo con el postulante, opcional antes de
// derivar (migration_044 y 045, docs/decisiones/017-pre-entrevista.md). Hay
// una por postulación.

export const ESTADOS_PRE_ENTREVISTA = ["coordinada", "realizada", "no_asistio"] as const;
export type EstadoPreEntrevista = (typeof ESTADOS_PRE_ENTREVISTA)[number];

export function esEstadoPreEntrevista(valor: unknown): valor is EstadoPreEntrevista {
  return ESTADOS_PRE_ENTREVISTA.some((e) => e === valor);
}

/** Resultados que registra la oficina después de la fecha. */
export const RESULTADOS_PRE_ENTREVISTA = ["realizada", "no_asistio"] as const;
export type ResultadoPreEntrevista = (typeof RESULTADOS_PRE_ENTREVISTA)[number];

export function esResultadoPreEntrevista(valor: unknown): valor is ResultadoPreEntrevista {
  return RESULTADOS_PRE_ENTREVISTA.some((r) => r === valor);
}

export type PreEntrevista = Pick<
  Tabla<"pre_entrevistas">,
  "id" | "estado" | "fecha_hora" | "lugar" | "nota_oficina" | "updated_at"
>;

export const PRE_ENTREVISTA_LABEL: Record<EstadoPreEntrevista | "sin_coordinar", string> = {
  sin_coordinar: "Sin coordinar",
  coordinada: "Coordinada",
  realizada: "Realizada",
  no_asistio: "No asistió",
};

export const PRE_ENTREVISTA_STYLE: Record<EstadoPreEntrevista | "sin_coordinar", string> = {
  sin_coordinar: "bg-gray-100 text-gray-600",
  coordinada: "bg-blue-100 text-blue-800",
  realizada: "bg-emerald-100 text-emerald-800",
  no_asistio: "bg-amber-100 text-amber-800",
};

/** Etiqueta y estilo del estado; la coordinada lleva la fecha. */
export function badgePreEntrevista(
  pre: Pick<Tabla<"pre_entrevistas">, "estado" | "fecha_hora"> | null | undefined,
): { label: string; className: string } {
  if (!pre || !esEstadoPreEntrevista(pre.estado)) {
    return { label: PRE_ENTREVISTA_LABEL.sin_coordinar, className: PRE_ENTREVISTA_STYLE.sin_coordinar };
  }
  const label =
    pre.estado === "coordinada"
      ? `${PRE_ENTREVISTA_LABEL.coordinada}: ${formatFechaHoraCorta(pre.fecha_hora)}`
      : PRE_ENTREVISTA_LABEL[pre.estado];
  return { label, className: PRE_ENTREVISTA_STYLE[pre.estado] };
}

/** La fecha ya pasó: se puede registrar el resultado. */
export function preEntrevistaYaPaso(fechaHora: string, ahora: number = Date.now()): boolean {
  const t = new Date(fechaHora).getTime();
  return !isNaN(t) && t <= ahora;
}

/** Campos del formulario de la pre-entrevista que valida el servidor. */
export type CampoPreEntrevista = "fechaHora" | "lugar" | "nota";

/**
 * Validación de servidor de fecha, lugar y nota. La base repite estos
 * controles (validar_datos_pre_entrevista, 044).
 */
export function validarDatosPreEntrevista(
  fechaHoraISO: unknown,
  lugar: unknown,
  nota: unknown,
): { campo: CampoPreEntrevista; mensaje: string } | null {
  if (typeof fechaHoraISO !== "string") return { campo: "fechaHora", mensaje: "La fecha no es válida." };
  const fecha = new Date(fechaHoraISO);
  if (isNaN(fecha.getTime())) return { campo: "fechaHora", mensaje: "La fecha no es válida." };
  if (fecha.getTime() <= Date.now())
    return {
      campo: "fechaHora",
      mensaje: "La fecha de la pre-entrevista tiene que ser posterior al momento actual.",
    };

  if (typeof lugar !== "string" || !lugar.trim()) return { campo: "lugar", mensaje: MENSAJE_OBLIGATORIO };
  const errLugar = validarTextoOpcional(lugar, LARGO_MAXIMO.lugarEntrevista);
  if (errLugar) return { campo: "lugar", mensaje: errLugar };

  const errNota = validarTextoOpcional(nota, LARGO_MAXIMO.nota);
  if (errNota) return { campo: "nota", mensaje: errNota };
  return null;
}
