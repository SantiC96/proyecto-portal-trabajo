import { JobDirectory } from "@/components/public/job-directory";
import { PublicFooter } from "@/components/public/public-footer";
import { getCategorias, leerFiltrosOfertasPublicas } from "@/lib/ofertas";

export const metadata = {
  title: "Ofertas laborales | Portal de Empleo Funes",
  description:
    "Explorá todas las vacantes activas de comercios, empresas e industrias de la Municipalidad de Funes.",
};

export default async function OfertasPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    categoria?: string;
    modalidad?: string;
    pagina?: string;
  }>;
}) {
  const params = await searchParams;
  const categorias = await getCategorias();
  const filtros = leerFiltrosOfertasPublicas(params, categorias);

  return (
    <>
      <main className="flex-1">
        <JobDirectory
          ruta="/ofertas"
          searchParams={params}
          categorias={categorias}
          filtros={filtros}
        />
      </main>

      <PublicFooter />
    </>
  );
}
