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

const BUCKET_POR_TIPO = { cv: "cvs", avatar: "avatares" } as const;
type TipoArchivo = keyof typeof BUCKET_POR_TIPO;

/** Archivos por llamada a Storage y por corrida (el resto queda para mañana). */
const TANDA_STORAGE = 100;
const LIMITE_POR_CORRIDA = 500;

/**
 * Borra de Storage los CVs y fotos eliminados hace más de 30 días y después
 * sus filas (archivos_a_purgar y confirmar_archivos_purgados, migration_054;
 * solo service role). La base ya excluye los CVs de postulaciones en curso.
 *
 * Una fila se confirma solo si su tanda se borró de Storage sin error: si
 * falla, la fila queda y vuelve a salir al día siguiente. Borrar un archivo
 * que ya no está no es un error, así que el reintento también limpia las
 * filas cuyo archivo se borró pero no se llegó a confirmar. Los logs llevan
 * solo el bucket y cantidades: nunca rutas (empiezan con el id del usuario).
 */
async function purgarArchivosEliminados(): Promise<number> {
  const { data: filas, error } = await supabaseAdmin.rpc("archivos_a_purgar", {
    p_limite: LIMITE_POR_CORRIDA,
  });
  if (error) throw error;
  if (filas.length === 0) return 0;

  const borradas: string[] = [];
  let fallidas = 0;

  for (const tipo of Object.keys(BUCKET_POR_TIPO) as TipoArchivo[]) {
    const bucket = BUCKET_POR_TIPO[tipo];
    const delTipo = filas.filter((f) => f.tipo === tipo);
    for (let i = 0; i < delTipo.length; i += TANDA_STORAGE) {
      const tanda = delTipo.slice(i, i + TANDA_STORAGE);
      const { error: errorStorage } = await supabaseAdmin.storage
        .from(bucket)
        .remove(tanda.map((f) => f.ruta));
      if (errorStorage) {
        fallidas += tanda.length;
        logError("mantenimiento_archivos_eliminados:storage", errorStorage, {
          bucket,
          cantidad: tanda.length,
        });
        continue;
      }
      borradas.push(...tanda.map((f) => f.id));
    }
  }

  let confirmadas = 0;
  if (borradas.length > 0) {
    const { data, error: errorConfirmar } = await supabaseAdmin.rpc(
      "confirmar_archivos_purgados",
      { p_ids: borradas },
    );
    if (errorConfirmar) throw errorConfirmar;
    confirmadas = data ?? 0;
  }

  if (fallidas > 0) {
    // La corrida queda como fallida (el cron responde 500) para que se note.
    logError("mantenimiento_archivos_eliminados:parcial", null, { confirmadas, fallidas });
    throw new Error("Purga de archivos incompleta: se reintenta en la próxima corrida.");
  }
  return confirmadas;
}

// Cada tarea corre aunque la anterior falle.
const TAREAS: Tarea[] = [
  { nombre: "ofertas_eliminadas", ejecutar: purgarOfertasEliminadas },
  { nombre: "archivos_eliminados", ejecutar: purgarArchivosEliminados },
];

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
