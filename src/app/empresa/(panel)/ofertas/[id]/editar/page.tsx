import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirEmpresaPagina } from "@/lib/auth";
import { getCategoriasConId } from "@/lib/ofertas";
import { DURACION_OFERTA_POR_DEFECTO, estadoVencimiento } from "@/lib/ofertas-vencimiento";
import { formatFecha } from "@/lib/fechas";
import type { OfertaData } from "@/lib/validaciones";
import { OfertaForm } from "@/app/empresa/(panel)/ofertas/_components/oferta-form";
import { BotonVolver } from "@/components/ui/boton-volver";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";

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
      "id, titulo, descripcion, ubicacion, modalidad, jornada, requisitos, beneficios, estado, empresa_id, duracion_dias, motivo_rechazo, vence_en, publicado_en, revisado_en, created_at, updated_at, oferta_categorias(categoria_id)"
    )
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .is("eliminada_en", null)
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

  const esBorrador = oferta.estado === "borrador";
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

  // "{título} · {estado} el {fecha}".
  const { vencida } = estadoVencimiento(oferta.estado, oferta.vence_en);
  const estadoConFecha = esBorrador
    ? `Borrador guardado el ${formatFecha(oferta.updated_at)}`
    : oferta.estado === "rechazada"
      ? `Rechazada el ${formatFecha(oferta.revisado_en ?? oferta.updated_at)}`
      : vencida
        ? `Vencida el ${formatFecha(oferta.vence_en)}`
        : `Publicada el ${formatFecha(oferta.publicado_en ?? oferta.created_at)}`;

  return (
    <section className="flex w-full flex-col gap-6">
      <BotonVolver
        href={esBorrador ? "/empresa/ofertas" : `/empresa/ofertas/${id}`}
        destacado
      />
      <EncabezadoPagina
        banda
        botonesBlancos
        className="-mt-2"
        titulo={esBorrador ? "Completar borrador" : "Editar oferta"}
        bajada={`${oferta.titulo} · ${estadoConFecha}`}
      />

      <OfertaForm
        categorias={categorias}
        empresaNombre={empresa.razon_social}
        ofertaId={id}
        valorInicial={valorInicial}
        estaPublicada={oferta.estado === "activa"}
        venceEn={oferta.vence_en}
        esBorrador={esBorrador}
        motivoRechazo={oferta.estado === "rechazada" ? oferta.motivo_rechazo : null}
        minimoVacantes={minimoVacantes}
      />
    </section>
  );
}
