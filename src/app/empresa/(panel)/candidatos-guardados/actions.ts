"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirEmpresa } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { err, errConRef, okMsg, type Resultado } from "@/lib/resultado";
import { esUuid, LARGO_MAXIMO, validarTextoOpcional } from "@/lib/validaciones";
import type { Insert } from "@/types/db";

/**
 * empresa_id lo completa el trigger candidatos_guardados_set_empresa y el
 * grant de columna no deja enviarlo (migration_028). El generador de tipos no
 * lo sabe y lo marca obligatorio: este es el único lugar donde se completa el
 * tipo de inserción.
 */
function filaGuardado(
  fila: Omit<Insert<"candidatos_guardados">, "empresa_id">,
): Insert<"candidatos_guardados"> {
  return fila as Insert<"candidatos_guardados">;
}

export async function guardarCandidato(
  postulanteId: string,
  ofertaOrigenId: string | null,
  nota: string | null
): Promise<Resultado<void>> {
  const auth = await requerirEmpresa({ aprobada: true });
  if (!auth.ok) return auth;

  if (!esUuid(postulanteId)) return err("DATOS_INVALIDOS");
  if (ofertaOrigenId !== null && !esUuid(ofertaOrigenId)) return err("DATOS_INVALIDOS");
  const errNota = validarTextoOpcional(nota, LARGO_MAXIMO.nota);
  if (errNota) return err("DATOS_INVALIDOS", `Nota: ${errNota}`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("candidatos_guardados").insert(
    filaGuardado({
      postulante_id: postulanteId,
      oferta_origen_id: ofertaOrigenId,
      nota: nota || null,
    }),
  );

  if (error) {
    if (error.code === "23505") {
      return err("CONFLICTO", "Este candidato ya está guardado.");
    }
    const ref = logError("guardarCandidato", error, { postulanteId });
    return errConRef("ERROR_INTERNO", "No se pudo guardar el candidato.", ref);
  }

  revalidatePath("/empresa/candidatos-guardados");
  return okMsg("Candidato guardado.");
}

export async function quitarGuardado(guardadoId: string): Promise<Resultado<void>> {
  const auth = await requerirEmpresa({ aprobada: true });
  if (!auth.ok) return auth;

  if (!esUuid(guardadoId)) return err("DATOS_INVALIDOS");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("candidatos_guardados")
    .delete()
    .eq("id", guardadoId);

  if (error) {
    const ref = logError("quitarGuardado", error, { guardadoId });
    return errConRef("ERROR_INTERNO", "No se pudo quitar el candidato.", ref);
  }

  revalidatePath("/empresa/candidatos-guardados");
  return okMsg("Candidato quitado de guardados.");
}

export async function actualizarNotaGuardado(
  guardadoId: string,
  nota: string | null
): Promise<Resultado<void>> {
  const auth = await requerirEmpresa({ aprobada: true });
  if (!auth.ok) return auth;

  if (!esUuid(guardadoId)) return err("DATOS_INVALIDOS");
  const errNota = validarTextoOpcional(nota, LARGO_MAXIMO.nota);
  if (errNota) return err("DATOS_INVALIDOS", `Nota: ${errNota}`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("candidatos_guardados")
    .update({ nota: nota?.trim() || null })
    .eq("id", guardadoId);

  if (error) {
    const ref = logError("actualizarNotaGuardado", error, { guardadoId });
    return errConRef("ERROR_INTERNO", "No se pudo actualizar la nota.", ref);
  }

  revalidatePath("/empresa/candidatos-guardados");
  return okMsg("Nota actualizada.");
}
