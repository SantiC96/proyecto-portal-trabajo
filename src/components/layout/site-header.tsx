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

  const { data: u } = await supabase
    .from("usuarios")
    .select("nombre, apellido, rol, avatar_path")
    .eq("id", user.id)
    .single();

  const nombre = u?.nombre ?? (user.user_metadata?.nombre as string) ?? "";
  const apellido = u?.apellido ?? (user.user_metadata?.apellido as string) ?? "";
  const rol: string | null = u?.rol ?? null;

  let avatarUrl: string | null = null;
  if (u?.avatar_path) {
    const { data: signed } = await supabase.storage
      .from("avatares")
      .createSignedUrl(u.avatar_path, 3600);
    avatarUrl = signed?.signedUrl ?? null;
  }

  return <Navbar session={{ nombre, apellido, rol, avatarUrl }} />;
}
