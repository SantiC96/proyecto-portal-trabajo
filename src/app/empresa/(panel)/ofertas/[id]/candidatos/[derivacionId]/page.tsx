import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Phone, FileText, ExternalLink, User } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirEmpresaPagina } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { formatFechaHora } from "@/lib/fechas";
import { DERIVACION_ESTADO_LABEL, DERIVACION_ESTADO_STYLE } from "@/lib/derivacion-estados";
import type { FilaCandidatoParaEmpresa, FilaDerivacionDeOfertaEmpresa } from "@/types/db";
import { InformacionLaboralResumen } from "@/components/postulantes/informacion-laboral-resumen";
import { AccionesDerivacion } from "./_components/acciones-derivacion";
import { BotonVolver } from "@/components/ui/boton-volver";

export const metadata: Metadata = {
  title: "Ficha de candidato | Portal de Empleo Funes",
};

export default async function CandidatoFichaPage({
  params,
}: {
  params: Promise<{ id: string; derivacionId: string }>;
}) {
  const { id: ofertaId, derivacionId } = await params;
  const empresa = await requerirEmpresaPagina("/empresa");
  const supabase = await createSupabaseServerClient();

  // Verify the offer belongs to this empresa
  const { data: oferta } = await supabase
    .from("ofertas")
    .select("id, titulo")
    .eq("id", ofertaId)
    .eq("empresa_id", empresa.id)
    .maybeSingle();
  if (!oferta) notFound();

  // Get all derivaciones for this offer and find the one we need
  const { data: derivacionesRaw } = await supabase.rpc(
    "derivaciones_de_oferta_empresa",
    { p_oferta_id: ofertaId }
  );

  const derivaciones: FilaDerivacionDeOfertaEmpresa[] = derivacionesRaw ?? [];
  const derivacion = derivaciones.find(
    (d) => d.derivacion_id === derivacionId
  );
  if (!derivacion) notFound();

  // Get candidate data and saved status in parallel
  const [candidatoResult, guardadoResult, vacantesResult, contratadosResult] = await Promise.all([
    supabase.rpc("candidato_para_empresa", {
      p_postulante_id: derivacion.postulante_id,
    }),
    supabase
      .from("candidatos_guardados")
      .select("id, nota, oferta_origen_id")
      .eq("postulante_id", derivacion.postulante_id)
      .maybeSingle(),
    supabase.from("oferta_vacantes").select("cantidad").eq("oferta_id", ofertaId).maybeSingle(),
    supabase.rpc("contratados_en_oferta", { p_oferta_id: ofertaId }),
  ]);

  const candidato: FilaCandidatoParaEmpresa | null = candidatoResult.data?.[0] ?? null;
  const guardado = guardadoResult.data;

  // Solo informativo: el límite lo hace cumplir derivaciones_limite_vacantes (040).
  if (contratadosResult.error) logError("empresa_candidato_contratados", contratadosResult.error);
  const vacantes = vacantesResult.data?.cantidad ?? null;
  const vacantesCubiertas =
    vacantes !== null && contratadosResult.data != null && contratadosResult.data >= vacantes;

  // Generate signed CV URL if available (10 min lifetime)
  let cvUrl: string | null = null;
  if (candidato?.cv_ruta) {
    const { data: signed } = await supabase.storage
      .from("cvs")
      .createSignedUrl(candidato.cv_ruta, 600);
    cvUrl = signed?.signedUrl ?? null;
  }

  const estadoLabel =
    DERIVACION_ESTADO_LABEL[derivacion.estado_empresa] ?? derivacion.estado_empresa;
  const estadoStyle =
    DERIVACION_ESTADO_STYLE[derivacion.estado_empresa] ?? "bg-gray-100 text-gray-600";

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <BotonVolver href={`/empresa/ofertas/${ofertaId}`}>Volver a la oferta</BotonVolver>

      {/* Cabecera */}
      <div className="mt-4 flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {candidato
              ? `${candidato.nombre} ${candidato.apellido}`
              : "Candidato"}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyle}`}
            >
              {estadoLabel}
            </span>
            {derivacion.fecha_respuesta && (
              <span className="text-xs text-muted-foreground">
                Respuesta: {formatFechaHora(derivacion.fecha_respuesta)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="space-y-6 lg:col-span-2">
          {/* Datos de contacto */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-white p-5 shadow-xs">
            <h2 className="font-semibold text-foreground">Datos de contacto</h2>
            {candidato ? (
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Email</dt>
                    <dd className="font-medium text-foreground">{candidato.email}</dd>
                  </div>
                </div>
                {candidato.telefono && (
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Teléfono</dt>
                      <dd className="font-medium text-foreground">{candidato.telefono}</dd>
                    </div>
                  </div>
                )}
                {cvUrl ? (
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Currículum</dt>
                      <dd>
                        <a
                          href={cvUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline"
                        >
                          Ver / descargar CV
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </dd>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Currículum</dt>
                      <dd className="text-muted-foreground">Sin CV cargado</dd>
                    </div>
                  </div>
                )}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Datos no disponibles.
              </p>
            )}
          </div>

          {candidato && (
            <InformacionLaboralResumen info={candidato} className="bg-white shadow-xs" />
          )}

          {/* Nota de la municipalidad */}
          {derivacion.nota_municipalidad && (
            <div className="rounded-[var(--radius-lg)] border border-border bg-surface-tinted p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Nota de la Oficina de Empleo
              </p>
              <p className="mt-2 text-sm text-foreground">
                {derivacion.nota_municipalidad}
              </p>
            </div>
          )}

          {/* Entrevista (si está coordinada) */}
          {derivacion.estado_empresa === "en_proceso" && derivacion.fecha_entrevista && (
            <div className="rounded-[var(--radius-lg)] border border-blue-200 bg-blue-50 p-5">
              <p className="text-sm font-semibold text-blue-800">
                Entrevista coordinada
              </p>
              <p className="mt-1 text-sm text-blue-700">
                {formatFechaHora(derivacion.fecha_entrevista)}
              </p>
              {derivacion.lugar_entrevista && (
                <p className="mt-1 text-sm text-blue-600">
                  {derivacion.lugar_entrevista}
                </p>
              )}
            </div>
          )}

          {/* Nota del candidato guardado */}
          {guardado?.nota && (
            <div className="rounded-[var(--radius-lg)] border border-border bg-white p-5 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tu nota privada
              </p>
              <p className="mt-2 text-sm text-foreground">{guardado.nota}</p>
            </div>
          )}

          {/* Ver perfil completo */}
          <Link
            href={`/empresa/candidatos/${derivacion.postulante_id}`}
            className="btn-secundario inline-flex h-9 items-center gap-2 px-4 text-sm font-medium"
          >
            <User className="h-4 w-4" />
            Ver perfil completo
          </Link>
        </div>

        {/* Columna de acciones */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 rounded-[var(--radius-lg)] border border-border bg-white p-5 shadow-xs">
            <h2 className="font-semibold text-foreground">Acciones</h2>
            <div className="mt-4">
              <AccionesDerivacion
                derivacionId={derivacionId}
                ofertaId={ofertaId}
                estado={derivacion.estado_empresa}
                fechaEntrevista={derivacion.fecha_entrevista}
                lugarEntrevista={derivacion.lugar_entrevista}
                postulanteId={derivacion.postulante_id}
                guardadoId={guardado?.id ?? null}
                vacantesCubiertas={vacantesCubiertas}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
