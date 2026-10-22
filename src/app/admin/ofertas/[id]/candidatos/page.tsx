import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building, ChevronDown, Clock, Users } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirRolPagina } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { estadoVencimiento } from "@/lib/ofertas-vencimiento";
import { consultarPagina, leerPagina, type ParamsUrl } from "@/lib/paginacion";
import { estadosDeComprobantes } from "@/lib/comprobantes";
import { nivelDe } from "@/lib/procedencia";
import {
  TONO_INVITACION,
  destinoVolverBusqueda,
  esEstadoInvitacion,
  rutaBuscarPostulantes,
  textoUltimaInvitacion,
} from "@/lib/invitaciones";
import { nombresCategorias } from "@/lib/ofertas";
import { badgePostulacion } from "@/lib/admin/postulacion-estados";
import { formatFechaCorta } from "@/lib/fechas";
import { BotonVolver } from "@/components/ui/boton-volver";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { Badge, claseTono } from "@/components/ui/badge";
import { BadgeProcedencia } from "@/components/postulantes/badge-procedencia";
import { BadgeCoincidencia, MotivosCoincidencia } from "@/components/ofertas/coincidencia";
import { BadgePorInvitacion } from "@/components/admin/badge-por-invitacion";
import type { FilaCandidatoParaOferta } from "@/types/db";
import { cn } from "@/lib/utils";
import { InvitarBoton } from "@/components/admin/invitar-boton";
import { NoInteresado } from "./no-interesado";
import { DatosOferta } from "./datos-oferta";

export const metadata: Metadata = {
  title: "Buscar postulantes | Oferta | Panel municipal | Portal de Empleo Funes",
};

const TAMANO = 20;
/** Cuántas postulaciones muestra "Ya se postularon"; el resto, en Postulaciones. */
const POSTULADOS_MAXIMO = 50;

export default async function CandidatosOfertaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<ParamsUrl>;
}) {
  await requerirRolPagina("municipalidad");
  const [{ id: ofertaId }, sp] = await Promise.all([params, searchParams]);
  const ruta = `/admin/ofertas/${ofertaId}/candidatos`;

  const supabase = await createSupabaseServerClient();
  const { data: oferta } = await supabase
    .from("ofertas")
    .select(
      "id, titulo, empresa_nombre, estado, vence_en, ubicacion, modalidad, jornada, requisitos, oferta_categorias(categorias(nombre))",
    )
    .eq("id", ofertaId)
    .maybeSingle();

  if (!oferta) notFound();

  const destino = destinoVolverBusqueda(ofertaId, sp.volver);
  const volver = <BotonVolver href={destino.href}>{destino.texto}</BotonVolver>;

  const abierta =
    oferta.estado === "activa" && !estadoVencimiento(oferta.estado, oferta.vence_en).vencida;

  if (!abierta) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {volver}
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Buscar postulantes
        </h1>
        <EstadoVacio
          tipo="sin-registros"
          className="mt-6"
          icono={Clock}
          titulo="Esta oferta no está publicada o ya venció"
          descripcion="Solo se buscan e invitan postulantes para ofertas activas y vigentes."
        />
      </section>
    );
  }

  const pagina = leerPagina(sp.pagina);

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      {volver}

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Buscar postulantes para {oferta.titulo}
      </h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground-strong">
        <Building className="h-4 w-4 shrink-0" aria-hidden="true" />
        {oferta.empresa_nombre}
      </p>

      <DatosOferta
        className="mt-4"
        rubros={nombresCategorias(oferta.oferta_categorias)}
        requisitos={oferta.requisitos ?? []}
        modalidad={oferta.modalidad}
        ubicacion={oferta.ubicacion}
        jornada={oferta.jornada}
      />

      <Suspense key={pagina} fallback={<EsqueletoLista filas={4} className="mt-6" />}>
        <ListaCandidatos
          ofertaId={ofertaId}
          ofertaTitulo={oferta.titulo}
          ruta={ruta}
          pagina={pagina}
          searchParams={sp}
          volverParam={destino.param}
        />
      </Suspense>

      <Suspense fallback={<EsqueletoLista filas={1} className="mt-8" />}>
        <YaSePostularon ofertaId={ofertaId} />
      </Suspense>
    </section>
  );
}

async function ListaCandidatos({
  ofertaId,
  ofertaTitulo,
  ruta,
  pagina,
  searchParams,
  volverParam,
}: {
  ofertaId: string;
  ofertaTitulo: string;
  ruta: string;
  pagina: number;
  searchParams: ParamsUrl;
  volverParam: string | null;
}) {
  const supabase = await createSupabaseServerClient();

  // El orden (no invitados primero) y el total los resuelve la función, así la
  // paginación respeta los dos grupos. Sus filtros quedan en los valores por
  // defecto: la pantalla no los ofrece.
  const resultado = await consultarPagina<FilaCandidatoParaOferta>(
    pagina,
    async (desde, hasta) => {
      const { data, error } = await supabase.rpc("buscar_candidatos_para_oferta", {
        p_oferta_id: ofertaId,
        p_limite: hasta - desde + 1,
        p_offset: desde,
      });
      const filas: FilaCandidatoParaOferta[] | null = data;
      return { data: filas, count: filas?.length ? Number(filas[0].total) : null, error };
    },
    TAMANO,
  );

  if (!resultado.ok) {
    const ref = logError("admin_candidatos_oferta", resultado.error, { ofertaId });
    return <ErrorListado className="mt-6" refError={ref} />;
  }

  const filas = resultado.filas;

  if (filas.length === 0) {
    return (
      <EstadoVacio
        tipo="sin-registros"
        className="mt-6"
        icono={Users}
        titulo="No encontramos postulantes que coincidan con esta oferta"
        descripcion="Aparecen quienes eligieron alguno de sus rubros o tienen experiencia que coincide con sus requisitos o su título, y todavía no se postularon."
      />
    );
  }

  const comprobantes = await estadosDeComprobantes(
    supabase,
    filas.map((f) => f.usuario_id),
  );

  // Separador "Ya invitados" solo en la página donde empieza ese grupo. Si la
  // página arranca con un invitado, el grupo empezó acá solo si la fila
  // anterior (última de la página previa) no estaba invitada.
  let indiceSeparador = filas.findIndex((f) => f.ya_invitado);
  if (indiceSeparador === 0 && resultado.pagina > 1) {
    const { data: anterior, error: errorAnterior } = await supabase.rpc(
      "buscar_candidatos_para_oferta",
      {
        p_oferta_id: ofertaId,
        p_limite: 1,
        p_offset: (resultado.pagina - 1) * TAMANO - 1,
      },
    );
    if (errorAnterior) logError("admin_candidatos_oferta:anterior", errorAnterior, { ofertaId });
    if (anterior?.[0]?.ya_invitado) indiceSeparador = -1;
  }
  // La ficha vuelve a esta misma página de la búsqueda, con su volver.
  const hrefFicha = (postulanteId: string) =>
    `/admin/postulantes/${postulanteId}?${new URLSearchParams({
      oferta: ofertaId,
      volver: rutaBuscarPostulantes(ofertaId, { volver: volverParam, pagina: resultado.pagina }),
    })}`;

  return (
    <div className="mt-6">
      <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
        {resultado.total === 1
          ? "1 postulante coincide"
          : `${resultado.total} postulantes coinciden`}
      </p>
      <ul className="space-y-3">
        {filas.map((f, i) => (
          <li key={f.postulante_id}>
            {i === indiceSeparador && (
              <h2
                className={cn(
                  "mb-3 flex items-center gap-3 text-sm font-semibold text-muted-foreground-strong",
                  i > 0 && "mt-6",
                )}
              >
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
                Ya invitados a esta oferta
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
              </h2>
            )}
            <TarjetaCandidato
              fila={f}
              ofertaId={ofertaId}
              ofertaTitulo={ofertaTitulo}
              comprobante={comprobantes.get(f.usuario_id) ?? null}
              hrefFicha={hrefFicha(f.postulante_id)}
            />
          </li>
        ))}
      </ul>
      <Paginacion
        className="mt-6"
        ruta={ruta}
        searchParams={searchParams}
        pagina={resultado.pagina}
        total={resultado.total}
        tamano={TAMANO}
      />
    </div>
  );
}

function TarjetaCandidato({
  fila: f,
  ofertaId,
  ofertaTitulo,
  comprobante,
  hrefFicha,
}: {
  fila: FilaCandidatoParaOferta;
  ofertaId: string;
  ofertaTitulo: string;
  comprobante: Parameters<typeof BadgeProcedencia>[0]["comprobante"];
  hrefFicha: string;
}) {
  const nombre = `${f.nombre} ${f.apellido}`.trim();
  const estado = esEstadoInvitacion(f.ultima_invitacion_estado) ? f.ultima_invitacion_estado : null;

  return (
    <article
      aria-label={nombre}
      className={cn(
        "rounded-[var(--radius-lg)] border p-4 sm:p-5",
        f.ya_invitado ? "border-border bg-surface-tinted" : "border-border bg-surface shadow-xs",
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h3 className="break-words font-semibold text-foreground">{nombre}</h3>
          <BadgeProcedencia
            nivel={nivelDe(f.nivel_prioridad)}
            localidad={f.localidad}
            comprobante={comprobante}
          />
        </div>
        <BadgeCoincidencia nivel={f.coincidencia} puntaje={f.puntaje} />
      </div>

      <MotivosCoincidencia datos={f} className="mt-3" />

      {estado && (
        <div className="mt-3">
          {estado === "rechazada" ? (
            <NoInteresado
              motivo={f.ultima_invitacion_motivo}
              className={claseTono(TONO_INVITACION.rechazada)}
            />
          ) : (
            <p
              className={cn(
                "rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold",
                claseTono(TONO_INVITACION[estado]),
              )}
            >
              {textoUltimaInvitacion(estado, f.ultima_invitacion_fecha)}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        {estado !== "pendiente" && (
          <InvitarBoton
            ofertaId={ofertaId}
            ofertaTitulo={ofertaTitulo}
            postulanteId={f.postulante_id}
            nombre={nombre}
            rechazoAnterior={
              estado === "rechazada"
                ? { fecha: f.ultima_invitacion_fecha, motivo: f.ultima_invitacion_motivo }
                : null
            }
          />
        )}
        <Link
          href={hrefFicha}
          className="btn-secundario inline-flex min-h-11 items-center justify-center px-4 text-sm font-medium"
        >
          Ver ficha
        </Link>
      </div>
    </article>
  );
}

/** Postulaciones vigentes (no retiradas) a la oferta, en una sección plegable. */
async function YaSePostularon({ ofertaId }: { ofertaId: string }) {
  const supabase = await createSupabaseServerClient();
  const { data, count, error } = await supabase
    .from("postulaciones")
    .select(
      "id, estado, origen, created_at, postulantes!postulante_id(usuarios!usuario_id(nombre, apellido)), derivaciones(estado_empresa)",
      { count: "exact" },
    )
    .eq("oferta_id", ofertaId)
    .is("retirada_en", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(POSTULADOS_MAXIMO);

  if (error) {
    const ref = logError("admin_candidatos_postulados", error, { ofertaId });
    return <ErrorListado className="mt-8" refError={ref} />;
  }

  const total = count ?? data.length;

  return (
    <details className="group mt-8 rounded-[var(--radius-lg)] border border-border bg-surface">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        Ya se postularon ({total})
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </summary>
      {data.length === 0 ? (
        <p className="border-t border-border px-4 py-4 text-sm text-muted-foreground">
          Todavía nadie se postuló a esta oferta.
        </p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {data.map((p) => {
            const usuario = p.postulantes?.usuarios;
            const badge = badgePostulacion(p.estado, p.derivaciones?.estado_empresa);
            return (
              <li
                key={p.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-foreground">
                    {usuario ? `${usuario.nombre} ${usuario.apellido}` : "—"}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tono={badge.tono} estado>
                      {badge.label}
                    </Badge>
                    {p.origen === "invitacion" && <BadgePorInvitacion />}
                    <span className="text-xs text-muted-foreground">
                      {formatFechaCorta(p.created_at)}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/admin/postulaciones/${p.id}`}
                  className="btn-secundario inline-flex min-h-11 w-fit items-center px-4 text-sm font-medium"
                >
                  Ver postulación
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {total > data.length && (
        <p className="border-t border-border px-4 py-3 text-sm">
          <Link
            href={`/admin/postulaciones?oferta_id=${ofertaId}`}
            className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-2 hover:underline"
          >
            Ver todas en Postulaciones
          </Link>
        </p>
      )}
    </details>
  );
}
