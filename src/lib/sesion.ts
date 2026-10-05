import { createSupabaseServerClient } from "@/lib/supabase-server";

export type SesionData = {
  nombre: string;
  apellido: string;
  rol: string | null;
  avatarUrl: string | null;
  ajuste: { x: number; y: number; zoom: number } | null;
  profileHref: string;
};

export async function obtenerSesionActual(): Promise<SesionData | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: u }, { data: avatarActivo }] = await Promise.all([
    supabase
      .from("usuarios")
      .select("nombre, apellido, rol")
      .eq("id", user.id)
      .single(),
    supabase
      .from("archivos_usuario")
      .select("ruta, ajuste_x, ajuste_y, ajuste_zoom")
      .eq("usuario_id", user.id)
      .eq("tipo", "avatar")
      .eq("activo", true)
      .maybeSingle(),
  ]);

  const nombre = u?.nombre ?? (user.user_metadata?.nombre as string) ?? "";
  const apellido = u?.apellido ?? (user.user_metadata?.apellido as string) ?? "";
  const rol: string | null = u?.rol ?? null;

  const profileHref =
    rol === "empresa" ? "/empresa" :
    rol === "municipalidad" ? "/admin" :
    "/perfil";

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

  return { nombre, apellido, rol, avatarUrl, ajuste, profileHref };
}
