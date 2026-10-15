import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Tabla } from "@/types/db";

type Categoria = Pick<Tabla<"categorias">, "id" | "nombre">;

export type DatosCandidatoResult = {
  postulante: Pick<Tabla<"postulantes">, "id" | "usuario_id" | "dni" | "domicilio">;
  usuario: Pick<Tabla<"usuarios">, "id" | "nombre" | "apellido" | "telefono">;
  email: string | null;
  categorias: Categoria[];
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

  const { data: postulante } = await supabase
    .from("postulantes")
    .select(
      "id, usuario_id, dni, domicilio, usuarios!usuario_id(id, nombre, apellido, telefono)"
    )
    .eq("id", postulanteId)
    .single();

  if (!postulante) return null;

  const usuario = postulante.usuarios;
  if (!usuario) return null;

  const usuarioId = postulante.usuario_id;

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

  const categorias = (categoriasResult.data ?? [])
    .map((r) => r.categorias)
    .filter((c): c is Categoria => Boolean(c));

  const archivos = archivosResult.data ?? [];
  const cvArchivo = archivos.find((a) => a.tipo === "cv") ?? null;
  const avatarArchivo = archivos.find((a) => a.tipo === "avatar") ?? null;

  const email = emailResult.data?.[0]?.email ?? null;

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
