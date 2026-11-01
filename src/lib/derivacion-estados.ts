import type { TonoBadge } from "@/components/ui/badge";
import { ESTILO_ETAPA } from "@/lib/estados-postulacion";
import type { Enum } from "@/types/db";

export type EstadoDerivacionEmpresa = Enum<"estado_empresa">;

export const DERIVACION_ESTADO_LABEL: Record<EstadoDerivacionEmpresa, string> = {
  pendiente: "Por contactar",
  en_proceso: "Entrevista coordinada",
  contratado: "Seleccionado",
  rechazado: "No seleccionado",
  oferta_retirada: "Cerrada (oferta retirada)",
  retirada_postulante: "Se retiró",
};

export const DERIVACION_ESTADO_TONO: Record<EstadoDerivacionEmpresa, TonoBadge> = {
  pendiente: ESTILO_ETAPA.derivada.tono,
  en_proceso: ESTILO_ETAPA.entrevista.tono,
  contratado: ESTILO_ETAPA.seleccionado.tono,
  rechazado: ESTILO_ETAPA.cerrado.tono,
  oferta_retirada: ESTILO_ETAPA.cerrado.tono,
  retirada_postulante: ESTILO_ETAPA.cerrado.tono,
};

/**
 * Días después de la entrevista a partir de los cuales una derivación que
 * sigue en "Por contactar" o "Entrevista coordinada" se considera sin
 * resultado de la empresa (recordatorio de contratación, migration_037).
 */
export const DIAS_SIN_RESULTADO = 3;
