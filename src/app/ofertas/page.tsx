import { JobDirectory } from "@/components/public/job-directory";
import { PublicFooter } from "@/components/public/public-footer";
import { getOfertasActivas, getCategorias } from "@/lib/ofertas";

export const metadata = {
  title: "Ofertas laborales | Portal de Empleo Funes",
  description:
    "Explorá todas las vacantes activas de comercios, empresas e industrias de la Municipalidad de Funes.",
};

export default async function OfertasPage() {
  const [ofertas, categorias] = await Promise.all([
    getOfertasActivas(),
    getCategorias(),
  ]);

  return (
    <>
      <main className="flex-1">
        <JobDirectory ofertas={ofertas} categorias={categorias} />
      </main>

      <PublicFooter />
    </>
  );
}
