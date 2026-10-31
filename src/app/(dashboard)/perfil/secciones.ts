import { SECCION_PERFIL, type SeccionPerfil } from "@/lib/perfil-secciones";

// Textos fijos de Mi perfil: los comparten la página y loading.tsx.

export const TITULO = "Mi perfil";
export const BAJADA = "Mantené tus datos al día: la Oficina de Empleo los usa para proponerte ofertas.";

// Mismo orden que las tarjetas de PerfilForm.
export const SECCIONES: { id: SeccionPerfil; titulo: string }[] = [
  { id: SECCION_PERFIL.foto, titulo: "Foto" },
  { id: SECCION_PERFIL.datos, titulo: "Datos personales" },
  { id: SECCION_PERFIL.procedencia, titulo: "Procedencia" },
  { id: SECCION_PERFIL.informacionLaboral, titulo: "Información laboral" },
  { id: SECCION_PERFIL.rubros, titulo: "Rubros de interés" },
  { id: SECCION_PERFIL.cvs, titulo: "CVs" },
  { id: SECCION_PERFIL.contrasena, titulo: "Contraseña" },
];
