import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirEmpresaPagina } from "@/lib/auth";
import { getCategoriasConId } from "@/lib/ofertas";
import { DURACION_OFERTA_POR_DEFECTO } from "@/lib/ofertas-vencimiento";
import type { OfertaData } from "@/lib/validaciones";
import { OfertaForm } from "@/app/empresa/(panel)/ofertas/_components/oferta-form";

export const metadata: Metadata = {
  title: "Editar oferta | Portal de Empleo Funes",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarOfertaPage({ params }: Props) {
  const { id } = await params;
  const empresa = await requerirEmpresaPagina("/empresa");
  const supabase = await createSupabaseServerClient();

  const { data: oferta } = await supabase
    .from("ofertas")
    .select(
      "id, titulo, descripcion, ubicacion, modalidad, jornada, requisitos, beneficios, estado, empresa_id, duracion_dias, oferta_categorias(categoria_id)"
    )
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .maybeSingle();

  if (!oferta) notFound();
  if (oferta.estado === "cerrada") redirect("/empresa/ofertas");
  if (oferta.estado === "pendiente_aprobacion") redirect("/empresa/ofertas?aviso=pendiente");

  const [categorias, vacantesResult, contratadosResult] = await Promise.all([
    getCategoriasConId(),
    supabase.from("oferta_vacantes").select("cantidad").eq("oferta_id", id).maybeSingle(),
    supabase.rpc("contratados_en_oferta", { p_oferta_id: id }),
  ]);

  const cantidadVacantes = vacantesResult.data?.cantidad ?? 1;
  const contratados = contratadosResult.data ?? 0;
  const minimoVacantes = Math.max(1, contratados);

  const categoriasSeleccionadas = oferta.oferta_categorias.map((oc) => oc.categoria_id);

  const valorInicial: OfertaData = {
    titulo: oferta.titulo,
    descripcion: oferta.descripcion,
    modalidad: oferta.modalidad,
    jornada: oferta.jornada,
    requisitos: oferta.requisitos ?? [],
    beneficios: oferta.beneficios ?? [],
    categorias: categoriasSeleccionadas,
    cantidadVacantes,
    duracionDias: oferta.duracion_dias ?? DURACION_OFERTA_POR_DEFECTO,
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
          minimoVacantes={minimoVacantes}
        />
      </div>
    </section>
  );
}
