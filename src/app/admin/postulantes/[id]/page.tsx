import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import type { QueryData } from "@supabase/supabase-js";
import {
  BookOpen,
  Briefcase,
  CalendarClock,
  ChartColumn,
  ChevronRight,
  ClipboardList,
  Clock,
  IdCard,
  Mail,
  MailCheck,
  ThumbsDown,
  X,
  type LucideIcon,
} from "lucide-react";
import { logError } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Badge, BadgeBanda, type TonoBadge } from "@/components/ui/badge";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { DatosCandidato } from "@/components/admin/datos-candidato";
import { CvsDelPostulante } from "@/components/admin/cv-candidato";
import { ProcedenciaCandidato } from "@/components/admin/procedencia-candidato";
import { obtenerCandidato } from "@/lib/admin/candidato";
import {
  BADGE_ESTADO_VISIBLE,
  FILETE_ESTADO_VISIBLE,
  estadoVisiblePostulacion,
} from "@/lib/admin/postulacion-estados";
import { AsignarCursoDialog } from "../asignar-curso-dialog";
import { EstadoCursoBadge } from "@/components/cursos/estado-curso-badge";
import { formatFecha, formatFechaCorta, formatFechaHoraCorta } from "@/lib/fechas";
import { InformacionLaboralResumen } from "@/components/postulantes/informacion-laboral-resumen";
import {
  PRE_ENTREVISTA_LABEL,
  PRE_ENTREVISTA_TONO,
  esEstadoPreEntrevista,
} from "@/lib/pre-entrevistas";
import { ModalidadYLugar } from "@/components/entrevistas/cartel-entrevista";
import {
  consultarPagina,
  leerPagina,
  type ParamsUrl,
  type ResultadoPagina,
} from "@/lib/paginacion";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { MotivoRechazo } from "@/components/ui/linea-de-tiempo";
import {
  CLASE_ACCION_FILA,
  FilaTabla,
  Tabla as TablaListado,
} from "@/components/ui/tabla";
import { TituloBloque } from "@/components/ui/titulo-bloque";
import {
  ESTADO_CURSO_LABEL,
  ESTADO_CURSO_TONO,
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
import { BotonVolver } from "@/components/ui/boton-volver";
import {
  TONO_INVITACION,
  esEstadoInvitacion,
  ofertaAceptaInvitaciones,
  volverALaBusqueda,
  type EstadoInvitacion,
} from "@/lib/invitaciones";
import { esUuid } from "@/lib/validaciones";
import { InvitarBoton } from "@/components/admin/invitar-boton";
import { estadoVencimiento } from "@/lib/ofertas-vencimiento";
import { inicialesDePersona } from "@/lib/iniciales";
import { textoChipLocalidad, type NivelPrioridad } from "@/lib/procedencia";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Ficha postulante | Panel municipal | Portal de Empleo Funes",
};

const TAMANO_HISTORIAL = 10;

const TARJETA = "tarjeta tarjeta-panel min-w-0";

// Punto del BadgeBanda de la localidad: el mismo color que ChipLocalidad.
const TONO_NIVEL: Record<NivelPrioridad, TonoBadge> = {
  1: "success",
  2: "warning",
  3: "neutral",
};

function consultaPostulaciones(supabase: ClienteSupabase, postulanteId: string) {
  return supabase
    .from("postulaciones")
    .select(
      "id, estado, created_at, ofertas!oferta_id(id, titulo, empresa_nombre), derivaciones(estado_empresa), pre_entrevistas(estado, fecha_hora, modalidad, lugar, link, nota_oficina), cv:archivos_usuario!cv_archivo_id(nombre_original, creado_en, eliminado_en)",
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

// Invitaciones de la oficina a todas las ofertas (migration_056).
function consultaInvitaciones(supabase: ClienteSupabase, postulanteId: string) {
  return supabase
    .from("invitaciones_oferta")
    .select(
      "id, estado, creada_en, respondida_en, vencida_en, motivo_rechazo, postulacion_id, ofertas!oferta_id(id, titulo, empresa_nombre, estado, vence_en), invitador:usuarios!invitado_por(nombre, apellido)",
      { count: "exact" }
    )
    .eq("postulante_id", postulanteId);
}

type PostulacionHistorial = QueryData<ReturnType<typeof consultaPostulaciones>>[number];
type InvitacionHistorial = QueryData<ReturnType<typeof consultaInvitaciones>>[number];
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
    pagina_invitaciones?: string;
    /** Oferta desde cuya búsqueda se entró ("Ver ficha"): habilita invitar. */
    oferta?: string;
  }>;
}) {
  await requerirRolPagina("municipalidad");
  const [{ id: postulanteId }, sp] = await Promise.all([params, searchParams]);
  const rawVolver = sp.volver;
  const paginaCursos = leerPagina(sp.pagina_cursos);
  const paginaPostulaciones = leerPagina(sp.pagina_postulaciones);
  const paginaRechazos = leerPagina(sp.pagina_rechazos);
  const paginaInvitaciones = leerPagina(sp.pagina_invitaciones);
  const rutaFicha = `/admin/postulantes/${postulanteId}`;

  // volver solo puede apuntar a /admin/postulantes o a la búsqueda de
  // postulantes de una oferta (/admin/ofertas/<id>/candidatos, migration_056).
  // La búsqueda trae su propio volver: se valida igual que en la búsqueda.
  const volverACandidatos = volverALaBusqueda(rawVolver);
  const volverHref =
    volverACandidatos ??
    (typeof rawVolver === "string" && rawVolver.startsWith("/admin/postulantes")
      ? rawVolver
      : "/admin/postulantes");

  const supabase = await createSupabaseServerClient();
  const [
    candidato,
    postulacionesResult,
    estadoCursosResult,
    asignacionesResult,
    cursosResult,
    rechazosResult,
    cursosPendientesResult,
    invitacionesResult,
    invitacionAOferta,
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
    consultarPagina(
      paginaInvitaciones,
      (desde, hasta) =>
        consultaInvitaciones(supabase, postulanteId)
          .order("creada_en", { ascending: false })
          .order("id", { ascending: false })
          .range(desde, hasta),
      TAMANO_HISTORIAL
    ),
    invitacionDesdeOferta(supabase, sp.oferta, postulanteId),
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
  if (!invitacionesResult.ok)
    logError("admin_postulante_invitaciones", invitacionesResult.error);
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

  // "DNI … · N postulaciones · N rechazos de empresas"
  const bajada = [
    candidato.postulante.dni ? `DNI ${candidato.postulante.dni}` : null,
    postulacionesResult.ok
      ? `${postulacionesResult.total} ${postulacionesResult.total === 1 ? "postulación" : "postulaciones"}`
      : null,
    `${rechazosTotales} ${rechazosTotales === 1 ? "rechazo de empresas" : "rechazos de empresas"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const hayAcciones = cantidadCursosPendientes > 0 || puedeRecibirCurso || invitacionAOferta;

  return (
    <section className="flex w-full flex-col gap-6">
      <BotonVolver href={volverHref} destacado />

      <EncabezadoPagina
        banda
        botonesBlancos
        className="-mt-2"
        avatar={
          <AvatarAjustado
            src={candidato.avatar.url}
            alt={nombreCompleto}
            ajuste={candidato.avatar.ajuste}
            iniciales={inicialesDePersona(candidato.usuario.nombre, candidato.usuario.apellido)}
            size="banda"
            claro
          />
        }
        titulo={nombreCompleto}
        junto={
          <>
            <BadgeBanda tono={TONO_NIVEL[candidato.nivel]}>
              {textoChipLocalidad(candidato.nivel, candidato.postulante.localidad)}
            </BadgeBanda>
            {necesitaCurso ? (
              <BadgeBanda tono="warning">
                Necesita curso · {textoRechazos(rechazosVentana)} en {VENTANA_RECHAZOS_DIAS} días
              </BadgeBanda>
            ) : (
              asignacionActivaEstado && (
                <BadgeBanda tono={ESTADO_CURSO_TONO[asignacionActivaEstado]}>
                  Curso: {ESTADO_CURSO_LABEL[asignacionActivaEstado]}
                </BadgeBanda>
              )
            )}
          </>
        }
        bajada={bajada}
        acciones={
          hayAcciones ? (
            <>
              {invitacionAOferta && (
                <InvitarBoton
                  ofertaId={invitacionAOferta.ofertaId}
                  ofertaTitulo={invitacionAOferta.ofertaTitulo}
                  postulanteId={postulanteId}
                  nombre={nombreCompleto}
                  rechazoAnterior={invitacionAOferta.rechazoAnterior}
                />
              )}
              {cantidadCursosPendientes > 0 && (
                <a href="#rechazos-y-cursos" className="btn-secundario">
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
            </>
          ) : undefined
        }
      />

      {/* Bloques de a dos (uno en el celular) con la misma altura por fila. */}
      <div className="@container">
        <div className="grid grid-cols-1 items-stretch gap-4 @4xl:grid-cols-2 @4xl:gap-5">
          <section aria-labelledby="titulo-datos" className={TARJETA}>
            <TituloBloque id="titulo-datos" titulo="Datos del candidato" icono={IdCard} />
            <div className="mt-5">
              <DatosCandidato
                email={candidato.email}
                dni={candidato.postulante.dni}
                domicilio={candidato.postulante.domicilio}
                telefono={candidato.usuario.telefono}
                categorias={candidato.categorias}
              />
            </div>
          </section>

          <ProcedenciaCandidato
            localidad={candidato.postulante.localidad}
            nivel={candidato.nivel}
            comprobante={candidato.comprobante}
          />

          <CvsDelPostulante cvs={candidato.cvs} />

          <InformacionLaboralResumen
            info={candidato.postulante}
            estiloOficina
            encabezado={
              <TituloBloque id="titulo-informacion-laboral" titulo="Información laboral" icono={Briefcase} />
            }
            className="tarjeta min-w-0 rounded-[var(--radius-indicador)] px-4 py-[18px] sm:px-6 sm:py-[22px]"
          />
        </div>
      </div>

      {/* Rechazos y cursos */}
      <section
        id="rechazos-y-cursos"
        aria-labelledby="titulo-rechazos-cursos"
        className={cn(TARJETA, "@container scroll-mt-20")}
      >
        <TituloBloque id="titulo-rechazos-cursos" titulo="Rechazos y cursos" icono={ChartColumn} />

        <dl className="mt-5 grid grid-cols-1 gap-3 @2xl:grid-cols-3">
          <Numero
            filete="border-l-primary"
            etiqueta={`Rechazos en los últimos ${VENTANA_RECHAZOS_DIAS} días`}
            valor={rechazosVentana}
            claseValor={rechazosVentana >= UMBRAL_RECHAZOS_CURSO ? "text-warning-text" : undefined}
            contexto={
              estadoCursos?.ultimo_completado_en
                ? `Desde el último curso completado (${formatFechaCorta(estadoCursos.ultimo_completado_en)})`
                : `Con ${UMBRAL_RECHAZOS_CURSO} o más se le puede asignar un curso`
            }
          />
          <Numero
            filete="border-l-neutral"
            etiqueta="Rechazos totales"
            valor={rechazosTotales}
            contexto="De empresas, en todas sus postulaciones"
          />
          <Numero
            filete="border-l-info"
            etiqueta="Cursos"
            valor={asignaciones.ok ? asignaciones.total : "—"}
            contexto={
              <>
                {necesitaCurso ? (
                  <span className="font-bold text-warning-text">Necesita curso</span>
                ) : cantidadCursosPendientes > 0 ? (
                  textoCursosPendientes(cantidadCursosPendientes)
                ) : (
                  "Sin curso pendiente"
                )}
                {cantidadCursosPendientes > 0 && puedeRecibirCurso && (
                  <span className="mt-1 block text-warning-text">
                    Tiene {UMBRAL_RECHAZOS_CURSO} o más rechazos recientes: se le puede asignar otro curso.
                  </span>
                )}
              </>
            }
          />
        </dl>

        <div className="mt-6 grid grid-cols-1 gap-5 @4xl:grid-cols-2">
          <HistorialRechazos
            resultado={rechazosResult}
            ultimoCompletadoEn={estadoCursos?.ultimo_completado_en ?? null}
            ruta={rutaFicha}
            searchParams={sp}
          />
          <HistorialCursos resultado={asignaciones} ruta={rutaFicha} searchParams={sp} />
        </div>
      </section>

      <HistorialPostulaciones resultado={postulacionesResult} ruta={rutaFicha} searchParams={sp} />

      <HistorialInvitaciones resultado={invitacionesResult} ruta={rutaFicha} searchParams={sp} />
    </section>
  );
}

/** Un número de "Rechazos y cursos": fondo gris, filete de 4 px, etiqueta, número de 34 px y contexto. */
function Numero({
  filete,
  etiqueta,
  valor,
  claseValor,
  contexto,
}: {
  filete: string;
  etiqueta: string;
  valor: number | string;
  claseValor?: string;
  contexto: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col rounded-[14px] border-l-4 bg-numero-fondo px-4 py-3.5", filete)}>
      <dt className="text-[13px] leading-[1.4] font-bold text-neutral">{etiqueta}</dt>
      <dd className={cn("mt-1.5 text-[34px] leading-none font-extrabold text-heading tabular-nums", claseValor)}>
        {valor}
      </dd>
      <dd className="mt-2 text-[13px] leading-snug text-muted-foreground">{contexto}</dd>
    </div>
  );
}

type InvitacionAOferta = {
  ofertaId: string;
  ofertaTitulo: string;
  rechazoAnterior: { fecha: string | null; motivo: string | null } | null;
};

/**
 * "Invitar a esta oferta" en la ficha cuando se entra desde la búsqueda de
 * una oferta (?oferta=<id>). El parámetro no se cree: se vuelven a comprobar
 * las mismas condiciones que en la lista (oferta activa y vigente, cuenta
 * activa, sin postulación vigente ni invitación pendiente). Ante cualquier
 * duda no hay botón; invitar_a_oferta igual vuelve a validar todo.
 */
async function invitacionDesdeOferta(
  supabase: ClienteSupabase,
  ofertaParam: string | undefined,
  postulanteId: string,
): Promise<InvitacionAOferta | null> {
  if (!esUuid(ofertaParam) || !esUuid(postulanteId)) return null;
  const ofertaId = ofertaParam;

  const [ofertaRes, ultimaRes, postulacionRes, cuentaRes] = await Promise.all([
    supabase
      .from("ofertas")
      .select("id, titulo, estado, vence_en, eliminada_en")
      .eq("id", ofertaId)
      .maybeSingle(),
    supabase
      .from("invitaciones_oferta")
      .select("estado, respondida_en, motivo_rechazo")
      .eq("oferta_id", ofertaId)
      .eq("postulante_id", postulanteId)
      .order("creada_en", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("postulaciones")
      .select("id")
      .eq("oferta_id", ofertaId)
      .eq("postulante_id", postulanteId)
      .is("retirada_en", null)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("postulantes")
      .select("usuarios!usuario_id(activo)")
      .eq("id", postulanteId)
      .maybeSingle(),
  ]);

  const error = ofertaRes.error ?? ultimaRes.error ?? postulacionRes.error ?? cuentaRes.error;
  if (error) {
    logError("admin_postulante_invitar_desde_oferta", error, { ofertaId, postulanteId });
    return null;
  }

  const oferta = ofertaRes.data;
  if (!oferta || oferta.eliminada_en || !ofertaAceptaInvitaciones(oferta.estado, oferta.vence_en)) {
    return null;
  }
  if (cuentaRes.data?.usuarios?.activo !== true) return null;
  if (postulacionRes.data) return null;

  const ultima = ultimaRes.data;
  if (ultima?.estado === "pendiente") return null;

  return {
    ofertaId: oferta.id,
    ofertaTitulo: oferta.titulo,
    rechazoAnterior:
      ultima?.estado === "rechazada"
        ? { fecha: ultima.respondida_en, motivo: ultima.motivo_rechazo }
        : null,
  };
}

type PropsHistorial<T> = {
  resultado: ResultadoPagina<T>;
  ruta: string;
  searchParams: ParamsUrl;
};

const TITULO_LISTA = "scroll-mt-20 text-[17px] font-extrabold text-heading";
const LISTA = "divide-y divide-tabla-borde rounded-[14px] border border-border";

/** Ícono de una fila de lista: cuadrado de 36 px con fondo suave del color. */
function IconoFila({ icono: Icono, clase }: { icono: LucideIcon; clase: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("grid size-9 shrink-0 place-items-center rounded-[10px] [&_svg]:size-[18px]", clase)}
    >
      <Icono />
    </span>
  );
}

function HistorialRechazos({
  resultado,
  ultimoCompletadoEn,
  ruta,
  searchParams,
}: PropsHistorial<RechazoRow> & { ultimoCompletadoEn: string | null }) {
  const ancla = "historial-rechazos";
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h3 id={ancla} className={TITULO_LISTA}>
        Rechazos de empresas{resultado.ok && ` (${resultado.total})`}
      </h3>
      {!resultado.ok ? (
        <ErrorListado mensaje="No pudimos cargar los rechazos." />
      ) : resultado.filas.length === 0 ? (
        <EstadoVacio
          tipo="sin-registros"
          icono={ThumbsDown}
          titulo="Ninguna empresa rechazó a este postulante."
        />
      ) : (
        <>
          <ul className={LISTA}>
            {resultado.filas.map((r) => {
              const fecha = r.fecha_respuesta ?? r.updated_at;
              const oferta = r.postulaciones?.ofertas ?? null;
              return (
                <li key={r.id} className="flex gap-3 px-4 py-3.5">
                  <IconoFila icono={X} clase="bg-danger/10 text-danger" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <p className="min-w-0 text-[15px] font-bold break-words text-heading">
                        {oferta?.titulo ?? "Oferta eliminada"}
                      </p>
                      {rechazoCuentaParaCurso(fecha, ultimoCompletadoEn) && (
                        <Badge tono="warning">Cuenta para el curso</Badge>
                      )}
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                      {oferta?.empresa_nombre ?? "—"} · {formatFechaCorta(fecha)}
                    </p>
                    {r.nota_empresa?.trim() ? (
                      <MotivoRechazo>{r.nota_empresa}</MotivoRechazo>
                    ) : (
                      <p className="mt-1.5 text-[13px] text-muted-foreground">Sin motivo informado</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <Paginacion
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
    </div>
  );
}

function HistorialCursos({ resultado, ruta, searchParams }: PropsHistorial<AsignacionRow>) {
  const ancla = "historial-cursos";
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h3 id={ancla} className={TITULO_LISTA}>
        Historial de cursos{resultado.ok && ` (${resultado.total})`}
      </h3>
      {!resultado.ok ? (
        <ErrorListado mensaje="No pudimos cargar el historial de cursos." />
      ) : resultado.filas.length === 0 ? (
        <EstadoVacio
          tipo="sin-registros"
          icono={BookOpen}
          titulo="Todavía no se asignó ningún curso a este postulante."
        />
      ) : (
        <>
          <ul className={LISTA}>
            {resultado.filas.map((a) => {
              const curso = a.cursos;
              return (
                <li key={a.id} className="flex gap-3 px-4 py-3.5">
                  <IconoFila icono={BookOpen} clase="bg-primary/10 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {curso ? (
                        <Link
                          href={`/admin/cursos/${curso.id}`}
                          className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] text-[15px] font-bold break-words text-primary underline-offset-2 outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)] sm:min-h-0"
                        >
                          {curso.nombre}
                        </Link>
                      ) : (
                        <span className="text-[15px] font-bold text-heading">Curso eliminado</span>
                      )}
                      <EstadoCursoBadge estado={a.estado} />
                    </div>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      Asignado el {formatFechaCorta(a.created_at)}
                      {a.iniciado_en && ` · Empezado el ${formatFechaCorta(a.iniciado_en)}`}
                      {a.completado_en && ` · Completado el ${formatFechaCorta(a.completado_en)}`}
                      {a.estado === "abandonado" &&
                        a.abandonado_en &&
                        ` · Abandonado el ${formatFechaCorta(a.abandonado_en)}`}
                    </p>
                    {a.nota && (
                      <p className="mt-1 text-[13px] break-words whitespace-pre-line text-muted-foreground-strong">
                        Nota interna: {a.nota}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <Paginacion
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
    </div>
  );
}

// Oferta y empresa | Fecha | Estado | CV | Pre-entrevista | acción.
const COLUMNAS_POSTULACIONES =
  "minmax(0,1.6fr) minmax(max-content,.7fr) minmax(0,1.1fr) minmax(0,1.2fr) minmax(0,1.2fr) minmax(max-content,.6fr)";

function HistorialPostulaciones({
  resultado,
  ruta,
  searchParams,
}: PropsHistorial<PostulacionHistorial>) {
  const ancla = "historial-postulaciones";
  return (
    <section id={ancla} aria-labelledby="titulo-postulaciones" className="flex scroll-mt-20 flex-col gap-4">
      <TituloBloque
        id="titulo-postulaciones"
        titulo={`Historial de postulaciones${resultado.ok ? ` (${resultado.total})` : ""}`}
        icono={ClipboardList}
      />

      {!resultado.ok ? (
        <ErrorListado mensaje="No pudimos cargar el historial de postulaciones." />
      ) : resultado.filas.length === 0 ? (
        <EstadoVacio
          tipo="sin-registros"
          icono={Briefcase}
          titulo="Todavía no se postuló a ninguna oferta."
        />
      ) : (
        <>
          <TablaListado
            columnas={COLUMNAS_POSTULACIONES}
            etiqueta="Historial de postulaciones"
            semantica="tabla"
            encabezados={[
              "Oferta y empresa",
              "Fecha",
              "Estado",
              "CV",
              "Pre-entrevista",
              <span key="a" className="sr-only">
                Acciones
              </span>,
            ]}
          >
            {resultado.filas.map((p) => {
              const visible = estadoVisiblePostulacion(p.estado, p.derivaciones?.estado_empresa);
              const badge = BADGE_ESTADO_VISIBLE[visible];
              const titulo = p.ofertas?.titulo ?? "Oferta eliminada";
              return (
                <FilaTabla key={p.id} semantica="tabla" filete={FILETE_ESTADO_VISIBLE[visible]}>
                  <div role="cell" className="min-w-0 break-words">
                    <span className="block text-[15px] leading-snug font-extrabold text-heading">
                      {titulo}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {p.ofertas?.empresa_nombre ?? "—"}
                    </span>
                  </div>
                  <div role="cell" className="text-sm whitespace-nowrap tabular-nums @4xl:text-[15px]">
                    <span className="text-muted-foreground @4xl:sr-only">Fecha: </span>
                    {formatFechaCorta(p.created_at)}
                  </div>
                  <div role="cell" className="order-first min-w-0 @4xl:order-none">
                    <Badge tono={badge.tono} estado multilinea>
                      {badge.label}
                    </Badge>
                  </div>
                  <div role="cell" className="min-w-0">
                    <p className="text-[13px] font-bold text-neutral @4xl:sr-only">CV</p>
                    <CvHistorial cv={p.cv} />
                  </div>
                  <div role="cell" className="min-w-0">
                    <p className="text-[13px] font-bold text-neutral @4xl:sr-only">Pre-entrevista</p>
                    <PreEntrevistaHistorial pre={p.pre_entrevistas} />
                  </div>
                  <div role="cell" className="@4xl:text-right">
                    <Link
                      href={`/admin/postulaciones/${p.id}`}
                      aria-label={`Ver ficha de la postulación a ${titulo}`}
                      className={`btn-secundario ${CLASE_ACCION_FILA}`}
                    >
                      Ver ficha
                    </Link>
                  </div>
                </FilaTabla>
              );
            })}
          </TablaListado>

          <Paginacion
            className="mt-1"
            ruta={ruta}
            searchParams={searchParams}
            pagina={resultado.pagina}
            total={resultado.total}
            tamano={TAMANO_HISTORIAL}
            parametro="pagina_postulaciones"
            ancla={ancla}
            variante="numeros"
            elemento={{ singular: "postulación", plural: "postulaciones" }}
          />
        </>
      )}
    </section>
  );
}

/**
 * CV elegido al postularse (migration_054). Las postulaciones anteriores no
 * lo guardan: en su ficha se muestra el CV más reciente del perfil.
 */
function CvHistorial({ cv }: { cv: PostulacionHistorial["cv"] }) {
  if (!cv) {
    return <span className="text-sm text-muted-foreground">Sin CV elegido</span>;
  }
  return (
    <div className="text-sm">
      <p className="font-semibold break-all text-foreground">{cv.nombre_original}</p>
      <p className="text-[13px] text-muted-foreground">
        Subido el {formatFechaCorta(cv.creado_en)}
        {cv.eliminado_en && " · eliminado del perfil"}
      </p>
    </div>
  );
}

/**
 * Pre-entrevista de una postulación (044/045): la coordinada, en azul con
 * CalendarClock; las demás, con su estado. Esta pantalla es solo de la
 * oficina, así que muestra también la nota interna.
 */
function PreEntrevistaHistorial({ pre }: { pre: PostulacionHistorial["pre_entrevistas"] }) {
  if (!pre || !esEstadoPreEntrevista(pre.estado)) {
    return <span className="text-sm text-muted-foreground">Sin pre-entrevista</span>;
  }
  const coordinada = pre.estado === "coordinada";
  return (
    <div className="flex flex-col items-start gap-1 text-[13px]">
      <Badge tono={PRE_ENTREVISTA_TONO[pre.estado]} icono={coordinada ? CalendarClock : undefined} estado={!coordinada}>
        {PRE_ENTREVISTA_LABEL[pre.estado]}
      </Badge>
      <p className={cn("tabular-nums", coordinada ? "font-semibold text-info" : "text-foreground")}>
        {formatFechaHoraCorta(pre.fecha_hora)}
      </p>
      <p className="break-words text-muted-foreground">
        <ModalidadYLugar datos={{ modalidad: pre.modalidad, lugar: pre.lugar, link: pre.link }} />
      </p>
      {pre.nota_oficina && (
        <p className="break-words whitespace-pre-line text-muted-foreground">
          Nota interna: {pre.nota_oficina}
        </p>
      )}
    </div>
  );
}

const ICONO_INVITACION: Record<EstadoInvitacion, { icono: LucideIcon; clase: string }> = {
  pendiente: { icono: Mail, clase: "bg-accent/22 text-invitacion-titulo" },
  aceptada: { icono: MailCheck, clase: "bg-primary/10 text-primary" },
  rechazada: { icono: X, clase: "bg-danger/10 text-danger" },
  vencida: { icono: Clock, clase: "bg-secondary text-neutral" },
};

/**
 * Invitaciones de la oficina a postularse, a todas las ofertas
 * (migration_056). Una pendiente de una oferta que ya no acepta
 * postulaciones se muestra vencida, igual que la ve el postulante.
 */
function HistorialInvitaciones({
  resultado,
  ruta,
  searchParams,
}: PropsHistorial<InvitacionHistorial>) {
  const ancla = "historial-invitaciones";
  return (
    <section id={ancla} aria-labelledby="titulo-invitaciones" className={cn(TARJETA, "scroll-mt-20")}>
      <TituloBloque
        id="titulo-invitaciones"
        titulo={`Invitaciones a ofertas${resultado.ok ? ` (${resultado.total})` : ""}`}
        icono={Mail}
      />

      {!resultado.ok ? (
        <ErrorListado className="mt-4" mensaje="No pudimos cargar las invitaciones." />
      ) : resultado.filas.length === 0 ? (
        <EstadoVacio
          tipo="sin-registros"
          className="mt-4"
          icono={Mail}
          titulo="La oficina todavía no lo invitó a ninguna oferta."
        />
      ) : (
        <>
          <ul className={cn(LISTA, "mt-5")}>
            {resultado.filas.map((inv) => {
              const ofertaAbierta =
                inv.ofertas?.estado === "activa" &&
                !estadoVencimiento(inv.ofertas.estado, inv.ofertas.vence_en).vencida;
              const guardado = esEstadoInvitacion(inv.estado) ? inv.estado : "vencida";
              const estado = guardado === "pendiente" && !ofertaAbierta ? "vencida" : guardado;
              const fecha =
                estado === "pendiente"
                  ? inv.creada_en
                  : estado === "vencida"
                    ? (inv.vencida_en ?? inv.ofertas?.vence_en ?? null)
                    : inv.respondida_en;
              const texto =
                estado === "pendiente"
                  ? `Invitado el ${formatFecha(fecha)}, sin respuesta`
                  : estado === "aceptada"
                    ? `Aceptó el ${formatFecha(fecha)}`
                    : estado === "rechazada"
                      ? `Dijo que no el ${formatFecha(fecha)}`
                      : `Invitación vencida el ${formatFecha(fecha)}`;
              return (
                <li key={inv.id} className="flex gap-3 px-4 py-3.5">
                  <IconoFila icono={ICONO_INVITACION[estado].icono} clase={ICONO_INVITACION[estado].clase} />
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold break-words text-heading">
                        {inv.ofertas ? (
                          <Link
                            href={`/admin/ofertas/${inv.ofertas.id}`}
                            className="rounded-[var(--radius-sm)] underline-offset-2 outline-none hover:text-primary hover:underline focus-visible:shadow-[var(--sombra-foco)]"
                          >
                            {inv.ofertas.titulo}
                          </Link>
                        ) : (
                          "Oferta no disponible"
                        )}
                      </p>
                      <p className="text-[13px] text-muted-foreground">
                        {inv.ofertas?.empresa_nombre ?? "—"} · Invitado el{" "}
                        {formatFechaCorta(inv.creada_en)}
                        {inv.invitador && ` por ${inv.invitador.nombre} ${inv.invitador.apellido}`}
                      </p>
                      {estado === "rechazada" && inv.motivo_rechazo && (
                        <MotivoRechazo>{inv.motivo_rechazo}</MotivoRechazo>
                      )}
                      {estado === "aceptada" && inv.postulacion_id && (
                        <Link
                          href={`/admin/postulaciones/${inv.postulacion_id}`}
                          className="inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-sm)] text-sm font-bold text-primary underline-offset-2 outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)] sm:min-h-8"
                        >
                          Ver la postulación
                          <ChevronRight aria-hidden="true" className="size-4" />
                        </Link>
                      )}
                    </div>
                    <Badge tono={TONO_INVITACION[estado]} multilinea className="sm:shrink-0">
                      {texto}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>

          <Paginacion
            className="mt-4"
            ruta={ruta}
            searchParams={searchParams}
            pagina={resultado.pagina}
            total={resultado.total}
            tamano={TAMANO_HISTORIAL}
            parametro="pagina_invitaciones"
            ancla={ancla}
          />
        </>
      )}
    </section>
  );
}
