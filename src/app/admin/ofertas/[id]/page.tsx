import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  Gift,
  History,
  MapPin,
  Monitor,
  Tag,
  UserSearch,
  Users,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import { getOfertaEstadoLabel } from "@/lib/oferta-estados";
import { estadoVencimiento, textoDiasRestantes } from "@/lib/ofertas-vencimiento";
import { formatearCUIT } from "@/lib/cuit";
import { inicialesDeEmpresa } from "@/lib/iniciales";
import {
  ESTADO_EMPRESA_LABEL,
  esEstadoEmpresa,
  type EstadoAprobacion,
} from "@/lib/admin/historial-empresa";
import { OfertaAcciones } from "./oferta-acciones";
import { requerirRolPagina } from "@/lib/auth";
import { BotonVolver } from "@/components/ui/boton-volver";
import { DetalleConLateral } from "@/components/ui/detalle-con-lateral";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { fotoDePerfil } from "@/lib/fotos-perfil";
import { Badge, BadgeBanda, type TonoBadge } from "@/components/ui/badge";
import { Franja } from "@/components/ui/franja";
import { DatosClave } from "@/components/ui/datos-clave";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { TituloBloque } from "@/components/ui/titulo-bloque";
import { MosaicosDatos } from "@/components/ui/mosaicos-datos";
import { TarjetaDecision } from "@/components/ui/tarjeta-decision";
import {
  ICONO_HISTORIAL,
  LineaDeTiempo,
  MotivoRechazo,
  type EventoLinea,
} from "@/components/ui/linea-de-tiempo";
import { ListaTexto, SeccionTexto } from "@/components/ofertas/seccion-texto";

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

const TONO_EMPRESA: Record<EstadoAprobacion, TonoBadge> = {
  pendiente: "warning",
  aprobada: "success",
  rechazada: "danger",
};

const TARJETA = "tarjeta tarjeta-panel min-w-0";

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
          .select("razon_social, cuit, rubro, usuario_id, estado_aprobacion")
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
  const nombreRevisor = revisor ? `${revisor.nombre} ${revisor.apellido}`.trim() : null;
  const totalPostulaciones = postulacionesResult.count ?? 0;
  const vacantes = vacantesResult.data?.cantidad ?? null;
  const contratados = contratadosResult.data ?? 0;
  const { vencida, porVencer, diasRestantes } = estadoVencimiento(oferta.estado, oferta.vence_en);
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
  const fechaVence =
    oferta.estado === "activa" && oferta.vence_en
      ? `${vencida ? "Venció" : "Vence"} el ${formatFecha(oferta.vence_en)}`
      : null;

  const estadoEmpresa =
    empresa && esEstadoEmpresa(empresa.estado_aprobacion) ? empresa.estado_aprobacion : null;

  const tarjetaEmpresa = empresa && (
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
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          <p className="text-[17px] leading-snug font-extrabold break-words text-heading">
            {oferta.empresa_nombre}
          </p>
          {estadoEmpresa && (
            <Badge tono={TONO_EMPRESA[estadoEmpresa]} estado>
              {ESTADO_EMPRESA_LABEL[estadoEmpresa]}
            </Badge>
          )}
        </div>
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
          className="mt-4 inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-sm)] text-[15px] font-bold text-primary outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]"
        >
          Ver empresa
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </section>
  );

  const mostrarPostulaciones = oferta.estado === "activa" || totalPostulaciones > 0;

  return (
    <section className="flex w-full flex-col gap-6">
      <BotonVolver href="/admin/ofertas" destacado />

      <EncabezadoPagina
        banda
        botonesBlancos
        className="-mt-2"
        titulo={oferta.titulo}
        junto={
          <BadgeBanda tono={ESTADO_TONO[estado]}>
            {vencida ? "Vencida" : getOfertaEstadoLabel(oferta.estado)}
          </BadgeBanda>
        }
        bajada={
          <>
            {oferta.empresa_nombre} · {queOcurrio}
            {fechaVence && ` · ${fechaVence}`}
            {porVencer && diasRestantes !== null && (
              <span className="font-bold text-primary-foreground">
                {" · "}
                {textoDiasRestantes(diasRestantes)}
              </span>
            )}
          </>
        }
      />

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

      <DetalleConLateral
        anchoLateral={380}
        separacion="gap-4"
        separacionColumnas="gap-5"
        principal={
          <article aria-labelledby="titulo-contenido" className={TARJETA}>
            <TituloBloque id="titulo-contenido" titulo="Contenido de la oferta" icono={FileText} />
            <MosaicosDatos
              className="mt-5"
              datos={[
                {
                  etiqueta: categorias.length === 1 ? "Rubro" : "Rubros",
                  icono: Tag,
                  valor: categorias.join(", "),
                  ancho: true,
                },
                { etiqueta: "Modalidad", icono: Monitor, valor: oferta.modalidad },
                { etiqueta: "Jornada", icono: Clock, valor: oferta.jornada },
                { etiqueta: "Ubicación", icono: MapPin, valor: oferta.ubicacion },
                {
                  etiqueta: "Vacantes",
                  icono: Users,
                  valor:
                    vacantes === null
                      ? null
                      : `${vacantes} (${contratados} ${contratados === 1 ? "cubierta" : "cubiertas"})`,
                },
                { etiqueta: "Duración", icono: Calendar, valor: `${oferta.duracion_dias} días` },
              ]}
            />

            <hr className="my-6 border-tabla-borde" />

            <div className="flex flex-col divide-y divide-tabla-borde">
              <SeccionTexto titulo="Descripción" icono={FileText} nivel="h3">
                <p className="text-base leading-[1.6] break-words whitespace-pre-line text-texto-parrafo">
                  {oferta.descripcion}
                </p>
              </SeccionTexto>
              {oferta.requisitos.length > 0 && (
                <SeccionTexto titulo="Requisitos" icono={ClipboardList} nivel="h3">
                  <ListaTexto items={oferta.requisitos} />
                </SeccionTexto>
              )}
              {(oferta.beneficios ?? []).length > 0 && (
                <SeccionTexto titulo="Beneficios" icono={Gift} nivel="h3">
                  <ListaTexto items={oferta.beneficios ?? []} />
                </SeccionTexto>
              )}
            </div>
          </article>
        }
        lateral={
          pendiente ? (
            <>
              <TarjetaDecision descripcion="Si la publicás, los postulantes la ven en el listado de ofertas.">
                <OfertaAcciones
                  ofertaId={ofertaId}
                  ofertaTitulo={oferta.titulo}
                  empresaNombre={oferta.empresa_nombre}
                  enviadaEl={formatFecha(oferta.created_at)}
                />
              </TarjetaDecision>
              {tarjetaEmpresa}
            </>
          ) : (
            <>
              {mostrarPostulaciones && (
                <section aria-labelledby="titulo-postulaciones" className={TARJETA}>
                  <TituloBloque id="titulo-postulaciones" titulo="Postulaciones" icono={Users} />
                  <p className="mt-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span className="text-[44px] leading-none font-extrabold text-heading tabular-nums">
                      {totalPostulaciones}
                    </span>
                    <span className="text-[15px] font-semibold text-muted-foreground">
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

              {tarjetaEmpresa}

              <section aria-labelledby="titulo-revision" className={TARJETA}>
                <TituloBloque id="titulo-revision" titulo="Revisión" icono={History} />
                <LineaDeTiempo
                  variante="historial"
                  className="mt-5"
                  eventos={eventosRevision({ ...oferta, nombreRevisor })}
                />
              </section>
            </>
          )
        }
      />
    </section>
  );
}

/**
 * Historial de la revisión con los datos que hay: enviada, modificada o
 * corregida por la empresa, revisada (o rechazada) por la oficina y
 * publicada. En orden de fecha; dentro del mismo minuto, en ese orden.
 */
function eventosRevision(o: {
  estado: string;
  empresa_nombre: string;
  created_at: string;
  contenido_editado_en: string | null;
  revisado_en: string | null;
  publicado_en: string | null;
  motivo_rechazo: string | null;
  nombreRevisor: string | null;
}): EventoLinea[] {
  const eventos: (EventoLinea & { fecha: string })[] = [
    {
      clave: "enviada",
      fecha: o.created_at,
      titulo: "Enviada por la empresa",
      detalle: `${formatFechaHora(o.created_at)} · ${o.empresa_nombre}`,
      ...ICONO_HISTORIAL.enviado,
    },
  ];
  if (o.contenido_editado_en) {
    eventos.push({
      clave: "editada",
      fecha: o.contenido_editado_en,
      titulo: o.publicado_en ? "Modificada por la empresa" : "Corregida por la empresa",
      detalle: `${formatFechaHora(o.contenido_editado_en)} · ${o.empresa_nombre}`,
      ...ICONO_HISTORIAL.actualizado,
    });
  }
  if (o.revisado_en) {
    const autor = o.nombreRevisor ? ` · ${o.nombreRevisor}` : "";
    eventos.push(
      o.estado === "rechazada"
        ? {
            clave: "rechazada",
            fecha: o.revisado_en,
            titulo: "Rechazada",
            detalle: `${formatFechaHora(o.revisado_en)}${autor}`,
            nota: o.motivo_rechazo ? <MotivoRechazo>{o.motivo_rechazo}</MotivoRechazo> : undefined,
            ...ICONO_HISTORIAL.rechazado,
          }
        : {
            clave: "revisada",
            fecha: o.revisado_en,
            titulo: o.nombreRevisor ? `Revisada por ${o.nombreRevisor}` : "Revisada",
            detalle: formatFechaHora(o.revisado_en),
            ...ICONO_HISTORIAL.revisado,
          },
    );
  }
  if (o.publicado_en) {
    eventos.push({
      clave: "publicada",
      fecha: o.publicado_en,
      titulo: "Publicada en el portal",
      detalle: formatFechaHora(o.publicado_en),
      ...ICONO_HISTORIAL.aprobado,
    });
  }
  const minuto = (iso: string) => Math.floor(new Date(iso).getTime() / 60_000);
  return eventos
    .map((e, i) => ({ e, i }))
    .sort((a, b) => minuto(a.e.fecha) - minuto(b.e.fecha) || a.i - b.i)
    .map(({ e }) => e);
}
