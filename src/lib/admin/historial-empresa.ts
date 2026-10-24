import type { Tabla } from "@/types/db";

// historial_aprobacion_empresa.evento es text con un CHECK (migration_031).
const EVENTOS_HISTORIAL = ["aprobada", "rechazada", "reenviada"] as const;

export type HistorialEntry = Pick<
  Tabla<"historial_aprobacion_empresa">,
  "id" | "empresa_id" | "motivo" | "created_at" | "usuario_id"
> & { evento: (typeof EVENTOS_HISTORIAL)[number] };

export function esEventoHistorial(valor: string): valor is HistorialEntry["evento"] {
  return EVENTOS_HISTORIAL.some((e) => e === valor);
}

/** Descarta eventos desconocidos (el CHECK de la base no los permite). */
export function historialValido<T extends { evento: string }>(
  filas: T[],
): (T & { evento: HistorialEntry["evento"] })[] {
  return filas.flatMap((fila) => {
    const { evento } = fila;
    return esEventoHistorial(evento) ? [{ ...fila, evento }] : [];
  });
}

export const ESTADOS_EMPRESA = ["pendiente", "aprobada", "rechazada"] as const;
export type EstadoAprobacion = (typeof ESTADOS_EMPRESA)[number];

export const ESTADO_EMPRESA_LABEL: Record<EstadoAprobacion, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

export function esEstadoEmpresa(valor: string): valor is EstadoAprobacion {
  return ESTADOS_EMPRESA.some((e) => e === valor);
}
