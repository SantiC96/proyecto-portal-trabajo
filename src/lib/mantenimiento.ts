import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logError } from "@/lib/logger";

export type ResultadoTarea = { tarea: string; ok: boolean; cantidad: number };

type Tarea = { nombre: string; ejecutar: () => Promise<number> };

/**
 * Borra de verdad las ofertas eliminadas hace más de 30 días, con sus filas
 * dependientes (purgar_ofertas_eliminadas, migration_051; solo service role).
 */
async function purgarOfertasEliminadas(): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("purgar_ofertas_eliminadas");
  if (error) throw error;
  return data ?? 0;
}

// Para sumar la limpieza de Storage (CVs y fotos desactivados) se agrega acá
// otra tarea: cada una corre aunque la anterior falle.
const TAREAS: Tarea[] = [{ nombre: "ofertas_eliminadas", ejecutar: purgarOfertasEliminadas }];

export async function ejecutarMantenimiento(): Promise<ResultadoTarea[]> {
  const resultados: ResultadoTarea[] = [];
  for (const tarea of TAREAS) {
    try {
      resultados.push({ tarea: tarea.nombre, ok: true, cantidad: await tarea.ejecutar() });
    } catch (error) {
      logError(`mantenimiento_${tarea.nombre}`, error);
      resultados.push({ tarea: tarea.nombre, ok: false, cantidad: 0 });
    }
  }
  return resultados;
}
