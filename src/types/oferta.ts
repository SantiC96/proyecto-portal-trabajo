export type Modalidad = "Presencial" | "Híbrido" | "Remoto";
export type Jornada = "Tiempo completo" | "Part-time" | "Pasantía" | "Por proyecto";

export interface OfertaLaboral {
  id: string;
  titulo: string;
  empresa: string;
  rubro: string;
  categoria: string;
  ubicacion: string;
  modalidad: Modalidad;
  jornada: Jornada;
  descripcion: string;
  requisitos: string[];
  beneficios?: string[];
  fechaPublicacion: string; // ISO o formato fecha
  destacada?: boolean;
}
