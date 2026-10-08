import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getCategoriasConId } from "@/lib/ofertas";
import { OfertaForm } from "@/app/empresa/ofertas/_components/oferta-form";

export const metadata: Metadata = {
  title: "Editar oferta | Portal de Empleo Funes",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarOfertaPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: empresa } = await supabase
    .from("empresas")
    .select("id")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!empresa) redirect("/empresa");

  const { data: oferta } = await supabase
    .from("ofertas")
    .select(
      "id, titulo, descripcion, ubicacion, modalidad, jornada, requisitos, beneficios, estado, oferta_categorias(categoria_id)"
    )
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .maybeSingle();

  if (!oferta) notFound();
  if (oferta.estado === "cerrada") redirect("/empresa/ofertas");
  if (oferta.estado === "pendiente_aprobacion") redirect("/empresa/ofertas?aviso=pendiente");

  const [categorias] = await Promise.all([getCategoriasConId()]);

  const categoriasSeleccionadas = (
    oferta.oferta_categorias as Array<{ categoria_id: string }>
  ).map((oc) => oc.categoria_id);

  const valorInicial = {
    titulo: oferta.titulo as string,
    descripcion: oferta.descripcion as string,
    modalidad: oferta.modalidad as string,
    jornada: oferta.jornada as string,
    requisitos: (oferta.requisitos as string[]) ?? [],
    beneficios: (oferta.beneficios as string[]) ?? [],
    categorias: categoriasSeleccionadas,
  };

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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Editar oferta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Modificá los datos del puesto. Al guardar, la oferta vuelve a revisión.
        </p>
      </div>

      <div className="mt-8 rounded-[var(--radius-lg)] border border-border bg-white p-6 shadow-xs">
        <OfertaForm
          categorias={categorias}
          ofertaId={id}
          valorInicial={valorInicial}
          estaPublicada={oferta.estado === "activa"}
        />
      </div>
    </section>
  );
}
