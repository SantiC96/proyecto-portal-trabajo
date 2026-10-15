"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirRol } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { err, errConRef, fromSupabaseError, okMsg, type Resultado } from "@/lib/resultado";
import { esUuid } from "@/lib/validaciones";

type EstadoPostulante = "en_curso" | "completado";

const MENSAJES: Record<EstadoPostulante, string> = {
  en_curso: "Marcaste el curso como empezado.",
  completado: "¡Bien! Le avisamos a la Oficina de Empleo que completaste el curso.",
};

export async function actualizarEstadoMiCurso(
  asignacionId: string,
  estado: EstadoPostulante,
): Promise<Resultado<void>> {
  const auth = await requerirRol("postulante");
  if (!auth.ok) return auth;

  if (!esUuid(asignacionId) || (estado !== "en_curso" && estado !== "completado")) {
    return err("DATOS_INVALIDOS");
  }

  const supabase = await createSupabaseServerClient();

  // La función verifica que la asignación sea del postulante y el trigger
  // valida la transición (migration_035).
  const { error } = await supabase.rpc("actualizar_estado_mi_curso", {
    p_asignacion_id: asignacionId,
    p_estado: estado,
  });

  if (error) {
    if (error.code === "P0001" || error.code === "42501") return fromSupabaseError(error);
    const ref = logError("actualizarEstadoMiCurso", error, { asignacionId, estado });
    return errConRef("ERROR_INTERNO", "No se pudo actualizar el curso. Intentá de nuevo.", ref);
  }

  revalidatePath("/mis-cursos");
  revalidatePath(`/mis-cursos/${asignacionId}`);
  revalidatePath("/mis-postulaciones");
  revalidatePath("/perfil");
  // El indicador de cursos pendientes de la navbar vive en el layout raíz.
  revalidatePath("/", "layout");
  revalidatePath("/admin/postulantes");
  revalidatePath("/admin/cursos");
  revalidatePath("/admin");
  return okMsg(MENSAJES[estado]);
}
