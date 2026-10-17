import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { QueryData } from "@supabase/supabase-js";
import { logError } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Badge } from "@/components/ui/badge";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { DatosCandidato } from "@/components/admin/datos-candidato";
import { obtenerCandidato } from "@/lib/admin/candidato";
import { badgePostulacion } from "@/lib/admin/postulacion-estados";
import { AsignarCursoDialog } from "../asignar-curso-dialog";
import { EstadoCursoBadge } from "@/components/cursos/estado-curso-badge";
import { formatFecha, formatFechaCorta, formatFechaHoraCorta } from "@/lib/fechas";
import { InformacionLaboralResumen } from "@/components/postulantes/informacion-laboral-resumen";
import {
  PRE_ENTREVISTA_LABEL,
  PRE_ENTREVISTA_STYLE,
  esEstadoPreEntrevista,
} from "@/lib/pre-entrevistas";
import {
  consultarPagina,
  leerPagina,
  type ParamsUrl,
  type ResultadoPagina,
} from "@/lib/paginacion";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { BookOpen, Briefcase, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  UMBRAL_RECHAZOS_CURSO,
  VENTANA_RECHAZOS_DIAS,
  aEstadoCursos,
  conEstadoCurso,
  rechazoCuentaParaCurso,
  textoCursosPendientes,
  textoRechazos,
  type EstadoAsignacionCurso,
} from "@/lib/cursos";
import type { ClienteSupabase } from "@/types/db";
import { requerirRolPagina } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Ficha postulante | Panel municipal | Portal de Empleo Funes",
};

const TAMANO_HISTORIAL = 10;

function consultaPostulaciones(supabase: ClienteSupabase, postulanteId: string) {
  return supabase
    .from("postulaciones")
    .select(
      "id, estado, created_at, ofertas!oferta_id(id, titulo, empresa_nombre), derivaciones(estado_empresa), pre_entrevistas(estado, fecha_hora, lugar, nota_oficina)",
      { count: "exact" }
    )
    .eq("postulante_id", postulanteId);
}

function consultaAsignaciones(supabase: ClienteSupabase, postulanteId: string) {
  return supabase
    .from("asignaciones_curso")
    .select(
      "id, created_at, nota, estado, iniciado_en, completado_en, abandonado_en, cursos!curso_id(id, nombre)",
      { count: "exact" }
    )
    .eq("postulante_id", postulanteId);
}

// La fecha del rechazo es fecha_respuesta, o updated_at si falta (igual
// que en la base); las filas sin fecha_respuesta son las más viejas.
function consultaRechazos(supabase: ClienteSupabase, postulanteId: string) {
  return supabase
    .from("derivaciones")
    .select(
      "id, fecha_respuesta, updated_at, nota_empresa, postulaciones!inner(postulante_id, ofertas!oferta_id(id, titulo, empresa_nombre))",
      { count: "exact" }
    )
    .eq("estado_empresa", "rechazado")
    .eq("postulaciones.postulante_id", postulanteId);
}

type PostulacionHistorial = QueryData<ReturnType<typeof consultaPostulaciones>>[number];
type AsignacionRow = Omit<QueryData<ReturnType<typeof consultaAsignaciones>>[number], "estado"> & {
  estado: EstadoAsignacionCurso;
};
type RechazoRow = QueryData<ReturnType<typeof consultaRechazos>>[number];

export default async function PostulanteFichaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    volver?: string;
    pagina_cursos?: string;
    pagina_postulaciones?: string;
    pagina_rechazos?: string;
  }>;
}) {
  await requerirRolPagina("municipalidad");
  const [{ id: postulanteId }, sp] = await Promise.all([params, searchParams]);
  const rawVolver = sp.volver;
  const paginaCursos = leerPagina(sp.pagina_cursos);
  const paginaPostulaciones = leerPagina(sp.pagina_postulaciones);
  const paginaRechazos = leerPagina(sp.pagina_rechazos);
  const rutaFicha = `/admin/postulantes/${postulanteId}`;

  // Validar que volver solo apunte a /admin/postulantes
  const volverHref =
    typeof rawVolver === "string" &&
    rawVolver.startsWith("/admin/postulantes")
      ? rawVolver
      : "/admin/postulantes";

  const supabase = await createSupabaseServerClient();
  const [
    candidato,
    postulacionesResult,
    estadoCursosResult,
    asignacionesResult,
    cursosResult,
    rechazosResult,
    cursosPendientesResult,
  ] = await Promise.all([
    obtenerCandidato(postulanteId),
    consultarPagina(
      paginaPostulaciones,
      (desde, hasta) =>
        consultaPostulaciones(supabase, postulanteId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(desde, hasta),
      TAMANO_HISTORIAL
    ),
    supabase.rpc("estado_cursos_postulantes", {
      p_postulante_ids: [postulanteId],
    }),
    consultarPagina(
      paginaCursos,
      (desde, hasta) =>
        consultaAsignaciones(supabase, postulanteId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(desde, hasta),
      TAMANO_HISTORIAL
    ),
    supabase
      .from("cursos")
      .select("id, nombre, descripcion")
      .eq("activo", true)
      .order("nombre"),
    consultarPagina(
      paginaRechazos,
      (desde, hasta) =>
        consultaRechazos(supabase, postulanteId)
          .order("fecha_respuesta", { ascending: false, nullsFirst: false })
          .order("updated_at", { ascending: false })
          .order("id", { ascending: false })
          .range(desde, hasta),
      TAMANO_HISTORIAL
    ),
    supabase
      .from("asignaciones_curso")
      .select("curso_id")
      .eq("postulante_id", postulanteId)
      .in("estado", ["asignado", "en_curso"]),
  ]);

  if (!candidato) notFound();

  if (estadoCursosResult.error)
    logError("estado_cursos_postulantes", estadoCursosResult.error);
  if (!postulacionesResult.ok)
    logError("admin_postulante_postulaciones", postulacionesResult.error);
  if (!asignacionesResult.ok)
    logError("admin_postulante_asignaciones", asignacionesResult.error);
  if (!rechazosResult.ok) logError("admin_postulante_rechazos", rechazosResult.error);
  if (cursosPendientesResult.error)
    logError("admin_postulante_cursos_pendientes", cursosPendientesResult.error);
  const filaEstadoCursos = estadoCursosResult.data?.[0];
  const estadoCursos = filaEstadoCursos ? aEstadoCursos(filaEstadoCursos) : null;
  const rechazosVentana = Number(estadoCursos?.rechazos_ventana ?? 0);
  const rechazosTotales = Number(estadoCursos?.rechazos_totales ?? 0);
  const asignacionActivaEstado = estadoCursos?.asignacion_activa_estado ?? null;
  const cursosActivos = cursosResult.data ?? [];
  const asignaciones: ResultadoPagina<AsignacionRow> = asignacionesResult.ok
    ? { ...asignacionesResult, filas: conEstadoCurso(asignacionesResult.filas) }
    : asignacionesResult;
  const necesitaCurso = estadoCursos?.necesita_curso ?? false;
  const puedeRecibirCurso = estadoCursos?.puede_recibir_curso ?? false;
  const cantidadCursosPendientes = Number(estadoCursos?.cursos_activos ?? 0);
  const cursosPendientesIds = (cursosPendientesResult.data ?? []).map((a) => a.curso_id);
  const nombreCompleto = `${candidato.usuario.nombre} ${candidato.usuario.apellido}`;

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">
          Panel
        </Link>
        <span>/</span>
        <Link href={volverHref} className="hover:text-foreground">
          ← Postulantes
        </Link>
        <span>/</span>
        <span className="text-foreground">{nombreCompleto}</span>
      </div>

      {/* Cabecera */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <AvatarAjustado
            src={candidato.avatar.url}
            alt={nombreCompleto}
            ajuste={candidato.avatar.ajuste}
            size="lg"
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {nombreCompleto}
            </h1>
            {necesitaCurso ? (
              <span className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                Necesita curso · {textoRechazos(rechazosVentana)} en {VENTANA_RECHAZOS_DIAS} días
              </span>
            ) : (
              asignacionActivaEstado && (
                <EstadoCursoBadge estado={asignacionActivaEstado} className="mt-1" />
              )
            )}
          </div>
        </div>
        {(cantidadCursosPendientes > 0 || puedeRecibirCurso) && (
          <div className="flex flex-wrap items-center gap-3">
            {cantidadCursosPendientes > 0 && (
              <a
                href="#rechazos-y-cursos"
                className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground"
              >
                {textoCursosPendientes(cantidadCursosPendientes)}
              </a>
            )}
            {puedeRecibirCurso && (
              <AsignarCursoDialog
                postulanteId={postulanteId}
                postulanteNombre={nombreCompleto}
                cursosActivos={cursosActivos}
                cursosPendientesIds={cursosPendientesIds}
                destacado
              />
            )}
          </div>
        )}
      </div>

      <div className="mt-8 space-y-6">
        <DatosCandidato
          email={candidato.email}
          dni={candidato.postulante.dni}
          domicilio={candidato.postulante.domicilio}
          telefono={candidato.usuario.telefono}
          categorias={candidato.categorias}
          cvUrl={candidato.cvUrl}
        />

        <InformacionLaboralResumen info={candidato.postulante} className="bg-surface" />

        {/* Rechazos y cursos */}
        <div
          id="rechazos-y-cursos"
          className="rounded-[var(--radius-lg)] border border-border bg-surface p-5"
        >
          <h2 className="font-semibold text-foreground">Rechazos y cursos</h2>

          <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-[var(--radius-md)] bg-surface-tinted p-3">
              <dt className="text-xs text-muted-foreground">
                Rechazos en los últimos {VENTANA_RECHAZOS_DIAS} días
              </dt>
              <dd
                className={`mt-1 text-2xl font-bold ${
                  rechazosVentana >= UMBRAL_RECHAZOS_CURSO ? "text-amber-700" : "text-foreground"
                }`}
              >
                {rechazosVentana}
              </dd>
              <dd className="mt-0.5 text-xs text-muted-foreground">
                {estadoCursos?.ultimo_completado_en
                  ? `Desde el último curso completado (${formatFechaCorta(estadoCursos.ultimo_completado_en)})`
                  : `Con ${UMBRAL_RECHAZOS_CURSO} o más se le puede asignar un curso`}
              </dd>
            </div>
            <div className="rounded-[var(--radius-md)] bg-surface-tinted p-3">
              <dt className="text-xs text-muted-foreground">Rechazos totales</dt>
              <dd className="mt-1 text-2xl font-bold text-foreground">{rechazosTotales}</dd>
            </div>
            <div className="rounded-[var(--radius-md)] bg-surface-tinted p-3">
              <dt className="text-xs text-muted-foreground">Cursos</dt>
              <dd className="mt-1.5">
                {necesitaCurso ? (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    Necesita curso
                  </span>
                ) : cantidadCursosPendientes > 0 ? (
                  <span className="text-sm font-medium text-foreground">
                    {textoCursosPendientes(cantidadCursosPendientes)}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Sin curso pendiente</span>
                )}
              </dd>
              {cantidadCursosPendientes > 0 && puedeRecibirCurso && (
                <dd className="mt-1 text-xs text-amber-700">
                  Tiene {UMBRAL_RECHAZOS_CURSO} o más rechazos recientes: se le puede asignar otro curso.
                </dd>
              )}
            </div>
          </dl>

          {/* Rechazos */}
          <HistorialRechazos
            resultado={rechazosResult}
            ultimoCompletadoEn={estadoCursos?.ultimo_completado_en ?? null}
            ruta={rutaFicha}
            searchParams={sp}
          />

          {/* Historial de cursos */}
          <HistorialCursos resultado={asignaciones} ruta={rutaFicha} searchParams={sp} />
        </div>

        {/* Historial de postulaciones */}
        <HistorialPostulaciones
          resultado={postulacionesResult}
          ruta={rutaFicha}
          searchParams={sp}
        />
      </div>
    </section>
  );
}

type PropsHistorial<T> = {
  resultado: ResultadoPagina<T>;
  ruta: string;
  searchParams: ParamsUrl;
};

const TITULO_HISTORIAL = "scroll-mt-20 text-sm font-semibold text-foreground";

function HistorialRechazos({
  resultado,
  ultimoCompletadoEn,
  ruta,
  searchParams,
}: PropsHistorial<RechazoRow> & { ultimoCompletadoEn: string | null }) {
  const ancla = "historial-rechazos";
  return (
    <>
      <h3 id={ancla} className={`mt-6 ${TITULO_HISTORIAL}`}>
        Rechazos de empresas{resultado.ok && ` (${resultado.total})`}
      </h3>
      {!resultado.ok ? (
        <ErrorListado className="mt-2" mensaje="No pudimos cargar los rechazos." />
      ) : resultado.filas.length === 0 ? (
        <EstadoVacio
          tipo="sin-registros"
          className="mt-2"
          icono={ThumbsDown}
          titulo="Ninguna empresa rechazó a este postulante."
        />
      ) : (
        <>
          <ul className="mt-2 divide-y divide-border rounded-[var(--radius-md)] border border-border">
            {resultado.filas.map((r) => {
              const fecha = r.fecha_respuesta ?? r.updated_at;
              const oferta = r.postulaciones?.ofertas ?? null;
              return (
                <li
                  key={r.id}
                  className="flex flex-col gap-1 px-3 py-2.5 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {oferta?.titulo ?? "Oferta eliminada"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {oferta?.empresa_nombre ?? "—"}
                    </p>
                    <p className="mt-1 whitespace-pre-line break-words text-xs">
                      <span className="text-muted-foreground">Motivo: </span>
                      {r.nota_empresa?.trim() ? (
                        <span className="text-foreground">{r.nota_empresa}</span>
                      ) : (
                        <span className="text-muted-foreground">Sin motivo informado</span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {formatFechaCorta(fecha)}
                    {rechazoCuentaParaCurso(fecha, ultimoCompletadoEn) && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                        Cuenta para el curso
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <Paginacion
            className="mt-3"
            ruta={ruta}
            searchParams={searchParams}
            pagina={resultado.pagina}
            total={resultado.total}
            tamano={TAMANO_HISTORIAL}
            parametro="pagina_rechazos"
            ancla={ancla}
          />
        </>
      )}
    </>
  );
}

function HistorialCursos({ resultado, ruta, searchParams }: PropsHistorial<AsignacionRow>) {
  const ancla = "historial-cursos";
  return (
    <>
      <h3 id={ancla} className={`mt-6 ${TITULO_HISTORIAL}`}>
        Historial de cursos{resultado.ok && ` (${resultado.total})`}
      </h3>
      {!resultado.ok ? (
        <ErrorListado className="mt-2" mensaje="No pudimos cargar el historial de cursos." />
      ) : resultado.filas.length === 0 ? (
        <EstadoVacio
          tipo="sin-registros"
          className="mt-2"
          icono={BookOpen}
          titulo="Todavía no se asignó ningún curso a este postulante."
        />
      ) : (
        <>
          <ul className="mt-2 divide-y divide-border rounded-[var(--radius-md)] border border-border">
            {resultado.filas.map((a) => {
              const curso = a.cursos;
              return (
                <li key={a.id} className="space-y-1 px-3 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    {curso ? (
                      <Link
                        href={`/admin/cursos/${curso.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {curso.nombre}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">Curso eliminado</span>
                    )}
                    <EstadoCursoBadge estado={a.estado} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Asignado el {formatFechaCorta(a.created_at)}
                    {a.iniciado_en && ` · Empezado el ${formatFechaCorta(a.iniciado_en)}`}
                    {a.completado_en && ` · Completado el ${formatFechaCorta(a.completado_en)}`}
                    {a.estado === "abandonado" &&
                      a.abandonado_en &&
                      ` · Abandonado el ${formatFechaCorta(a.abandonado_en)}`}
                  </p>
                  {a.nota && (
                    <p className="text-xs text-muted-foreground">Nota interna: {a.nota}</p>
                  )}
                </li>
              );
            })}
          </ul>
          <Paginacion
            className="mt-3"
            ruta={ruta}
            searchParams={searchParams}
            pagina={resultado.pagina}
            total={resultado.total}
            tamano={TAMANO_HISTORIAL}
            parametro="pagina_cursos"
            ancla={ancla}
          />
        </>
      )}
    </>
  );
}

function HistorialPostulaciones({
  resultado,
  ruta,
  searchParams,
}: PropsHistorial<PostulacionHistorial>) {
  const ancla = "historial-postulaciones";
  return (
    <div
      id={ancla}
      className="scroll-mt-20 rounded-[var(--radius-lg)] border border-border bg-surface p-5"
    >
      <h2 className="font-semibold text-foreground">
        Historial de postulaciones{resultado.ok && ` (${resultado.total})`}
      </h2>

      {!resultado.ok ? (
        <ErrorListado className="mt-3" mensaje="No pudimos cargar el historial de postulaciones." />
      ) : resultado.filas.length === 0 ? (
        <EstadoVacio
          tipo="sin-registros"
          className="mt-3"
          icono={Briefcase}
          titulo="Todavía no se postuló a ninguna oferta."
        />
      ) : (
        <>
          {/* Tabla md+ */}
          <div className="mt-4 hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Oferta</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Empresa</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Fecha</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Estado</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Pre-entrevista</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {resultado.filas.map((p) => {
                  const badgeCfg = badgePostulacion(p.estado, p.derivaciones?.estado_empresa);
                  return (
                    <tr key={p.id} className="align-top">
                      <td className="py-3 pr-4 font-medium text-foreground">
                        {p.ofertas?.titulo ?? "Oferta eliminada"}
                      </td>
                      <td className="py-3 pr-4 text-foreground">
                        {p.ofertas?.empresa_nombre ?? "—"}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {formatFecha(p.created_at)}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={badgeCfg.variant} className={badgeCfg.className}>
                          {badgeCfg.label}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <PreEntrevistaHistorial pre={p.pre_entrevistas} />
                      </td>
                      <td className="py-3 w-px whitespace-nowrap">
                        <Link
                          href={`/admin/postulaciones/${p.id}`}
                          className="btn-secundario inline-flex items-center gap-1 whitespace-nowrap px-3 py-1.5 text-xs"
                        >
                          Ver ficha
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards mobile */}
          <div className="mt-4 space-y-3 md:hidden">
            {resultado.filas.map((p) => {
              const badgeCfg = badgePostulacion(p.estado, p.derivaciones?.estado_empresa);
              return (
                <div
                  key={p.id}
                  className="rounded-[var(--radius-md)] border border-border p-3 space-y-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium text-foreground text-sm">
                      {p.ofertas?.titulo ?? "Oferta eliminada"}
                    </p>
                    <Badge variant={badgeCfg.variant} className={badgeCfg.className}>
                      {badgeCfg.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {p.ofertas?.empresa_nombre ?? "—"} · {formatFecha(p.created_at)}
                  </p>
                  <div className="text-xs">
                    <p className="mb-1 text-muted-foreground">Pre-entrevista</p>
                    <PreEntrevistaHistorial pre={p.pre_entrevistas} />
                  </div>
                  <Link
                    href={`/admin/postulaciones/${p.id}`}
                    className="btn-secundario inline-flex items-center gap-1 whitespace-nowrap px-3 py-1.5 text-xs"
                  >
                    Ver ficha →
                  </Link>
                </div>
              );
            })}
          </div>

          <Paginacion
            className="mt-4"
            ruta={ruta}
            searchParams={searchParams}
            pagina={resultado.pagina}
            total={resultado.total}
            tamano={TAMANO_HISTORIAL}
            parametro="pagina_postulaciones"
            ancla={ancla}
          />
        </>
      )}
    </div>
  );
}

/**
 * Pre-entrevista de una postulación (044/045). Esta pantalla es solo de la
 * oficina, así que muestra también la nota interna.
 */
function PreEntrevistaHistorial({ pre }: { pre: PostulacionHistorial["pre_entrevistas"] }) {
  if (!pre || !esEstadoPreEntrevista(pre.estado)) {
    return <span className="text-xs text-muted-foreground">Sin pre-entrevista</span>;
  }
  return (
    <div className="space-y-1 text-xs">
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 font-medium",
          PRE_ENTREVISTA_STYLE[pre.estado],
        )}
      >
        {PRE_ENTREVISTA_LABEL[pre.estado]}
      </span>
      <p className="text-foreground">{formatFechaHoraCorta(pre.fecha_hora)}</p>
      <p className="break-words text-muted-foreground">{pre.lugar}</p>
      {pre.nota_oficina && (
        <p className="whitespace-pre-line break-words text-muted-foreground">
          Nota interna: {pre.nota_oficina}
        </p>
      )}
    </div>
  );
}
