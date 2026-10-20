import { createSupabaseServerClient } from "@/lib/supabase-server";
import { COLUMNAS_CV, consultaCvsDisponibles, conUrlsFirmadas, type CvVista } from "@/lib/cvs";
import { logError } from "@/lib/logger";
import type { Tabla } from "@/types/db";

type Categoria = Pick<Tabla<"categorias">, "id" | "nombre">;

export type DatosCandidatoResult = {
  postulante: Pick<
    Tabla<"postulantes">,
    | "id"
    | "usuario_id"
    | "dni"
    | "domicilio"
    | "nivel_educativo"
    | "situacion_laboral"
    | "disponibilidad"
    | "experiencia_laboral"
  >;
  usuario: Pick<Tabla<"usuarios">, "id" | "nombre" | "apellido" | "telefono">;
  email: string | null;
  categorias: Categoria[];
  avatar: {
    url: string | null;
    ajuste?: { x: number; y: number; zoom: number };
  };
  /** CVs disponibles, del más nuevo al más viejo. */
  cvs: CvVista[];
};

/**
 * CV que se muestra en una postulación: el elegido al postularse
 * (cv_archivo_id) o, si es NULL, el disponible más reciente (migration_054).
 */
export type CvDePostulacion = {
  cv: CvVista;
  /** false: la postulación no tiene CV elegido y se muestra el más reciente. */
  elegido: boolean;
  /** El postulante lo eliminó de su perfil (la oficina lo sigue viendo). */
  eliminado: boolean;
};

export async function obtenerCandidato(
  postulanteId: string
): Promise<DatosCandidatoResult | null> {
  const supabase = await createSupabaseServerClient();

  const { data: postulante } = await supabase
    .from("postulantes")
    .select(
      "id, usuario_id, dni, domicilio, nivel_educativo, situacion_laboral, disponibilidad, experiencia_laboral, usuarios!usuario_id(id, nombre, apellido, telefono)"
    )
    .eq("id", postulanteId)
    .single();

  if (!postulante) return null;

  const usuario = postulante.usuarios;
  if (!usuario) return null;

  const usuarioId = postulante.usuario_id;

  const [categoriasResult, avatarResult, cvsResult, emailResult] = await Promise.all([
    supabase
      .from("postulante_categorias")
      .select("categorias!categoria_id(id, nombre)")
      .eq("postulante_id", postulanteId),
    supabase
      .from("archivos_usuario")
      .select("ruta, ajuste_x, ajuste_y, ajuste_zoom")
      .eq("usuario_id", usuarioId)
      .eq("tipo", "avatar")
      .eq("activo", true)
      .maybeSingle(),
    consultaCvsDisponibles(supabase, usuarioId),
    supabase.rpc("emails_de_usuarios", { ids: [usuarioId] }),
  ]);

  const categorias = (categoriasResult.data ?? [])
    .map((r) => r.categorias)
    .filter((c): c is Categoria => Boolean(c));

  const avatarArchivo = avatarResult.data;
  if (cvsResult.error) logError("obtenerCandidato:cvs", cvsResult.error, { postulanteId });

  const email = emailResult.data?.[0]?.email ?? null;

  const [cvs, avatarUrlResult] = await Promise.all([
    conUrlsFirmadas(supabase, cvsResult.data ?? [], 600),
    avatarArchivo
      ? supabase.storage
          .from("avatares")
          .createSignedUrl(avatarArchivo.ruta, 600)
      : Promise.resolve({ data: null }),
  ]);

  return {
    postulante: {
      id: postulante.id,
      usuario_id: postulante.usuario_id,
      dni: postulante.dni,
      domicilio: postulante.domicilio,
      nivel_educativo: postulante.nivel_educativo,
      situacion_laboral: postulante.situacion_laboral,
      disponibilidad: postulante.disponibilidad,
      experiencia_laboral: postulante.experiencia_laboral,
    },
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      telefono: usuario.telefono,
    },
    email,
    categorias,
    avatar: {
      url: avatarUrlResult.data?.signedUrl ?? null,
      ajuste: avatarArchivo
        ? {
            x: Number(avatarArchivo.ajuste_x),
            y: Number(avatarArchivo.ajuste_y),
            zoom: Number(avatarArchivo.ajuste_zoom),
          }
        : undefined,
    },
    cvs,
  };
}

export async function obtenerCvDePostulacion(
  cvArchivoId: string | null,
  cvsDisponibles: CvVista[],
): Promise<CvDePostulacion | null> {
  if (!cvArchivoId) {
    const masReciente = cvsDisponibles[0];
    return masReciente ? { cv: masReciente, elegido: false, eliminado: false } : null;
  }

  const disponible = cvsDisponibles.find((cv) => cv.id === cvArchivoId);
  if (disponible) return { cv: disponible, elegido: true, eliminado: false };

  // Eliminado por el postulante: la oficina lee todos los archivos (018).
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("archivos_usuario")
    .select(COLUMNAS_CV)
    .eq("id", cvArchivoId)
    .eq("tipo", "cv")
    .maybeSingle();
  if (error) logError("obtenerCvDePostulacion", error, { cvArchivoId });
  if (!data) return null;

  const [cv] = await conUrlsFirmadas(supabase, [data], 600);
  return { cv, elegido: true, eliminado: true };
}
