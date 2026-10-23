import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { CalendarClock, Clock, MapPin } from "lucide-react";
import { getOfertaById } from "@/lib/ofertas";
import { formatFecha } from "@/lib/fechas";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { esOficinaActiva, obtenerPostulanteActual, obtenerUsuarioActual } from "@/lib/auth";
import { ofertaAceptaInvitaciones, rutaBuscarPostulantes } from "@/lib/invitaciones";
import { estadoVencimiento } from "@/lib/ofertas-vencimiento";
import { consultaCvsDisponibles, conUrlsFirmadas } from "@/lib/cvs";
import { logError } from "@/lib/logger";
import { sePuedeRetirar } from "@/lib/mis-postulaciones";
import { obtenerInvitacionesPendientes } from "@/lib/postulante/panel";
import { BotonVolver } from "@/components/ui/boton-volver";
import { EtiquetaRubro } from "@/components/ui/etiqueta-rubro";
import { Badge } from "@/components/ui/badge";
import { Franja } from "@/components/ui/franja";
import { InicialesEmpresa } from "@/components/ofertas/iniciales-empresa";
import type { ClienteSupabase } from "@/types/db";
import { TarjetaLateral, type VarianteLateral } from "./tarjeta-lateral";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function OfertaDetallePage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  const oferta = await getOfertaById(id);
  if (!oferta) notFound();

  // Una oferta vencida sigue en estado 'activa' (no hay cron): se muestra, pero
  // sin el formulario para postularse.
  const { vencida } = estadoVencimiento("activa", oferta.venceEn ?? null);

  const user = await obtenerUsuarioActual();
  // La oficina no se postula: en su lugar busca postulantes para la oferta.
  const esOficina = esOficinaActiva(user);
  const puedeBuscarPostulantes = esOficina && ofertaAceptaInvitaciones("activa", oferta.venceEn);

  const loginHref = `/auth/login?redirect=${encodeURIComponent(`/ofertas/${oferta.id}?accion=postular`)}`;

  let variante: VarianteLateral = vencida ? { tipo: "cerrada" } : { tipo: "sin-sesion", loginHref };
  // Fecha en que la empresa editó la oferta después de la postulación, si pasó.
  let modificadaEn: string | null = null;

  if (user) {
    const rol = user.perfil?.rol ?? null;

    if (esOficina) {
      if (!vencida) {
        variante = {
          tipo: "oficina",
          hrefBuscarPostulantes: puedeBuscarPostulantes
            ? rutaBuscarPostulantes(oferta.id, { volver: `/ofertas/${oferta.id}` })
            : null,
        };
      }
    } else if (rol === "empresa" || rol === "municipalidad") {
      if (!vencida) variante = { tipo: "otro-rol" };
    } else if (rol === "postulante") {
      const postulante = await obtenerPostulanteActual();

      if (postulante) {
        const supabase = await createSupabaseServerClient();
        // Solo la postulación vigente: una retirada queda en el historial y
        // no impide volver a postularse (migration_053, una vigente por oferta).
        const { data: postulacion } = await supabase
          .from("postulaciones")
          .select("id, estado, created_at, ofertas(contenido_editado_en)")
          .eq("oferta_id", oferta.id)
          .eq("postulante_id", postulante.id)
          .is("retirada_en", null)
          .maybeSingle();

        if (postulacion) {
          variante = await varianteYaPostulado(supabase, postulacion, vencida);
          const editadaEn = postulacion.ofertas?.contenido_editado_en ?? null;
          if (editadaEn && editadaEn > postulacion.created_at) modificadaEn = editadaEn;
        } else if (!vencida) {
          const [cvResult, invitaciones] = await Promise.all([
            consultaCvsDisponibles(supabase, user.id),
            obtenerInvitacionesPendientes(),
          ]);
          const cvs = await conUrlsFirmadas(supabase, cvResult.data ?? [], 600);
          const invitacion = (invitaciones.data ?? []).find((i) => i.oferta_id === oferta.id);

          variante = invitacion
            ? { tipo: "invitado", invitacion: { id: invitacion.id, creadaEn: invitacion.creada_en }, cvs }
            : {
                tipo: "puede-postularse",
                cvs,
                autoOpen: cvs.length > 0 && sp.accion === "postular",
              };
        }
      }
    }
  }

  return (
    <main className="flex-1">
      <BotonVolver href="/ofertas" destacado />

      <div className="@container mt-4">
        <div className="grid grid-cols-1 items-start gap-4 @4xl:grid-cols-[minmax(0,1fr)_360px] @4xl:gap-7">
          {/* Encabezado */}
          <article
            aria-labelledby="oferta-titulo"
            className="tarjeta flex flex-col gap-4 px-4 py-[18px] sm:p-6 @4xl:col-start-1"
          >
            {modificadaEn && (
              <Franja tono="aviso" titulo="La empresa modificó esta oferta después de tu postulación.">
                Fecha de la modificación: {formatFecha(modificadaEn)}.
              </Franja>
            )}

            <div className="flex items-start gap-4">
              <InicialesEmpresa empresa={oferta.empresa} tamano={64} />
              <div className="min-w-0 flex-1">
                <h1
                  id="oferta-titulo"
                  className="break-words text-2xl leading-tight font-extrabold text-heading sm:text-[30px]"
                >
                  {oferta.titulo}
                </h1>
                <p className="mt-1 text-base font-bold text-texto-bajada">{oferta.empresa}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {oferta.categorias.map((cat) => (
                <EtiquetaRubro key={cat} verde>
                  {cat}
                </EtiquetaRubro>
              ))}
              <EtiquetaRubro>{oferta.modalidad}</EtiquetaRubro>
              {vencida && <Badge tono="neutral">Cerrada</Badge>}
            </div>

            <ul className="flex flex-col gap-2 text-[15px] text-muted-foreground-strong sm:flex-row sm:flex-wrap sm:gap-x-6">
              <Metadato icono={<Clock className="size-[18px] shrink-0" aria-hidden="true" />}>
                <span className="sr-only">Jornada: </span>
                {oferta.jornada}
              </Metadato>
              <Metadato icono={<MapPin className="size-[18px] shrink-0" aria-hidden="true" />}>
                <span className="sr-only">Lugar: </span>
                {oferta.ubicacion}
              </Metadato>
              {oferta.venceEn && (
                <Metadato icono={<CalendarClock className="size-[18px] shrink-0" aria-hidden="true" />}>
                  {vencida ? "Venció el" : "Vence el"} {formatFecha(oferta.venceEn)}
                </Metadato>
              )}
            </ul>
          </article>

          {/* Lateral: en el celular va entre el encabezado y la descripción */}
          <aside className="@4xl:sticky @4xl:top-6 @4xl:col-start-2 @4xl:row-span-2 @4xl:row-start-1">
            <TarjetaLateral
              variante={variante}
              oferta={{
                id: oferta.id,
                titulo: oferta.titulo,
                empresa: oferta.empresa,
                venceEn: oferta.venceEn ?? null,
              }}
            />
          </aside>

          {/* Contenido */}
          <div className="tarjeta flex flex-col gap-6 px-4 py-[18px] sm:p-6 @4xl:col-start-1">
            <SeccionContenido titulo="Descripción">
              <p className="whitespace-pre-line text-base leading-[1.6] text-texto-parrafo">
                {oferta.descripcion}
              </p>
            </SeccionContenido>
            {/* Ofertas viejas sin requisitos: "-" en lugar de la lista. */}
            <SeccionContenido titulo="Requisitos">
              {oferta.requisitos.length > 0 ? (
                <ListaContenido items={oferta.requisitos} />
              ) : (
                <p className="text-base text-texto-parrafo">-</p>
              )}
            </SeccionContenido>
            {(oferta.beneficios ?? []).length > 0 && (
              <SeccionContenido titulo="Beneficios">
                <ListaContenido items={oferta.beneficios ?? []} />
              </SeccionContenido>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * Con una postulación vigente: el CV con el que se postuló y si la puede
 * retirar (para una derivada hace falta el resultado de la empresa).
 */
async function varianteYaPostulado(
  supabase: ClienteSupabase,
  postulacion: { id: string; estado: VarianteYaPostulado["postulacion"]["estado"]; created_at: string },
  vencida: boolean,
): Promise<VarianteLateral> {
  const derivada = postulacion.estado === "derivada";
  const pendiente = postulacion.estado === "recibida" || postulacion.estado === "en_revision";

  const [cvs, derivacion, preEntrevistas] = await Promise.all([
    supabase.rpc("cvs_de_mis_postulaciones", { p_postulacion_ids: [postulacion.id] }),
    derivada
      ? supabase.rpc("estado_derivacion_postulante", { p_postulacion_id: postulacion.id })
      : null,
    pendiente
      ? supabase.rpc("mis_pre_entrevistas", { p_postulacion_ids: [postulacion.id] })
      : null,
  ]);
  if (cvs.error) logError("detalle_oferta:cvs_de_mis_postulaciones", cvs.error);
  if (derivacion?.error) logError("detalle_oferta:estado_derivacion_postulante", derivacion.error);
  if (preEntrevistas?.error) logError("detalle_oferta:mis_pre_entrevistas", preEntrevistas.error);

  const estadoEmpresa = derivacion?.data?.[0]?.estado_empresa ?? null;

  return {
    tipo: "ya-postulado",
    postulacion: { id: postulacion.id, estado: postulacion.estado, createdAt: postulacion.created_at },
    cvNombre: cvs.data?.[0]?.nombre_original ?? null,
    puedeRetirar: sePuedeRetirar(postulacion.estado, estadoEmpresa),
    conPreEntrevista: preEntrevistas?.data?.[0]?.estado === "coordinada",
    vencida,
  };
}

type VarianteYaPostulado = Extract<VarianteLateral, { tipo: "ya-postulado" }>;

function Metadato({ icono, children }: { icono: ReactNode; children: ReactNode }) {
  return (
    <li className="flex min-w-0 items-center gap-2">
      {icono}
      <span className="min-w-0 break-words">{children}</span>
    </li>
  );
}

function SeccionContenido({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-lg font-extrabold text-heading">{titulo}</h2>
      {children}
    </section>
  );
}

function ListaContenido({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-[22px] text-base leading-[1.6] text-texto-parrafo marker:text-primary">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
