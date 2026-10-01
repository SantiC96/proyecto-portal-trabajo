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

  const nombre = (user.user_metadata?.nombre as string) ?? "";
  const apellido = (user.user_metadata?.apellido as string) ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar session={{ nombre, apellido }} />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
