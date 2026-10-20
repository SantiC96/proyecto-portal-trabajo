import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logError } from "@/lib/logger";
import { accionesDisponibles } from "@/lib/oferta-estados";

export type AccionesOferta = ReturnType<typeof accionesDisponibles>;
export type ProcesosAbiertos = { oficina: number; derivados: number };
export type BajaOferta = { acciones: AccionesOferta; procesos: ProcesosAbiertos };

const SIN_PROCESOS: ProcesosAbiertos = { oficina: 0, derivados: 0 };

/**
 * Acciones de baja de cada oferta (accionesDisponibles) y, para las que se
 * pueden retirar, los procesos abiertos que muestra el diálogo. Lo usan Mis
 * ofertas y el detalle, para que las dos pantallas muestren lo mismo.
 *
 * `ofertas` tienen que ser ofertas de la empresa de la sesión ya leídas con
 * el cliente de la sesión: el conteo de postulaciones usa supabaseAdmin
 * porque la empresa no tiene SELECT en postulaciones.
 */
export async function bajasDeOfertas(
  ofertas: { id: string; estado: string }[],
): Promise<Record<string, BajaOferta>> {
  // Solo una pendiente o una rechazada dependen de si tiene postulaciones.
  const idsConConteo = ofertas
    .filter((o) => o.estado === "pendiente_aprobacion" || o.estado === "rechazada")
    .map((o) => o.id);

  const postulaciones: Record<string, number> = {};
  if (idsConConteo.length > 0) {
    const { data: filas, error } = await supabaseAdmin
      .from("postulaciones")
      .select("oferta_id")
      .in("oferta_id", idsConConteo);
    if (error) logError("bajasDeOfertas_postulaciones", error);
    for (const fila of filas ?? []) {
      postulaciones[fila.oferta_id] = (postulaciones[fila.oferta_id] ?? 0) + 1;
    }
  }

  const acciones: Record<string, AccionesOferta> = {};
  for (const o of ofertas) acciones[o.id] = accionesDisponibles(o.estado, postulaciones[o.id] ?? 0);

  const procesos: Record<string, ProcesosAbiertos> = {};
  const retirables = ofertas.filter((o) => acciones[o.id].mostrarRetirar).map((o) => o.id);
  if (retirables.length > 0) {
    const supabase = await createSupabaseServerClient();
    const { data: filas, error } = await supabase.rpc("procesos_abiertos_ofertas_empresa", {
      p_oferta_ids: retirables,
    });
    if (error) logError("bajasDeOfertas_procesos_abiertos", error);
    for (const fila of filas ?? []) {
      procesos[fila.oferta_id] = { oficina: fila.postulaciones_oficina, derivados: fila.candidatos_derivados };
    }
  }

  return Object.fromEntries(
    ofertas.map((o) => [o.id, { acciones: acciones[o.id], procesos: procesos[o.id] ?? SIN_PROCESOS }]),
  );
}
