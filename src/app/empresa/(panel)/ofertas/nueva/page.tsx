import type { Metadata } from "next";
import { getCategoriasConId } from "@/lib/ofertas";
import { OfertaForm } from "@/app/empresa/(panel)/ofertas/_components/oferta-form";
import { requerirEmpresaPagina } from "@/lib/auth";
import { BotonVolver } from "@/components/ui/boton-volver";

export const metadata: Metadata = {
  title: "Publicar oferta | Portal de Empleo Funes",
};

export default async function NuevaOfertaPage() {
  await requerirEmpresaPagina("/empresa");
  const categorias = await getCategoriasConId();

  return (
    <section className="contenido-lectura-ancho">
      <BotonVolver href="/empresa/ofertas" />

      <div className="mt-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Publicar oferta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Completá los datos del puesto. La oferta queda pendiente hasta que la Oficina de Empleo
          la revise.
        </p>
      </div>

      <div className="mt-8 rounded-[var(--radius-lg)] border border-border bg-white p-6 shadow-xs">
        <OfertaForm categorias={categorias} />
      </div>
    </section>
  );
}
