import type { Metadata } from "next";
import { COLUMNAS, EsqueletoCandidatos, EsqueletoYaSePostularon } from "./esqueleto";
import { Fragment, Suspense } from "react";
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
import { Badge, claseTono } from "@/components/ui/badge";
import { BadgeProcedencia } from "@/components/postulantes/badge-procedencia";
import { BadgeCoincidencia, MotivosCoincidencia } from "@/components/ofertas/coincidencia";
import { BadgePorInvitacion } from "@/components/admin/badge-por-invitacion";
import type { FilaCandidatoParaOferta } from "@/types/db";
import { inicialesDePersona } from "@/lib/iniciales";
import { fotosDePerfil } from "@/lib/fotos-perfil";
import {
  CLASE_ACCION_FILA,
  CeldaPersona,
  CeldaTabla,
  FilaTabla,
  SeparadorTabla,
  Tabla,
} from "@/components/ui/tabla";
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

// Postulante | Procedencia | Coincidencia | Invitación | acciones.

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
  const volver = <BotonVolver href={destino.href} />;

  const abierta =
    oferta.estado === "activa" && !estadoVencimiento(oferta.estado, oferta.vence_en).vencida;

  if (!abierta) {
    return (
      <section>
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
    <section>
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

      <Suspense key={pagina} fallback={<EsqueletoCandidatos />}>
        <ListaCandidatos
          ofertaId={ofertaId}
          ofertaTitulo={oferta.titulo}
          ruta={ruta}
          pagina={pagina}
          searchParams={sp}
          volverParam={destino.param}
        />
      </Suspense>

      <Suspense fallback={<EsqueletoYaSePostularon />}>
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

  const usuarioIds = filas.map((f) => f.usuario_id);
  const [comprobantes, fotos] = await Promise.all([
    estadosDeComprobantes(supabase, usuarioIds),
    fotosDePerfil(usuarioIds),
  ]);

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
      <Tabla
        columnas={COLUMNAS}
        etiqueta="Postulantes que coinciden"
        encabezados={["Postulante", "Procedencia", "Coincidencia", "Invitación", ""]}
      >
        {filas.map((f, i) => (
          <Fragment key={f.postulante_id}>
            {i === indiceSeparador && <SeparadorTabla>Ya invitados a esta oferta</SeparadorTabla>}
            <FilaCandidato
              fila={f}
              ofertaId={ofertaId}
              ofertaTitulo={ofertaTitulo}
              comprobante={comprobantes.get(f.usuario_id) ?? null}
              foto={fotos.get(f.usuario_id)}
              hrefFicha={hrefFicha(f.postulante_id)}
            />
          </Fragment>
        ))}
      </Tabla>
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

function FilaCandidato({
  fila: f,
  ofertaId,
  ofertaTitulo,
  comprobante,
  foto,
  hrefFicha,
}: {
  fila: FilaCandidatoParaOferta;
  ofertaId: string;
  ofertaTitulo: string;
  comprobante: Parameters<typeof BadgeProcedencia>[0]["comprobante"];
  foto: { url: string | null; ajuste?: { x: number; y: number; zoom: number } } | undefined;
  hrefFicha: string;
}) {
  const nombre = `${f.nombre} ${f.apellido}`.trim();
  const estado = esEstadoInvitacion(f.ultima_invitacion_estado) ? f.ultima_invitacion_estado : null;

  return (
    <FilaTabla className={f.ya_invitado ? "bg-surface-tinted" : undefined}>
      <CeldaPersona
        nombre={nombre}
        href={hrefFicha}
        foto={foto}
        iniciales={inicialesDePersona(f.nombre, f.apellido)}
      />
      <CeldaTabla etiqueta="Procedencia">
        <BadgeProcedencia
          nivel={nivelDe(f.nivel_prioridad)}
          localidad={f.localidad}
          comprobante={comprobante}
        />
      </CeldaTabla>
      <CeldaTabla etiqueta="Coincidencia" className="flex flex-col items-start gap-2">
        <BadgeCoincidencia nivel={f.coincidencia} puntaje={f.puntaje} />
        <MotivosCoincidencia datos={f} />
      </CeldaTabla>
      <CeldaTabla etiqueta="Invitación" className={estado ? undefined : "hidden @4xl:block"}>
        {estado === "rechazada" ? (
          <NoInteresado
            motivo={f.ultima_invitacion_motivo}
            className={claseTono(TONO_INVITACION.rechazada)}
          />
        ) : estado ? (
          <p
            className={cn(
              "w-fit rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold",
              claseTono(TONO_INVITACION[estado]),
            )}
          >
            {textoUltimaInvitacion(estado, f.ultima_invitacion_fecha)}
          </p>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </CeldaTabla>
      <div className="flex flex-col gap-2 @4xl:flex-row @4xl:justify-end">
        <Link href={hrefFicha} className={`btn-neutro ${CLASE_ACCION_FILA}`}>
          Ver ficha
          <span className="sr-only">: {nombre}</span>
        </Link>
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
            claseBoton={CLASE_ACCION_FILA}
          />
        )}
      </div>
    </FilaTabla>
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
