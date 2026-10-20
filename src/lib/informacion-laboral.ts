import { validarTextoOpcional } from "@/lib/validaciones";

// Información laboral del postulante (migration_046, docs/decisiones/018).
// Todos los campos son opcionales. Los valores cerrados son los mismos que
// los CHECK de public.postulantes: si cambian allá, hay que cambiarlos acá.

export const NIVELES_EDUCATIVOS = [
  "primario_incompleto",
  "primario_completo",
  "secundario_incompleto",
  "secundario_completo",
  "terciario_incompleto",
  "terciario_completo",
  "universitario_incompleto",
  "universitario_completo",
] as const;
export type NivelEducativo = (typeof NIVELES_EDUCATIVOS)[number];

export const SITUACIONES_LABORALES = [
  "desempleado",
  "empleado",
  "independiente",
  "estudiante",
  "otro",
] as const;
export type SituacionLaboral = (typeof SITUACIONES_LABORALES)[number];

export const DISPONIBILIDADES = ["manana", "tarde", "noche", "completa", "flexible"] as const;
export type Disponibilidad = (typeof DISPONIBILIDADES)[number];

export const NIVEL_EDUCATIVO_LABEL: Record<NivelEducativo, string> = {
  primario_incompleto: "Primario incompleto",
  primario_completo: "Primario completo",
  secundario_incompleto: "Secundario incompleto",
  secundario_completo: "Secundario completo",
  terciario_incompleto: "Terciario incompleto",
  terciario_completo: "Terciario completo",
  universitario_incompleto: "Universitario incompleto",
  universitario_completo: "Universitario completo",
};

export const SITUACION_LABORAL_LABEL: Record<SituacionLaboral, string> = {
  desempleado: "Desempleado/a",
  empleado: "Empleado/a",
  independiente: "Independiente",
  estudiante: "Estudiante",
  otro: "Otra",
};

export const DISPONIBILIDAD_LABEL: Record<Disponibilidad, string> = {
  manana: "Mañana",
  tarde: "Tarde",
  noche: "Noche",
  completa: "Jornada completa",
  flexible: "Flexible",
};

export const LARGO_MAXIMO_EXPERIENCIA = 2000;

export const SIN_COMPLETAR = "Sin completar";

export type InformacionLaboral = {
  nivel_educativo: string | null;
  situacion_laboral: string | null;
  disponibilidad: string | null;
  experiencia_laboral: string | null;
};

function etiqueta<T extends string>(
  valores: readonly T[],
  labels: Record<T, string>,
  valor: string | null | undefined,
): string | null {
  const encontrado = valores.find((v) => v === valor);
  return encontrado ? labels[encontrado] : null;
}

export function etiquetaNivelEducativo(valor: string | null | undefined): string | null {
  return etiqueta(NIVELES_EDUCATIVOS, NIVEL_EDUCATIVO_LABEL, valor);
}

export function etiquetaSituacionLaboral(valor: string | null | undefined): string | null {
  return etiqueta(SITUACIONES_LABORALES, SITUACION_LABORAL_LABEL, valor);
}

export function etiquetaDisponibilidad(valor: string | null | undefined): string | null {
  return etiqueta(DISPONIBILIDADES, DISPONIBILIDAD_LABEL, valor);
}

export type CampoInformacionLaboral =
  | "nivelEducativo"
  | "situacionLaboral"
  | "disponibilidad"
  | "experienciaLaboral";

function valorOpcionalValido(valores: readonly string[], valor: unknown): boolean {
  return valor === "" || (typeof valor === "string" && valores.includes(valor));
}

/**
 * Validación de servidor. "" significa sin completar. La base repite los
 * controles con los CHECK de migration_046.
 */
export function validarInformacionLaboral(data: {
  nivelEducativo: unknown;
  situacionLaboral: unknown;
  disponibilidad: unknown;
  experienciaLaboral: unknown;
}): { campo: CampoInformacionLaboral; mensaje: string } | null {
  if (!valorOpcionalValido(NIVELES_EDUCATIVOS, data.nivelEducativo))
    return { campo: "nivelEducativo", mensaje: "Elegí un nivel educativo de la lista." };
  if (!valorOpcionalValido(SITUACIONES_LABORALES, data.situacionLaboral))
    return { campo: "situacionLaboral", mensaje: "Elegí una situación laboral de la lista." };
  if (!valorOpcionalValido(DISPONIBILIDADES, data.disponibilidad))
    return { campo: "disponibilidad", mensaje: "Elegí una disponibilidad de la lista." };
  if (typeof data.experienciaLaboral !== "string")
    return { campo: "experienciaLaboral", mensaje: "El texto no es válido." };
  const errExperiencia = validarTextoOpcional(data.experienciaLaboral, LARGO_MAXIMO_EXPERIENCIA);
  if (errExperiencia) return { campo: "experienciaLaboral", mensaje: errExperiencia };
  return null;
}
