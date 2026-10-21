// Anclas de las secciones de /perfil del postulante. El panel (/panel) linkea
// a cada una desde "Completá tu perfil".
export const SECCION_PERFIL = {
  foto: "foto",
  datos: "datos-personales",
  informacionLaboral: "informacion-laboral",
  procedencia: "procedencia",
  rubros: "rubros",
  cvs: "cvs",
} as const;

export type SeccionPerfil = (typeof SECCION_PERFIL)[keyof typeof SECCION_PERFIL];

export function hrefSeccionPerfil(seccion: SeccionPerfil): string {
  return `/perfil#${seccion}`;
}
