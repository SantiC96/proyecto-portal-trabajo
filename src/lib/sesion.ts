import { createSupabaseServerClient } from "@/lib/supabase-server";
import { obtenerUsuarioActual, panelDeRol, type Rol } from "@/lib/auth";
import {
  obtenerResumenNotificaciones,
  type ResumenNotificaciones,
} from "@/lib/notificaciones";

export type SesionData = {
  nombre: string;
  apellido: string;
  rol: Rol | null;
  avatarUrl: string | null;
  ajuste: { x: number; y: number; zoom: number } | null;
  profileHref: string;
  /** Solo postulantes: cursos asignados o en curso (indicador de la navbar). */
  cursosPendientes: number;
  /** Solo municipalidad: campanita de notificaciones de la navbar. */
  notificaciones: ResumenNotificaciones | null;
};

function textoDeMetadata(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

export async function obtenerSesionActual(): Promise<SesionData | null> {
  const user = await obtenerUsuarioActual();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const { data: avatarActivo } = await supabase
    .from("archivos_usuario")
    .select("ruta, ajuste_x, ajuste_y, ajuste_zoom")
    .eq("usuario_id", user.id)
    .eq("tipo", "avatar")
    .eq("activo", true)
    .maybeSingle();

  const u = user.perfil;
  const nombre = u?.nombre ?? textoDeMetadata(user.metadata.nombre);
  const apellido = u?.apellido ?? textoDeMetadata(user.metadata.apellido);
  const rol = u?.rol ?? null;

  const profileHref = rol ? panelDeRol(rol) : "/perfil";

  let cursosPendientes = 0;
  if (rol === "postulante") {
    const { count } = await supabase
      .rpc("mis_cursos_con_estado", undefined, { count: "exact", head: true })
      .in("estado", ["asignado", "en_curso"]);
    cursosPendientes = count ?? 0;
  }

  const notificaciones =
    rol === "municipalidad" ? await obtenerResumenNotificaciones(user.id) : null;

  let avatarUrl: string | null = null;
  if (avatarActivo?.ruta) {
    const { data: signed } = await supabase.storage
      .from("avatares")
      .createSignedUrl(avatarActivo.ruta, 3600);
    avatarUrl = signed?.signedUrl ?? null;
  }

  const ajuste = avatarActivo
    ? {
        x: Number(avatarActivo.ajuste_x ?? 50),
        y: Number(avatarActivo.ajuste_y ?? 50),
        zoom: Number(avatarActivo.ajuste_zoom ?? 1),
      }
    : null;

  return {
    nombre,
    apellido,
    rol,
    avatarUrl,
    ajuste,
    profileHref,
    cursosPendientes,
    notificaciones,
  };
}
