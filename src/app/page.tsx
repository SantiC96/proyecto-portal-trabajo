import { Navbar } from "@/components/public/navbar";
import { Hero } from "@/components/public/hero";
import { JobDirectory } from "@/components/public/job-directory";
import { HowItWorks } from "@/components/public/how-it-works";
import { PublicFooter } from "@/components/public/public-footer";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOfertasActivas, getCategorias } from "@/lib/ofertas";

export default async function HomePage() {
  const [supabase, ofertas, categorias] = await Promise.all([
    createSupabaseServerClient(),
    getOfertasActivas(),
    getCategorias(),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const session = user
    ? {
        nombre: (user.user_metadata?.nombre as string) ?? "",
        apellido: (user.user_metadata?.apellido as string) ?? "",
      }
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f8f4] text-[#1b2926]">
      <Navbar session={session} />

      <main className="flex-1">
        <Hero />
        <JobDirectory ofertas={ofertas} categorias={categorias} />
        <HowItWorks />
      </main>

      <PublicFooter />
    </div>
  );
}
