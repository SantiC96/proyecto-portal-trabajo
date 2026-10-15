import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Badge } from "@/components/ui/badge";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { DatosCandidato } from "@/components/admin/datos-candidato";
import { obtenerCandidato } from "@/lib/admin/candidato";
import {
  BADGE_ESTADO_VISIBLE,
  estadoVisiblePostulacion,
  type EstadoPostulacion,
} from "@/lib/admin/postulacion-estados";
import { getOfertaEstadoLabel } from "@/lib/oferta-estados";
import { FichaAcciones } from "./ficha-acciones";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import { logError } from "@/lib/logger";
import { avisoCursoAlDerivar, type EstadoCursosPostulante } from "@/lib/cursos";
import {
  DERIVACION_ESTADO_LABEL,
  DERIVACION_ESTADO_STYLE,
  type EstadoDerivacionEmpresa,
} from "@/lib/derivacion-estados";

export const metadata: Metadata = {
  title: "Ficha | Postulaciones | Panel municipal | Portal de Empleo Funes",
};


export default async function PostulacionFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: postulacionId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: raw } = await supabase
    .from("postulaciones")
    .select(
      `
      id,
      estado,
      created_at,
      updated_at,
      nota_oficina,
      revisado_por,
      postulante_id,
      oferta_id,
      postulantes!postulante_id(id, usuario_id),
      ofertas!oferta_id(id, titulo, empresa_nombre, modalidad, jornada, estado, contenido_editado_en)
    `
    )
    .eq("id", postulacionId)
    .single();

  if (!raw) notFound();

  type PostulacionDetalle = {
    id: string;
    estado: EstadoPostulacion;
    created_at: string;
    updated_at: string | null;
    nota_oficina: string | null;
    revisado_por: string | null;
    postulantes: { id: string; usuario_id: string } | null;
    ofertas: {
      id: string;
      titulo: string;
      empresa_nombre: string;
      modalidad: string;
      jornada: string;
      estado: string;
      contenido_editado_en: string | null;
    } | null;
  };

  const postulacion = raw as unknown as PostulacionDetalle;
  const postulanteId = postulacion.postulantes?.id ?? null;
  const oferta = postulacion.ofertas;

  const puedeDerivarse =
    postulacion.estado === "recibida" || postulacion.estado === "en_revision";

  const [candidato, derivacionResult, revisorResult, estadoCursosResult] = await Promise.all([
    postulanteId ? obtenerCandidato(postulanteId) : Promise.resolve(null),
    postulacion.estado === "derivada"
      ? supabase
          .from("derivaciones")
          .select(
            "id, nota_municipalidad, created_at, updated_at, estado_empresa, fecha_entrevista, lugar_entrevista, fecha_respuesta, nota_empresa"
          )
          .eq("postulacion_id", postulacion.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    postulacion.revisado_por
      ? supabase
          .from("usuarios")
          .select("nombre, apellido")
          .eq("id", postulacion.revisado_por)
          .single()
      : Promise.resolve({ data: null }),
    postulanteId && puedeDerivarse
      ? supabase.rpc("estado_cursos_postulantes", { p_postulante_ids: [postulanteId] })
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (estadoCursosResult.error)
    logError("estado_cursos_postulantes", estadoCursosResult.error, { postulacionId });
  const avisoCurso = avisoCursoAlDerivar(
    ((estadoCursosResult.data ?? []) as EstadoCursosPostulante[])[0] ?? null
  );

  const derivacion = derivacionResult.data as {
    id: string;
    nota_municipalidad: string | null;
    created_at: string;
    updated_at: string;
    estado_empresa: EstadoDerivacionEmpresa;
    fecha_entrevista: string | null;
    lugar_entrevista: string | null;
    fecha_respuesta: string | null;
    nota_empresa: string | null;
  } | null;
  const revisor = revisorResult.data as {
    nombre: string;
    apellido: string;
  } | null;

  const estadoVisible = estadoVisiblePostulacion(
    postulacion.estado,
    derivacion?.estado_empresa
  );
  const badge = BADGE_ESTADO_VISIBLE[estadoVisible];
  // fecha_respuesta la fija el trigger de derivaciones al llegar a un estado
  // final; updated_at cubre filas viejas que no la tengan.
  const fechaContratacion =
    estadoVisible === "contratado" && derivacion
      ? derivacion.fecha_respuesta ?? derivacion.updated_at
      : null;

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">
          Panel
        </Link>
        <span>/</span>
        <Link href="/admin/postulaciones" className="hover:text-foreground">
          Postulaciones
        </Link>
        <span>/</span>
        <span className="text-foreground">Ficha</span>
      </div>

      {/* Cabecera */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <AvatarAjustado
          src={candidato?.avatar.url ?? null}
          alt={
            candidato
              ? `${candidato.usuario.nombre} ${candidato.usuario.apellido}`
              : "Candidato"
          }
          ajuste={candidato?.avatar.ajuste}
          size="lg"
        />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {candidato
              ? `${candidato.usuario.nombre} ${candidato.usuario.apellido}`
              : "Candidato desconocido"}
          </h1>
          <div className="mt-1">
            <Badge variant={badge.variant} className={badge.className}>
              {badge.label}
            </Badge>
          </div>
          {fechaContratacion && (
            <p className="mt-1 text-sm text-muted-foreground">
              Contratado por{" "}
              <span className="font-medium text-foreground">
                {oferta?.empresa_nombre ?? "la empresa"}
              </span>{" "}
              el {formatFecha(fechaContratacion)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="space-y-6 lg:col-span-2">
          {candidato ? (
            <DatosCandidato
              email={candidato.email}
              dni={candidato.postulante.dni}
              domicilio={candidato.postulante.domicilio}
              telefono={candidato.usuario.telefono}
              categorias={candidato.categorias}
              cvUrl={candidato.cvUrl}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Candidato no encontrado.
            </p>
          )}

          {/* Oferta */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
            <h2 className="font-semibold text-foreground">Oferta laboral</h2>
            {oferta ? (
              <dl className="mt-4 grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Título</dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {oferta.titulo}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Empresa</dt>
                  <dd className="mt-0.5 text-foreground">
                    {oferta.empresa_nombre}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Modalidad</dt>
                  <dd className="mt-0.5 text-foreground">{oferta.modalidad}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Jornada</dt>
                  <dd className="mt-0.5 text-foreground">{oferta.jornada}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Estado de la oferta</dt>
                  <dd className="mt-0.5 text-foreground">
                    {getOfertaEstadoLabel(oferta.estado)}
                  </dd>
                </div>
                {oferta.contenido_editado_en != null &&
                  oferta.contenido_editado_en > postulacion.created_at && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Modificada tras la postulación</dt>
                    <dd className="mt-0.5 text-amber-700 font-medium">
                      {formatFecha(oferta.contenido_editado_en)}
                    </dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <Link
                    href={`/ofertas/${oferta.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-2 hover:underline"
                  >
                    Ver detalle público
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                La oferta ya no está disponible.
              </p>
            )}
          </div>

          {/* Historial */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
            <h2 className="font-semibold text-foreground">Historial</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Fecha de postulación</dt>
                <dd className="mt-0.5 text-foreground">
                  {formatFecha(postulacion.created_at)}
                </dd>
              </div>
              {postulacion.updated_at &&
                postulacion.updated_at !== postulacion.created_at && (
                  <div>
                    <dt className="text-muted-foreground">
                      Última actualización
                    </dt>
                    <dd className="mt-0.5 text-foreground">
                      {formatFechaHora(postulacion.updated_at)}
                    </dd>
                  </div>
                )}
              {postulacion.revisado_por && (
                <div>
                  <dt className="text-muted-foreground">Revisada por</dt>
                  <dd className="mt-0.5 text-foreground">
                    {revisor
                      ? `${revisor.nombre} ${revisor.apellido}`
                      : "Usuario eliminado"}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Nota interna */}
          {postulacion.nota_oficina && (
            <div className="rounded-[var(--radius-lg)] border border-border bg-surface-tinted p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Nota interna (no la ve el postulante)
              </p>
              <p className="mt-2 text-sm text-foreground">
                {postulacion.nota_oficina}
              </p>
            </div>
          )}

          {/* Derivación: estado de la empresa */}
          {derivacion && (
            <div className="rounded-[var(--radius-lg)] border border-border bg-white p-5 shadow-xs">
              <h2 className="font-semibold text-foreground">Estado de la empresa</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Estado</dt>
                  <dd className="mt-0.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${DERIVACION_ESTADO_STYLE[derivacion.estado_empresa] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {DERIVACION_ESTADO_LABEL[derivacion.estado_empresa] ?? derivacion.estado_empresa}
                    </span>
                  </dd>
                </div>
                {derivacion.fecha_entrevista && (
                  <div>
                    <dt className="text-muted-foreground">Fecha de entrevista</dt>
                    <dd className="mt-0.5 text-foreground">
                      {formatFechaHora(derivacion.fecha_entrevista)}
                      {derivacion.lugar_entrevista && (
                        <span className="ml-1 text-muted-foreground">
                          · {derivacion.lugar_entrevista}
                        </span>
                      )}
                    </dd>
                  </div>
                )}
                {derivacion.fecha_respuesta && (
                  <div>
                    <dt className="text-muted-foreground">Fecha de respuesta</dt>
                    <dd className="mt-0.5 text-foreground">
                      {formatFechaHora(derivacion.fecha_respuesta)}
                    </dd>
                  </div>
                )}
                {derivacion.estado_empresa === "rechazado" && derivacion.nota_empresa && (
                  <div>
                    <dt className="text-muted-foreground">Motivo (empresa)</dt>
                    <dd className="mt-0.5 text-foreground">{derivacion.nota_empresa}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        {/* Columna lateral: acciones */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 rounded-[var(--radius-lg)] border border-border bg-surface p-5">
            <h2 className="font-semibold text-foreground">Acciones</h2>
            <div className="mt-4">
              <FichaAcciones
                postulacionId={postulacion.id}
                estado={postulacion.estado}
                estadoVisible={estadoVisible}
                empresaNombre={oferta?.empresa_nombre ?? null}
                ofertaEstado={oferta?.estado}
                derivacion={derivacion}
                avisoCurso={avisoCurso}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
