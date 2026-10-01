import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Inicio | Portal de Empleo Funes",
};

export default async function InicioPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nombre = (user?.user_metadata?.nombre as string) ?? "";
  const apellido = (user?.user_metadata?.apellido as string) ?? "";

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Bienvenido/a, {nombre} {apellido}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Portal de Empleo · Municipalidad de Funes
      </p>
    </section>
  );
}
