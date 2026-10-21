import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building, MapPin, Clock, Briefcase, UserSearch } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import { getOfertaEstadoLabel } from "@/lib/oferta-estados";
import { estadoVencimiento } from "@/lib/ofertas-vencimiento";
import { VencimientoOferta } from "@/components/ofertas/vencimiento-oferta";
import { OfertaAcciones } from "./oferta-acciones";
import { RequisitosList, BeneficiosList } from "@/components/ofertas/requisitos-beneficios";
import { requerirRolPagina } from "@/lib/auth";
import { BotonVolver } from "@/components/ui/boton-volver";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { fotoDePerfil } from "@/lib/fotos-perfil";

export const metadata: Metadata = {
  title: "Oferta | Panel municipal | Portal de Empleo Funes",
};

export default async function AdminOfertaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requerirRolPagina("municipalidad");
  const { id: ofertaId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: oferta } = await supabase
    .from("ofertas")
    .select(
      `
      id, titulo, descripcion, empresa_nombre, empresa_id,
      ubicacion, modalidad, jornada, requisitos, beneficios,
      estado, created_at, contenido_editado_en,
      motivo_rechazo, publicado_en, revisado_por, revisado_en,
      vence_en, duracion_dias,
      oferta_categorias(categorias(nombre))
    `
    )
    .eq("id", ofertaId)
    .single();

  if (!oferta) notFound();

  const [empresaResult, revisorResult, postulacionesResult, vacantesResult, contratadosResult] = await Promise.all([
    oferta.empresa_id
      ? supabase
          .from("empresas")
          .select("razon_social, rubro, descripcion, usuario_id")
          .eq("id", oferta.empresa_id)
          .single()
      : Promise.resolve({ data: null }),
    oferta.revisado_por
      ? supabase
          .from("usuarios")
          .select("nombre, apellido")
          .eq("id", oferta.revisado_por)
          .single()
      : Promise.resolve({ data: null }),
    // Sin las retiradas: quien se retiró y volvió a postularse cuenta una vez.
    supabase
      .from("postulaciones")
      .select("*", { count: "exact", head: true })
      .eq("oferta_id", ofertaId)
      .is("retirada_en", null),
    supabase
      .from("oferta_vacantes")
      .select("cantidad")
      .eq("oferta_id", ofertaId)
      .maybeSingle(),
    supabase.rpc("contratados_en_oferta", { p_oferta_id: ofertaId }),
  ]);

  const empresa = empresaResult.data;
  const logoEmpresa = empresa ? await fotoDePerfil(empresa.usuario_id) : null;
  const revisor = revisorResult.data;
  const totalPostulaciones = postulacionesResult.count ?? 0;
  const vacantes = vacantesResult.data?.cantidad ?? null;
  const contratados = contratadosResult.data ?? 0;
  // Buscar e invitar postulantes: solo ofertas activas y no vencidas (migration_056).
  const puedeBuscarPostulantes =
    oferta.estado === "activa" && !estadoVencimiento(oferta.estado, oferta.vence_en).vencida;

  const categorias = oferta.oferta_categorias
    .map((oc) => oc.categorias?.nombre)
    .filter((n): n is string => Boolean(n));

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <BotonVolver href="/admin/ofertas">Volver a ofertas</BotonVolver>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="space-y-6 lg:col-span-2">
          {/* Encabezado de la oferta */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
            <div className="flex flex-wrap items-center gap-2">
              {categorias.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                >
                  <Briefcase className="h-3 w-3" />
                  {cat}
                </span>
              ))}
              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Enviada el {formatFecha(oferta.created_at)}
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {oferta.titulo}
            </h1>

            {oferta.contenido_editado_en && (
              <span className="mt-2 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                Modificada el {formatFecha(oferta.contenido_editado_en)}
              </span>
            )}

            <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Building className="h-4 w-4 shrink-0" />
                {oferta.empresa_nombre}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                {oferta.ubicacion}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-gray-100 px-2.5 py-1 font-medium text-muted-foreground">
                {oferta.modalidad}
              </span>
              <span className="rounded-md bg-gray-100 px-2.5 py-1 font-medium text-muted-foreground">
                {oferta.jornada}
              </span>
            </div>
          </div>

          {/* Contenido */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
              Descripción del puesto
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground-strong">
              {oferta.descripcion}
            </p>

            <RequisitosList items={oferta.requisitos} headingTag="h3" />
            <BeneficiosList items={oferta.beneficios ?? []} headingTag="h3" />
          </div>

          {/* Empresa */}
          {empresa && (
            <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
              <div className="flex items-center gap-3">
                <AvatarAjustado
                  src={logoEmpresa?.url}
                  ajuste={logoEmpresa?.ajuste}
                  alt={`Logo de ${empresa.razon_social}`}
                  size="md"
                />
                <h2 className="font-semibold text-foreground">Empresa</h2>
              </div>
              <dl className="mt-4 grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Razón social</dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {empresa.razon_social}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Rubro</dt>
                  <dd className="mt-0.5 text-foreground">{empresa.rubro}</dd>
                </div>
                {empresa.descripcion && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Descripción</dt>
                    <dd className="mt-0.5 text-foreground">
                      {empresa.descripcion}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Historial */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
            <h2 className="font-semibold text-foreground">Historial</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Enviada</dt>
                <dd className="mt-0.5 text-foreground">
                  {formatFecha(oferta.created_at)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Estado</dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {estadoVencimiento(oferta.estado, oferta.vence_en).vencida
                    ? "Vencida"
                    : getOfertaEstadoLabel(oferta.estado)}
                </dd>
                <dd>
                  <VencimientoOferta
                    className="mt-1"
                    estado={oferta.estado}
                    venceEn={oferta.vence_en}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Duración de la publicación</dt>
                <dd className="mt-0.5 text-foreground">{oferta.duracion_dias} días</dd>
              </div>
              {totalPostulaciones > 0 && (
                <div>
                  <dt className="text-muted-foreground">Postulaciones</dt>
                  <dd className="mt-0.5 text-foreground">
                    {totalPostulaciones}
                  </dd>
                </div>
              )}
              {vacantes !== null && (
                <div>
                  <dt className="text-muted-foreground">Vacantes</dt>
                  <dd className="mt-0.5 text-foreground">
                    {contratados} de {vacantes} {vacantes === 1 ? "cubierta" : "cubiertas"}
                  </dd>
                </div>
              )}
              {oferta.revisado_en && (
                <div>
                  <dt className="text-muted-foreground">Fecha de revisión</dt>
                  <dd className="mt-0.5 text-foreground">
                    {formatFechaHora(oferta.revisado_en)}
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
              {oferta.publicado_en && (
                <div>
                  <dt className="text-muted-foreground">Publicada</dt>
                  <dd className="mt-0.5 text-foreground">
                    {formatFecha(oferta.publicado_en)}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Motivo de rechazo */}
          {oferta.motivo_rechazo && (
            <div className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                Motivo del rechazo
              </p>
              <p className="mt-2 text-sm text-red-800">{oferta.motivo_rechazo}</p>
            </div>
          )}
        </div>

        {/* Columna lateral: acciones */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 rounded-[var(--radius-lg)] border border-border bg-surface p-5">
            <h2 className="font-semibold text-foreground">Acciones</h2>
            <div className="mt-4">
              <OfertaAcciones ofertaId={ofertaId} estado={oferta.estado} />
            </div>
            {puedeBuscarPostulantes && (
              <Link
                href={`/admin/ofertas/${ofertaId}/candidatos`}
                className="btn-primario mt-4 min-h-11 w-full justify-center text-center"
              >
                <UserSearch className="h-4 w-4 shrink-0" aria-hidden="true" />
                Buscar postulantes para esta oferta
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
