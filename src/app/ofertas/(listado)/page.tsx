import { JobDirectory } from "@/components/public/job-directory";
import { getCategorias, leerFiltrosOfertasPublicas } from "@/lib/ofertas";
import { BotonVolver } from "@/components/ui/boton-volver";

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
    // Se pueden repetir: ?categoria=A&categoria=B&modalidad=Presencial.
    categoria?: string | string[];
    modalidad?: string | string[];
    pagina?: string;
  }>;
}) {
  const params = await searchParams;
  const categorias = await getCategorias();
  const filtros = leerFiltrosOfertasPublicas(params, categorias);

  return (
    <>
      <main className="flex flex-1 flex-col gap-4">
        <BotonVolver href="/" destacado />
        <JobDirectory
          ruta="/ofertas"
          searchParams={params}
          categorias={categorias}
          filtros={filtros}
        />
      </main>

    </>
  );
}
