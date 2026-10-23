import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, UserSearch } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import { getOfertaEstadoLabel } from "@/lib/oferta-estados";
import { estadoVencimiento } from "@/lib/ofertas-vencimiento";
import { formatearCUIT } from "@/lib/cuit";
import { inicialesDeEmpresa } from "@/lib/iniciales";
import { VencimientoOferta } from "@/components/ofertas/vencimiento-oferta";
import { OfertaAcciones } from "./oferta-acciones";
import { RequisitosList, BeneficiosList } from "@/components/ofertas/requisitos-beneficios";
import { requerirRolPagina } from "@/lib/auth";
import { BotonVolver } from "@/components/ui/boton-volver";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { fotoDePerfil } from "@/lib/fotos-perfil";
import { Badge, type TonoBadge } from "@/components/ui/badge";
import { Aviso } from "@/components/ui/aviso";
import { Franja } from "@/components/ui/franja";
import { DatosClave } from "@/components/ui/datos-clave";

export const metadata: Metadata = {
  title: "Oferta | Panel municipal | Portal de Empleo Funes",
};

type EstadoVisible = "pendiente_aprobacion" | "activa" | "vencida" | "rechazada" | "cerrada" | "borrador";

const ESTADO_TONO: Record<EstadoVisible, TonoBadge> = {
  borrador: "neutral",
  pendiente_aprobacion: "warning",
  activa: "success",
  vencida: "danger",
  rechazada: "danger",
  cerrada: "neutral",
};

const TARJETA = "tarjeta px-4 py-5 sm:p-6";
const TITULO_TARJETA = "text-lg leading-snug font-extrabold text-heading";

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
          .select("razon_social, cuit, rubro, usuario_id")
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
  const vencida = estadoVencimiento(oferta.estado, oferta.vence_en).vencida;
  const estado: EstadoVisible = vencida ? "vencida" : oferta.estado;
  // Buscar e invitar postulantes: solo ofertas activas y no vencidas (migration_056).
  const puedeBuscarPostulantes = oferta.estado === "activa" && !vencida;
  const pendiente = oferta.estado === "pendiente_aprobacion";
  // Una oferta pendiente no se puede editar (migration_024): si tiene
  // contenido_editado_en la empresa la editó estando publicada (publicado_en)
  // o después de un rechazo.
  const editadaPublicada = pendiente && Boolean(oferta.contenido_editado_en && oferta.publicado_en);
  const corregida = pendiente && Boolean(oferta.contenido_editado_en && !oferta.publicado_en);

  const categorias = oferta.oferta_categorias
    .map((oc) => oc.categorias?.nombre)
    .filter((n): n is string => Boolean(n));

  const queOcurrio = editadaPublicada
    ? `Modificada el ${formatFecha(oferta.contenido_editado_en)}`
    : corregida
      ? `Corregida el ${formatFecha(oferta.contenido_editado_en)}`
      : oferta.estado === "rechazada" && oferta.revisado_en
        ? `Rechazada el ${formatFecha(oferta.revisado_en)}`
        : oferta.estado === "activa" && oferta.publicado_en
          ? `Publicada el ${formatFecha(oferta.publicado_en)}`
          : `Enviada el ${formatFecha(oferta.created_at)}`;

  return (
    <section className="flex w-full max-w-[1200px] flex-col gap-6">
      <div className="flex flex-col gap-4">
        <BotonVolver href="/admin/ofertas" />
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="min-w-0 text-[26px] leading-[1.15] font-extrabold tracking-[-0.01em] break-words text-heading sm:text-[32px]">
              {oferta.titulo}
            </h1>
            <Badge tono={ESTADO_TONO[estado]} estado>
              {vencida ? "Vencida" : getOfertaEstadoLabel(oferta.estado)}
            </Badge>
          </div>
          <p className="text-base text-muted-foreground">
            {oferta.empresa_nombre} · {queOcurrio}
          </p>
          <VencimientoOferta className="text-sm" estado={oferta.estado} venceEn={oferta.vence_en} />
        </header>
      </div>

      {editadaPublicada && (
        <Franja tono="aviso" titulo={`Oferta modificada por la empresa el ${formatFecha(oferta.contenido_editado_en)}.`}>
          Mientras la revisás, no se ve en el portal ni recibe postulaciones nuevas.
        </Franja>
      )}
      {corregida && (
        <Franja tono="aviso" titulo={`Oferta corregida por la empresa el ${formatFecha(oferta.contenido_editado_en)}.`}>
          La empresa la volvió a enviar después de un rechazo.
        </Franja>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start">
        <article aria-labelledby="titulo-contenido" className={TARJETA}>
          <h2 id="titulo-contenido" className={TITULO_TARJETA}>
            Contenido de la oferta
          </h2>
          <DatosClave
            className="mt-5"
            datos={[
              { etiqueta: categorias.length === 1 ? "Rubro" : "Rubros", valor: categorias.join(", ") },
              { etiqueta: "Modalidad", valor: oferta.modalidad },
              { etiqueta: "Jornada", valor: oferta.jornada },
              { etiqueta: "Ubicación", valor: oferta.ubicacion },
              {
                etiqueta: "Vacantes",
                valor:
                  vacantes === null
                    ? null
                    : `${vacantes} (${contratados} ${contratados === 1 ? "cubierta" : "cubiertas"})`,
              },
              { etiqueta: "Duración", valor: `${oferta.duracion_dias} días` },
            ]}
          />

          <hr className="my-6 border-tabla-borde" />

          <h3 className="text-sm font-bold tracking-wider text-primary uppercase">Descripción</h3>
          <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-line text-texto-parrafo">
            {oferta.descripcion}
          </p>
          <RequisitosList items={oferta.requisitos} headingTag="h3" />
          <BeneficiosList items={oferta.beneficios ?? []} headingTag="h3" />
        </article>

        <div className="flex flex-col gap-6 xl:sticky xl:top-6">
          {empresa && (
            <section aria-labelledby="titulo-empresa" className={TARJETA}>
              <h2 id="titulo-empresa" className="sr-only">
                Empresa
              </h2>
              <div className="flex items-center gap-3">
                <AvatarAjustado
                  src={logoEmpresa?.url}
                  ajuste={logoEmpresa?.ajuste}
                  iniciales={inicialesDeEmpresa(empresa.razon_social)}
                  alt={`Logo de ${empresa.razon_social}`}
                  size="md"
                />
                <p className="min-w-0 text-[17px] leading-snug font-extrabold break-words text-heading">
                  {oferta.empresa_nombre}
                </p>
              </div>
              <DatosClave
                className="mt-5"
                datos={[
                  { etiqueta: "Razón social", valor: empresa.razon_social },
                  {
                    etiqueta: "CUIT",
                    valor: <span className="tabular-nums">{formatearCUIT(empresa.cuit)}</span>,
                  },
                  { etiqueta: "Rubro", valor: empresa.rubro },
                ]}
              />
              {oferta.empresa_id && (
                <Link
                  href={`/admin/empresas/${oferta.empresa_id}`}
                  className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-sm)] text-[15px] font-bold text-primary outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]"
                >
                  Ver empresa
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              )}
            </section>
          )}

          {pendiente ? (
            <section aria-labelledby="titulo-decision" className={TARJETA}>
              <h2 id="titulo-decision" className={TITULO_TARJETA}>
                Decisión
              </h2>
              <p className="mt-2 text-[15px] text-muted-foreground-strong">
                Si la publicás, los postulantes la ven en el listado de ofertas.
              </p>
              <div className="mt-5">
                <OfertaAcciones ofertaId={ofertaId} estado={oferta.estado} />
              </div>
            </section>
          ) : (
            <>
              {oferta.estado === "activa" && (
                <section aria-labelledby="titulo-postulaciones" className={TARJETA}>
                  <h2 id="titulo-postulaciones" className={TITULO_TARJETA}>
                    Postulaciones
                  </h2>
                  <p className="mt-3 flex flex-col">
                    <span className="text-[40px] leading-none font-extrabold text-heading tabular-nums">
                      {totalPostulaciones}
                    </span>
                    <span className="mt-1.5 text-sm text-muted-foreground">
                      {totalPostulaciones === 1 ? "postulación recibida" : "postulaciones recibidas"}
                    </span>
                  </p>
                  {puedeBuscarPostulantes && (
                    <Link
                      href={`/admin/ofertas/${ofertaId}/candidatos`}
                      className="btn-primario mt-5 w-full text-center"
                    >
                      <UserSearch aria-hidden="true" />
                      Buscar postulantes para esta oferta
                    </Link>
                  )}
                </section>
              )}

              <section aria-labelledby="titulo-revision" className={TARJETA}>
                <h2 id="titulo-revision" className={TITULO_TARJETA}>
                  Revisión
                </h2>
                <div className="mt-2">
                  <OfertaAcciones ofertaId={ofertaId} estado={oferta.estado} />
                </div>
                {oferta.motivo_rechazo && (
                  <Aviso tono="danger" titulo="Motivo del rechazo" role="none" className="mt-4">
                    {oferta.motivo_rechazo}
                  </Aviso>
                )}
                <DatosClave
                  className="mt-5"
                  datos={[
                    { etiqueta: "Enviada", valor: formatFecha(oferta.created_at) },
                    {
                      etiqueta: "Fecha de revisión",
                      valor: oferta.revisado_en ? formatFechaHora(oferta.revisado_en) : null,
                    },
                    {
                      etiqueta: "Revisada por",
                      valor: revisor ? `${revisor.nombre} ${revisor.apellido}` : null,
                    },
                    {
                      etiqueta: "Publicada",
                      valor: oferta.publicado_en ? formatFecha(oferta.publicado_en) : null,
                    },
                    {
                      etiqueta: "Postulaciones",
                      valor:
                        oferta.estado !== "activa" && totalPostulaciones > 0
                          ? String(totalPostulaciones)
                          : null,
                    },
                  ]}
                />
              </section>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
