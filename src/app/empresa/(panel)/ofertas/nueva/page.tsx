import type { Metadata } from "next";
import { getCategoriasConId } from "@/lib/ofertas";
import { OfertaForm } from "@/app/empresa/(panel)/ofertas/_components/oferta-form";
import { requerirEmpresaPagina } from "@/lib/auth";
import { BotonVolver } from "@/components/ui/boton-volver";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";

export const metadata: Metadata = {
  title: "Publicar oferta | Portal de Empleo Funes",
};

export default async function NuevaOfertaPage() {
  const empresa = await requerirEmpresaPagina("/empresa");
  const categorias = await getCategoriasConId();

  return (
    <section className="flex w-full flex-col gap-6">
      <BotonVolver href="/empresa/ofertas" destacado />
      <EncabezadoPagina
        banda
        botonesBlancos
        className="-mt-2"
        titulo="Publicar oferta"
        bajada="Completá los datos del puesto. La oferta queda pendiente hasta que la Oficina de Empleo la revise."
      />

      <OfertaForm categorias={categorias} empresaNombre={empresa.razon_social} />
    </section>
  );
}
