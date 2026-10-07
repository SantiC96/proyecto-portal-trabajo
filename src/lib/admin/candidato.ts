import { createSupabaseServerClient } from "@/lib/supabase-server";

export type DatosCandidatoResult = {
  postulante: {
    id: string;
    usuario_id: string;
    dni: string | null;
    domicilio: string | null;
  };
  usuario: {
    id: string;
    nombre: string;
    apellido: string;
    telefono: string | null;
  };
  email: string | null;
  categorias: { id: string; nombre: string }[];
  avatar: {
    url: string | null;
    ajuste?: { x: number; y: number; zoom: number };
  };
  cvUrl: string | null;
};

export async function obtenerCandidato(
  postulanteId: string
): Promise<DatosCandidatoResult | null> {
  const supabase = await createSupabaseServerClient();

  type PostulanteRow = {
    id: string;
    usuario_id: string;
    dni: string | null;
    domicilio: string | null;
    usuarios: {
      id: string;
      nombre: string;
      apellido: string;
      telefono: string | null;
    } | null;
  };

  const { data: raw } = await supabase
    .from("postulantes")
    .select(
      "id, usuario_id, dni, domicilio, usuarios!usuario_id(id, nombre, apellido, telefono)"
    )
    .eq("id", postulanteId)
    .single();

  if (!raw) return null;

  const postulante = raw as unknown as PostulanteRow;
  const usuario = postulante.usuarios;
  if (!usuario) return null;

  const usuarioId = postulante.usuario_id;

  type CategoriaRow = { categorias: { id: string; nombre: string } | null };
  type ArchivoRow = {
    tipo: string;
    ruta: string;
    ajuste_x: number;
    ajuste_y: number;
    ajuste_zoom: number;
  };

  const [categoriasResult, archivosResult, emailResult] = await Promise.all([
    supabase
      .from("postulante_categorias")
      .select("categorias!categoria_id(id, nombre)")
      .eq("postulante_id", postulanteId),
    supabase
      .from("archivos_usuario")
      .select("tipo, ruta, ajuste_x, ajuste_y, ajuste_zoom")
      .eq("usuario_id", usuarioId)
      .eq("activo", true),
    supabase.rpc("emails_de_usuarios", { ids: [usuarioId] }),
  ]);

  const categorias = (
    (categoriasResult.data ?? []) as unknown as CategoriaRow[]
  )
    .map((r) => r.categorias)
    .filter((c): c is { id: string; nombre: string } => Boolean(c));

  const archivos = (archivosResult.data ?? []) as unknown as ArchivoRow[];
  const cvArchivo = archivos.find((a) => a.tipo === "cv") ?? null;
  const avatarArchivo = archivos.find((a) => a.tipo === "avatar") ?? null;

  const emailRows = (emailResult.data ?? []) as { id: string; email: string }[];
  const email = emailRows[0]?.email ?? null;

  const [cvUrlResult, avatarUrlResult] = await Promise.all([
    cvArchivo
      ? supabase.storage.from("cvs").createSignedUrl(cvArchivo.ruta, 600)
      : Promise.resolve({ data: null }),
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
    cvUrl: cvUrlResult.data?.signedUrl ?? null,
  };
}
