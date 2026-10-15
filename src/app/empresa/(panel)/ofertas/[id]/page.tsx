import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirEmpresaPagina } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import { consultarPagina, leerPagina, type ParamsUrl } from "@/lib/paginacion";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { DERIVACION_ESTADO_LABEL, DERIVACION_ESTADO_STYLE } from "@/lib/derivacion-estados";
import type { FilaCandidatoParaEmpresa, FilaDerivacionDeOfertaEmpresa } from "@/types/db";
import { VencimientoOferta } from "@/components/ofertas/vencimiento-oferta";
import { estadoVencimiento } from "@/lib/ofertas-vencimiento";
import { RenovarOfertaBtn } from "../_components/renovar-oferta-btn";

export const metadata: Metadata = {
  title: "Detalle de oferta | Portal de Empleo Funes",
};

export default async function OfertaDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pagina?: string }>;
}) {
  const { id: ofertaId } = await params;
  const sp = await searchParams;
  const pagina = leerPagina(sp.pagina);
  const empresa = await requerirEmpresaPagina("/empresa");
  const supabase = await createSupabaseServerClient();

  const { data: oferta } = await supabase
    .from("ofertas")
    .select("id, titulo, estado, empresa_nombre, vence_en, duracion_dias")
    .eq("id", ofertaId)
    .eq("empresa_id", empresa.id)
    .maybeSingle();

  if (!oferta) notFound();

  const [vacantesResult, contratadosResult] = await Promise.all([
    supabase.from("oferta_vacantes").select("cantidad").eq("oferta_id", ofertaId).maybeSingle(),
    supabase.rpc("contratados_en_oferta", { p_oferta_id: ofertaId }),
  ]);

  const vacantes = vacantesResult.data?.cantidad ?? null;
  if (contratadosResult.error) logError("empresa_oferta_contratados", contratadosResult.error);
  const contratados = contratadosResult.data ?? 0;

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/empresa/ofertas" className="hover:text-foreground">
          Mis ofertas
        </Link>
        <span>/</span>
        <span className="text-foreground">{oferta.titulo}</span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Link
          href="/empresa/ofertas"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-muted-foreground transition hover:bg-surface-tinted hover:text-foreground"
          aria-label="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {oferta.titulo}
          </h1>
          <p className="text-sm text-muted-foreground">{oferta.empresa_nombre}</p>
          <VencimientoOferta
            className="mt-1"
            estado={oferta.estado}
            venceEn={oferta.vence_en}
          />
        </div>
      </div>

      {estadoVencimiento(oferta.estado, oferta.vence_en).vencida && (
        <div className="mt-4">
          <RenovarOfertaBtn
            ofertaId={oferta.id}
            ofertaTitulo={oferta.titulo}
            duracionDias={oferta.duracion_dias}
          />
        </div>
      )}

      {/* Candidatos derivados */}
      <div id="candidatos" className="mt-8 scroll-mt-20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Candidatos derivados
            </h2>
          </div>
          {vacantes !== null && (
            <span className="text-sm text-muted-foreground">
              {contratados} de {vacantes} {vacantes === 1 ? "vacante cubierta" : "vacantes cubiertas"}
            </span>
          )}
        </div>

        <Suspense
          key={pagina}
          fallback={<EsqueletoLista filas={3} className="mt-4" />}
        >
          <ListadoDerivados ofertaId={ofertaId} pagina={pagina} searchParams={sp} />
        </Suspense>
      </div>
    </section>
  );
}

async function ListadoDerivados({
  ofertaId,
  pagina,
  searchParams,
}: {
  ofertaId: string;
  pagina: number;
  searchParams: ParamsUrl;
}) {
  const supabase = await createSupabaseServerClient();

  // derivaciones_de_oferta_empresa devuelve un conjunto de filas: PostgREST
  // permite ordenarlo, contarlo y paginarlo como si fuera una tabla.
  const resultado = await consultarPagina(pagina, async (desde, hasta) => {
    const respuesta = await supabase
      .rpc("derivaciones_de_oferta_empresa", { p_oferta_id: ofertaId }, { count: "exact" })
      .order("derivacion_created_at", { ascending: false })
      .order("derivacion_id", { ascending: false })
      .range(desde, hasta);
    const data: FilaDerivacionDeOfertaEmpresa[] | null = respuesta.data;
    return { data, count: respuesta.count, error: respuesta.error };
  });

  if (!resultado.ok) {
    const ref = logError("empresa_oferta_derivados", resultado.error);
    return (
      <ErrorListado
        className="mt-4"
        mensaje="No pudimos cargar los candidatos derivados."
        refError={ref}
      />
    );
  }

  const derivaciones = resultado.filas;

  if (derivaciones.length === 0) {
    return (
      <EstadoVacio
        tipo="sin-registros"
        className="mt-4"
        icono={Users}
        titulo="Todavía no hay candidatos derivados"
        descripcion="La Oficina de Empleo te enviará perfiles cuando los tenga disponibles."
      />
    );
  }

  const nombresMap: Record<string, Pick<FilaCandidatoParaEmpresa, "nombre" | "apellido">> = {};
  const uniquePostulanteIds = [
    ...new Set(derivaciones.map((d) => d.postulante_id)),
  ];
  const nombreResults = await Promise.all(
    uniquePostulanteIds.map((pid) =>
      supabase.rpc("candidato_para_empresa", { p_postulante_id: pid })
    )
  );
  uniquePostulanteIds.forEach((pid, i) => {
    const row = nombreResults[i].data?.[0];
    if (row) nombresMap[pid] = row;
  });

  return (
    <>
          <ul className="mt-4 space-y-3">
            {derivaciones.map((d) => {
              const candidato = nombresMap[d.postulante_id];
              const nombre = candidato
                ? `${candidato.nombre} ${candidato.apellido}`
                : "Candidato";
              const estadoLabel =
                DERIVACION_ESTADO_LABEL[d.estado_empresa] ?? d.estado_empresa;
              const estadoStyle =
                DERIVACION_ESTADO_STYLE[d.estado_empresa] ?? "bg-gray-100 text-gray-600";

              return (
                <li
                  key={d.derivacion_id}
                  className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{nombre}</p>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyle}`}
                      >
                        {estadoLabel}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Derivado el {formatFecha(d.derivacion_created_at)}
                    </p>
                    {d.fecha_entrevista && (
                      <p className="text-xs text-muted-foreground">
                        Entrevista: {formatFechaHora(d.fecha_entrevista)}
                        {d.lugar_entrevista ? ` · ${d.lugar_entrevista}` : ""}
                      </p>
                    )}
                  </div>

                  <Link
                    href={`/empresa/ofertas/${ofertaId}/candidatos/${d.derivacion_id}`}
                    className="btn-secundario inline-flex h-8 shrink-0 items-center px-3 text-xs font-medium"
                  >
                    Ver ficha
                  </Link>
                </li>
              );
            })}
          </ul>
        <Paginacion
          className="mt-6"
          ruta={`/empresa/ofertas/${ofertaId}`}
          searchParams={searchParams}
          pagina={resultado.pagina}
          total={resultado.total}
          ancla="candidatos"
        />
    </>
  );
}
