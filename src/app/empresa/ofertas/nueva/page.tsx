import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCategoriasConId } from "@/lib/ofertas";
import { OfertaForm } from "@/app/empresa/ofertas/_components/oferta-form";

export const metadata: Metadata = {
  title: "Publicar oferta | Portal de Empleo Funes",
};

export default async function NuevaOfertaPage() {
  const categorias = await getCategoriasConId();

  return (
    <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/empresa/ofertas"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground-strong transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a mis ofertas
      </Link>

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
