"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { err, errConRef, fromSupabaseError, okMsg, type Resultado } from "@/lib/resultado";

type EstadoPostulante = "en_curso" | "completado";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MENSAJES: Record<EstadoPostulante, string> = {
  en_curso: "Marcaste el curso como empezado.",
  completado: "¡Bien! Le avisamos a la Oficina de Empleo que completaste el curso.",
};

export async function actualizarEstadoMiCurso(
  asignacionId: string,
  estado: EstadoPostulante,
): Promise<Resultado<void>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("NO_AUTENTICADO");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (!usuario || usuario.rol !== "postulante") return err("SIN_PERMISO");

  if (!UUID.test(asignacionId) || (estado !== "en_curso" && estado !== "completado")) {
    return err("DATOS_INVALIDOS");
  }

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
