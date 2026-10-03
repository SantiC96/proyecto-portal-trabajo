import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Building2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Panel de empresa | Portal de Empleo Funes",
};

export default async function EmpresaDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: empresa } = await supabase
    .from("empresas")
    .select("razon_social")
    .eq("usuario_id", user.id)
    .maybeSingle();

  return (
    <section className="mx-auto max-w-xl px-4 py-12 text-center sm:px-6 sm:py-16">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Building2 className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        ¡Bienvenida, {empresa?.razon_social ?? "tu empresa"}!
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Tu cuenta está activa. Próximamente vas a poder publicar ofertas
        laborales y gestionar preselecciones de candidatos desde acá.
      </p>
    </section>
  );
}
