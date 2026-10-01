import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Navbar } from "@/components/public/navbar";
import { PublicFooter } from "@/components/public/public-footer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: u } = await supabase
    .from("usuarios")
    .select("nombre, apellido, rol, avatar_path")
    .eq("id", user.id)
    .single();

  // Fallback a user_metadata si la fila todavía no existe
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

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar session={{ nombre, apellido, rol, avatarUrl }} />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
