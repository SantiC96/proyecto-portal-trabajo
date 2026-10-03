import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Navbar } from "@/components/public/navbar";

export async function SiteHeader() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <Navbar />;
  }

  const [{ data: u }, { data: avatarActivo }] = await Promise.all([
    supabase
      .from("usuarios")
      .select("nombre, apellido, rol")
      .eq("id", user.id)
      .single(),
    supabase
      .from("archivos_usuario")
      .select("ruta")
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

  return <Navbar session={{ nombre, apellido, rol, avatarUrl, profileHref }} />;
}
