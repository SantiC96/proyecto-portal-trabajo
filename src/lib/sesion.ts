import { createSupabaseServerClient } from "@/lib/supabase-server";
import { obtenerEmpresaActual, obtenerUsuarioActual, panelDeRol, type Rol } from "@/lib/auth";
import { rutaNotificaciones } from "@/lib/notificaciones";

export type SesionData = {
  /**
   * Nombre que se muestra de la sesión. En una cuenta de empresa es la razón
   * social (con el apellido vacío); si la empresa todavía no tiene fila o el
   * nombre está vacío, queda el de la persona que gestiona la cuenta.
   */
  nombre: string;
  apellido: string;
  rol: Rol | null;
  avatarUrl: string | null;
  ajuste: { x: number; y: number; zoom: number } | null;
  profileHref: string;
  /**
   * Listado de notificaciones del rol (campanita de la navegación). El contador
   * no se carga acá: lo pide la campanita al navegar.
   */
  notificacionesHref: string | null;
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
  let nombre = u?.nombre ?? textoDeMetadata(user.metadata.nombre);
  let apellido = u?.apellido ?? textoDeMetadata(user.metadata.apellido);
  const rol = u?.rol ?? null;

  if (rol === "empresa") {
    const razonSocial = (await obtenerEmpresaActual())?.razon_social.trim();
    if (razonSocial) {
      nombre = razonSocial;
      apellido = "";
    }
  }

  const profileHref = rol ? panelDeRol(rol) : "/perfil";

  const notificacionesHref = rol ? rutaNotificaciones(rol) : null;

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
    notificacionesHref,
  };
}
