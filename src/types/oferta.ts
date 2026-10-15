import type { Enum } from "@/types/db";

export type Modalidad = Enum<"modalidad_oferta">;
export type Jornada = Enum<"jornada_oferta">;

export interface OfertaLaboral {
  id: string;
  titulo: string;
  empresa: string;
  categorias: string[];
  ubicacion: string;
  modalidad: Modalidad;
  jornada: Jornada;
  descripcion: string;
  requisitos: string[];
  beneficios?: string[];
  fechaPublicacion: string; // ISO o formato fecha
  /** Solo en el detalle: fecha de vencimiento (migration_036). */
  venceEn?: string | null;
}
