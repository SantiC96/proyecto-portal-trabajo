import { Navbar } from "@/components/public/navbar";
import { JobDirectory } from "@/components/public/job-directory";
import { PublicFooter } from "@/components/public/public-footer";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOfertasActivas, getCategorias } from "@/lib/ofertas";

export const metadata = {
  title: "Ofertas laborales | Portal de Empleo Funes",
  description:
    "Explorá todas las vacantes activas de comercios, empresas e industrias de la Municipalidad de Funes.",
};

export default async function OfertasPage() {
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
        <JobDirectory ofertas={ofertas} categorias={categorias} />
      </main>

      <PublicFooter />
    </div>
  );
}
