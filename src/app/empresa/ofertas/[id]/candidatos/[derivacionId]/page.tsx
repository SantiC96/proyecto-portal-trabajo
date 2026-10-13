import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Mail, Phone, FileText, ExternalLink, User } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { formatFechaHora } from "@/lib/fechas";
import {
  DERIVACION_ESTADO_LABEL,
  DERIVACION_ESTADO_STYLE,
  type EstadoDerivacionEmpresa,
} from "@/lib/derivacion-estados";
import { AccionesDerivacion } from "./_components/acciones-derivacion";

export const metadata: Metadata = {
  title: "Ficha de candidato | Portal de Empleo Funes",
};

type DerivacionRow = {
  derivacion_id: string;
  postulante_id: string;
  estado_empresa: EstadoDerivacionEmpresa;
  nota_municipalidad: string | null;
  fecha_entrevista: string | null;
  lugar_entrevista: string | null;
  fecha_respuesta: string | null;
  derivacion_created_at: string;
  derivacion_updated_at: string;
};

type CandidatoRow = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  cv_ruta: string | null;
};

type GuardadoRow = {
  id: string;
  nota: string | null;
  oferta_origen_id: string | null;
};

export default async function CandidatoFichaPage({
  params,
}: {
  params: Promise<{ id: string; derivacionId: string }>;
}) {
  const { id: ofertaId, derivacionId } = await params;
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

  const derivacion = ((derivacionesRaw ?? []) as DerivacionRow[]).find(
    (d) => d.derivacion_id === derivacionId
  );
  if (!derivacion) notFound();

  // Get candidate data and saved status in parallel
  const [candidatoResult, guardadoResult] = await Promise.all([
    supabase.rpc("candidato_para_empresa", {
      p_postulante_id: derivacion.postulante_id,
    }),
    supabase
      .from("candidatos_guardados")
      .select("id, nota, oferta_origen_id")
      .eq("postulante_id", derivacion.postulante_id)
      .maybeSingle(),
  ]);

  const candidato = ((candidatoResult.data as CandidatoRow[] | null) ?? [])[0] ?? null;
  const guardado = guardadoResult.data as GuardadoRow | null;

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
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/empresa/ofertas" className="hover:text-foreground">
          Mis ofertas
        </Link>
        <span>/</span>
        <Link href={`/empresa/ofertas/${ofertaId}`} className="hover:text-foreground">
          {oferta.titulo}
        </Link>
        <span>/</span>
        <span className="text-foreground">Candidato</span>
      </div>

      {/* Cabecera */}
      <div className="mt-4 flex items-center gap-3">
        <Link
          href={`/empresa/ofertas/${ofertaId}`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-muted-foreground transition hover:bg-surface-tinted hover:text-foreground"
          aria-label="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
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
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
