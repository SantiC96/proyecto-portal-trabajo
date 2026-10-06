import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Badge } from "@/components/ui/badge";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { DatosCandidato } from "@/components/admin/datos-candidato";
import { obtenerCandidato } from "@/lib/admin/candidato";
import { BADGE_CONFIG, type EstadoPostulacion } from "@/lib/admin/postulacion-estados";
import { FichaAcciones } from "./ficha-acciones";

export const metadata: Metadata = {
  title: "Ficha | Postulaciones | Panel municipal | Portal de Empleo Funes",
};

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatearFechaHora(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PostulacionFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: postulacionId } = await params;

  const { data: raw } = await supabaseAdmin
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
      ofertas!oferta_id(id, titulo, empresa_nombre, modalidad, jornada, estado)
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
    } | null;
  };

  const postulacion = raw as unknown as PostulacionDetalle;
  const postulanteId = postulacion.postulantes?.id ?? null;
  const oferta = postulacion.ofertas;

  const [candidato, derivacionResult, revisorResult] = await Promise.all([
    postulanteId ? obtenerCandidato(postulanteId) : Promise.resolve(null),
    postulacion.estado === "derivada"
      ? supabaseAdmin
          .from("derivaciones")
          .select("nota_municipalidad, created_at")
          .eq("postulacion_id", postulacion.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    postulacion.revisado_por
      ? supabaseAdmin
          .from("usuarios")
          .select("nombre, apellido")
          .eq("id", postulacion.revisado_por)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const derivacion = derivacionResult.data as {
    nota_municipalidad: string | null;
    created_at: string;
  } | null;
  const revisor = revisorResult.data as {
    nombre: string;
    apellido: string;
  } | null;

  const badge = BADGE_CONFIG[postulacion.estado];

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
                  <dd className="mt-0.5 text-foreground capitalize">
                    {oferta.estado}
                  </dd>
                </div>
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
                  {formatearFecha(postulacion.created_at)}
                </dd>
              </div>
              {postulacion.updated_at &&
                postulacion.updated_at !== postulacion.created_at && (
                  <div>
                    <dt className="text-muted-foreground">
                      Última actualización
                    </dt>
                    <dd className="mt-0.5 text-foreground">
                      {formatearFechaHora(postulacion.updated_at)}
                    </dd>
                  </div>
                )}
              {revisor && (
                <div>
                  <dt className="text-muted-foreground">Revisada por</dt>
                  <dd className="mt-0.5 text-foreground">
                    {revisor.nombre} {revisor.apellido}
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
        </div>

        {/* Columna lateral: acciones */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 rounded-[var(--radius-lg)] border border-border bg-surface p-5">
            <h2 className="font-semibold text-foreground">Acciones</h2>
            <div className="mt-4">
              <FichaAcciones
                postulacionId={postulacion.id}
                estado={postulacion.estado}
                derivacion={derivacion}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
