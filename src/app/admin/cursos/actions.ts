"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { err, errConRef, fromSupabaseError, okMsg, type Resultado, type ResultadoError } from "@/lib/resultado";
import {
  MENSAJE_CURSO_ACTIVO,
  MENSAJE_SOLO_SI_NECESITA_CURSO,
  type EstadoCursosPostulante,
} from "@/lib/cursos";

type CursoData = {
  nombre: string;
  descripcion: string | null;
  link: string | null;
  indicaciones: string | null;
};

async function verificarMunicipalidad(): Promise<{ ok: true; userId: string } | ResultadoError> {
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

  if (!usuario || usuario.rol !== "municipalidad") return err("SIN_PERMISO");

  return { ok: true, userId: user.id };
}

function validarCursoData(data: CursoData): string | null {
  if (!data.nombre.trim()) return "El nombre del curso es obligatorio.";
  if (data.link && !data.link.startsWith("https://"))
    return "El link debe comenzar con https://";
  return null;
}

function revalidarCursos(cursoId?: string) {
  revalidatePath("/admin/cursos");
  revalidatePath("/admin");
  if (cursoId) revalidatePath(`/admin/cursos/${cursoId}`);
}

export async function crearCurso(data: CursoData): Promise<Resultado<void>> {
  const auth = await verificarMunicipalidad();
  if (!auth.ok) return auth;

  const errVal = validarCursoData(data);
  if (errVal) return err("DATOS_INVALIDOS", errVal);

  const supabase = await createSupabaseServerClient();
  const { data: nuevo, error } = await supabase
    .from("cursos")
    .insert({
      nombre: data.nombre.trim(),
      descripcion: data.descripcion?.trim() || null,
      link: data.link?.trim() || null,
      indicaciones: data.indicaciones?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !nuevo) {
    const ref = logError("crearCurso", error);
    return errConRef("ERROR_INTERNO", "No se pudo crear el curso. Intentá de nuevo.", ref);
  }

  revalidarCursos(nuevo.id);
  redirect(`/admin/cursos/${nuevo.id}?aviso=creado`);
}

export async function editarCurso(
  cursoId: string,
  data: CursoData
): Promise<Resultado<void>> {
  const auth = await verificarMunicipalidad();
  if (!auth.ok) return auth;

  const errVal = validarCursoData(data);
  if (errVal) return err("DATOS_INVALIDOS", errVal);

  const supabase = await createSupabaseServerClient();
  const { data: updated, error } = await supabase
    .from("cursos")
    .update({
      nombre: data.nombre.trim(),
      descripcion: data.descripcion?.trim() || null,
      link: data.link?.trim() || null,
      indicaciones: data.indicaciones?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cursoId)
    .select("id");

  if (error) {
    const ref = logError("editarCurso", error, { cursoId });
    return errConRef("ERROR_INTERNO", "No se pudo actualizar el curso. Intentá de nuevo.", ref);
  }
  if (!updated || updated.length === 0) return err("NO_ENCONTRADO", "Curso no encontrado.");

  revalidarCursos(cursoId);
  return okMsg("Curso actualizado.");
}

export async function toggleActivoCurso(
  cursoId: string,
  nuevoEstado: boolean
): Promise<Resultado<void>> {
  const auth = await verificarMunicipalidad();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  const { data: updated, error } = await supabase
    .from("cursos")
    .update({ activo: nuevoEstado, updated_at: new Date().toISOString() })
    .eq("id", cursoId)
    .select("id");

  if (error) {
    const ref = logError("toggleActivoCurso", error, { cursoId });
    return errConRef("ERROR_INTERNO", "No se pudo actualizar el estado del curso.", ref);
  }
  if (!updated || updated.length === 0) return err("NO_ENCONTRADO", "Curso no encontrado.");

  revalidarCursos(cursoId);
  return okMsg(nuevoEstado ? "Curso activado." : "Curso desactivado.");
}

export async function eliminarCurso(cursoId: string): Promise<Resultado<void>> {
  const auth = await verificarMunicipalidad();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();

  const { count } = await supabase
    .from("asignaciones_curso")
    .select("*", { count: "exact", head: true })
    .eq("curso_id", cursoId);

  if ((count ?? 0) > 0)
    return err("REGLA_DE_NEGOCIO", "No se puede eliminar un curso que ya tiene asignaciones.");

  const { error } = await supabase.from("cursos").delete().eq("id", cursoId);

  if (error) {
    const ref = logError("eliminarCurso", error, { cursoId });
    return errConRef("ERROR_INTERNO", "No se pudo eliminar el curso.", ref);
  }

  revalidarCursos();
  redirect("/admin/cursos");
}

export async function asignarCurso(
  postulanteId: string,
  cursoId: string,
  nota: string
): Promise<Resultado<void>> {
  const auth = await verificarMunicipalidad();
  if (!auth.ok) return auth;

  if (!cursoId) return err("DATOS_INVALIDOS", "Debés seleccionar un curso.");

  const supabase = await createSupabaseServerClient();

  // La misma regla la aplica el trigger asignaciones_curso_alta (migration_039).
  const { data: estados, error: errorEstado } = await supabase.rpc(
    "estado_cursos_postulantes",
    { p_postulante_ids: [postulanteId] }
  );
  if (errorEstado) {
    const ref = logError("asignarCurso_estado", errorEstado, { postulanteId });
    return errConRef("ERROR_INTERNO", "No se pudo asignar el curso. Intentá de nuevo.", ref);
  }
  const estado = ((estados ?? []) as EstadoCursosPostulante[])[0];
  if (!estado) return err("NO_ENCONTRADO", "Postulante no encontrado.");
  if (estado.asignacion_activa_id) return err("REGLA_DE_NEGOCIO", MENSAJE_CURSO_ACTIVO);
  if (!estado.necesita_curso) return err("REGLA_DE_NEGOCIO", MENSAJE_SOLO_SI_NECESITA_CURSO);

  const { error } = await supabase.from("asignaciones_curso").insert({
    postulante_id: postulanteId,
    curso_id: cursoId,
    asignado_por: auth.userId,
    nota: nota.trim() || null,
  });

  if (error) {
    // P0001 messages (e.g. "El curso no está activo") are user-friendly and safe to show
    if (error.code === "P0001" || error.code === "23505") {
      return fromSupabaseError(error);
    }
    const ref = logError("asignarCurso", error, { postulanteId, cursoId });
    return errConRef("ERROR_INTERNO", "No se pudo asignar el curso. Intentá de nuevo.", ref);
  }

  revalidarAsignaciones(cursoId, postulanteId);
  return okMsg("Curso asignado.");
}

function revalidarAsignaciones(cursoId: string, postulanteId: string) {
  revalidatePath("/admin/postulantes");
  revalidatePath(`/admin/postulantes/${postulanteId}`);
  revalidatePath("/admin/postulaciones", "layout");
  revalidatePath("/admin");
  revalidatePath("/admin/cursos");
  revalidatePath(`/admin/cursos/${cursoId}`);
  revalidatePath("/mis-postulaciones");
  revalidatePath("/mis-cursos", "layout");
  revalidatePath("/perfil");
}
