"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type ActionResult = { error?: string };

type CursoData = {
  nombre: string;
  descripcion: string | null;
  link: string | null;
  indicaciones: string | null;
};

async function verificarMunicipalidad(): Promise<{ error: string } | { userId: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!usuario || usuario.rol !== "municipalidad")
    return { error: "No tenés permiso para realizar esta acción." };

  return { userId: user.id };
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

export async function crearCurso(data: CursoData): Promise<ActionResult> {
  const auth = await verificarMunicipalidad();
  if ("error" in auth) return auth;

  const errVal = validarCursoData(data);
  if (errVal) return { error: errVal };

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
    console.error("[crearCurso]", error);
    return { error: "No se pudo crear el curso. Intentá de nuevo." };
  }

  revalidarCursos(nuevo.id);
  redirect(`/admin/cursos/${nuevo.id}`);
}

export async function editarCurso(
  cursoId: string,
  data: CursoData
): Promise<ActionResult> {
  const auth = await verificarMunicipalidad();
  if ("error" in auth) return auth;

  const errVal = validarCursoData(data);
  if (errVal) return { error: errVal };

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
    console.error("[editarCurso]", error);
    return { error: "No se pudo actualizar el curso. Intentá de nuevo." };
  }
  if (!updated || updated.length === 0) return { error: "Curso no encontrado." };

  revalidarCursos(cursoId);
  return {};
}

export async function toggleActivoCurso(
  cursoId: string,
  nuevoEstado: boolean
): Promise<ActionResult> {
  const auth = await verificarMunicipalidad();
  if ("error" in auth) return auth;

  const supabase = await createSupabaseServerClient();
  const { data: updated, error } = await supabase
    .from("cursos")
    .update({ activo: nuevoEstado, updated_at: new Date().toISOString() })
    .eq("id", cursoId)
    .select("id");

  if (error) {
    console.error("[toggleActivoCurso]", error);
    return { error: "No se pudo actualizar el estado del curso." };
  }
  if (!updated || updated.length === 0) return { error: "Curso no encontrado." };

  revalidarCursos(cursoId);
  return {};
}

export async function eliminarCurso(cursoId: string): Promise<ActionResult> {
  const auth = await verificarMunicipalidad();
  if ("error" in auth) return auth;

  const supabase = await createSupabaseServerClient();

  const { count } = await supabase
    .from("asignaciones_curso")
    .select("*", { count: "exact", head: true })
    .eq("curso_id", cursoId);

  if ((count ?? 0) > 0)
    return { error: "No se puede eliminar un curso que ya tiene asignaciones." };

  const { error } = await supabase.from("cursos").delete().eq("id", cursoId);

  if (error) {
    console.error("[eliminarCurso]", error);
    return { error: "No se pudo eliminar el curso." };
  }

  revalidarCursos();
  redirect("/admin/cursos");
}

export async function asignarCurso(
  postulanteId: string,
  cursoId: string,
  nota: string
): Promise<ActionResult> {
  const auth = await verificarMunicipalidad();
  if ("error" in auth) return auth;

  if (!cursoId) return { error: "Debés seleccionar un curso." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("asignaciones_curso").insert({
    postulante_id: postulanteId,
    curso_id: cursoId,
    asignado_por: auth.userId,
    nota: nota.trim() || null,
  });

  if (error) {
    console.error("[asignarCurso]", error);
    if (error.message?.includes("no está activo"))
      return { error: "El curso seleccionado no está activo." };
    return { error: "No se pudo asignar el curso. Intentá de nuevo." };
  }

  revalidatePath("/admin/postulantes");
  revalidatePath(`/admin/postulantes/${postulanteId}`);
  revalidatePath("/admin");
  revalidatePath(`/admin/cursos/${cursoId}`);
  revalidatePath("/mis-postulaciones");
  return {};
}
