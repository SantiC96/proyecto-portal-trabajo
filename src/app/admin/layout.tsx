import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { PublicFooter } from "@/components/public/public-footer";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!usuario || usuario.rol !== "municipalidad") redirect("/");

  return (
    <>
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </>
  );
}
