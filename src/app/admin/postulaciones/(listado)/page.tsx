import type { Metadata } from "next";
import { ESTADOS_FILTRO, LABEL_FILTRO, COLUMNAS } from "../listado";
import { Suspense } from "react";
import Link from "next/link";
import { ESTILO_ETAPA } from "@/lib/estados-postulacion";
import Form from "next/form";
import { Calendar, CalendarClock, ClipboardList } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { limpiarBusqueda } from "@/lib/busqueda";
import {
  consultarPagina,
  hrefConParams,
  leerPagina,
  type ParamsUrl,
} from "@/lib/paginacion";
import { Buscador } from "@/components/ui/buscador";
import { Combobox } from "@/components/ui/combobox";
import { PastillaFiltro } from "@/components/ui/pastilla-filtro";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoPostulacionesAdmin } from "../esqueleto";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import {
  CLASE_ACCION_FILA,
  CeldaPersona,
  FilaTabla,
  Tabla as TablaListado,
} from "@/components/ui/tabla";
import { Badge } from "@/components/ui/badge";
import {
  BADGE_ESTADO_VISIBLE,
  FILETE_ESTADO_VISIBLE,
  estadoVisiblePostulacion,
  type EstadoVisiblePostulacion,
} from "@/lib/admin/postulacion-estados";
import {
  cantidadesPorPestana,
  filtrarContratados,
  filtrarOfertaYBusqueda,
  filtrarPestanaPostulaciones,
  ofertasDePestana,
  postulantesDeBusqueda,
  type FiltrosPostulaciones,
  type PestanaPostulaciones,
} from "@/lib/admin/postulaciones-pestanas";
import type { FilaPostulacionNoSeleccionada, Tabla } from "@/types/db";
import { formatFechaCorta, formatFechaHoraCorta } from "@/lib/fechas";
import { requerirRolPagina } from "@/lib/auth";
import { inicialesDePersona } from "@/lib/iniciales";
import { ChipLocalidad } from "@/components/postulantes/badge-procedencia";
import { BadgePorInvitacion } from "@/components/admin/badge-por-invitacion";
import { estadosDeComprobantes } from "@/lib/comprobantes";
import {
  detalleSinVerificar,
  nivelDe,
  type EstadoComprobante,
  type NivelPrioridad,
} from "@/lib/procedencia";
import { BotonVolver } from "@/components/ui/boton-volver";

export const metadata: Metadata = {
  title: "Postulaciones | Panel municipal | Portal de Empleo Funes",
};

// Qué entra en cada pestaña: src/lib/admin/postulaciones-pestanas.ts.
type EstadoFiltro = PestanaPostulaciones;

// "Primero verificados de Funes" (migration_055): ordena por
// postulantes.nivel_prioridad y después por fecha. Solo en las pestañas que
// se consultan sobre postulaciones: "Contratado" sale de derivaciones y "No
// seleccionado" de una función, y ahí no se puede ordenar por una columna del
// postulante sin cambiar esas consultas.
const ESTADOS_CON_ORDEN_PRIORIDAD: EstadoFiltro[] = [
  "pendiente",
  "derivada",
  "retirada_postulante",
];

type Procedencia = {
  nivel: NivelPrioridad;
  localidad: string | null;
  comprobante: EstadoComprobante | null;
};

type PostulanteEmbebido =
  | (Pick<Tabla<"postulantes">, "id" | "usuario_id" | "dni"> & {
      usuarios: Pick<Tabla<"usuarios">, "nombre" | "apellido"> | null;
    })
  | null;

type OfertaEmbebida = Pick<Tabla<"ofertas">, "id" | "titulo" | "empresa_nombre"> | null;

type PreEntrevistaEmbebida = Pick<Tabla<"pre_entrevistas">, "estado" | "fecha_hora"> | null;

/** Fila común a las cinco pestañas. */
type Fila = {
  postulacionId: string;
  postulante: PostulanteEmbebido;
  oferta: OfertaEmbebida;
  fecha: string;
  visible: EstadoVisiblePostulacion;
  /** Solo en Pendientes (migration_044). */
  preEntrevista?: PreEntrevistaEmbebida;
};

const RUTA = "/admin/postulaciones";

export default async function PostulacionesPage({
  searchParams,
}: {
  searchParams: Promise<{
    estado?: string;
    oferta_id?: string;
    q?: string;
    orden?: string;
    pagina?: string;
  }>;
}) {
  await requerirRolPagina("municipalidad");
  const sp = await searchParams;

  const estado: EstadoFiltro = ESTADOS_FILTRO.find((e) => e === sp.estado) ?? "pendiente";

  const ofertaId = (sp.oferta_id ?? "").trim();
  const q = limpiarBusqueda(sp.q);
  const pagina = leerPagina(sp.pagina);
  const ordenDisponible = ESTADOS_CON_ORDEN_PRIORIDAD.includes(estado);
  const primeroFunes = ordenDisponible && sp.orden === "prioridad";

  const supabase = await createSupabaseServerClient();

  // La búsqueda se resuelve una vez: la usan las cantidades y la lista.
  const busqueda = await postulantesDeBusqueda(supabase, q);
  const errorBusqueda = busqueda.ok
    ? null
    : logError("admin_postulaciones_busqueda", busqueda.error);
  const filtrosConsulta: FiltrosPostulaciones = {
    ofertaId,
    postulanteIds: busqueda.ok ? busqueda.valor : null,
  };

  // Cada pastilla cuenta con la oferta y la búsqueda elegidas y las mismas
  // condiciones que la lista (postulaciones-pestanas.ts). Si un conteo falla,
  // esa pastilla va sin número.
  const [cantidades, resOfertas] = await Promise.all([
    errorBusqueda ? Promise.resolve(null) : cantidadesPorPestana(supabase, filtrosConsulta),
    ofertasDePestana(supabase, estado, ofertaId),
  ]);
  if (cantidades && Object.values(cantidades).some((c) => c === null)) {
    logError("admin_postulaciones_cantidades", { message: "Falló el conteo de una pestaña" });
  }
  if (!resOfertas.ok) logError("admin_postulaciones_ofertas_filtro", resOfertas.error, { estado });
  const ofertasDisponibles = resOfertas.ok ? resOfertas.valor : [];
  const ofertaSinPostulaciones =
    resOfertas.ok &&
    ofertaId !== "" &&
    (ofertasDisponibles.find((o) => o.id === ofertaId)?.cantidad ?? 0) === 0;

  const filtros: FiltrosListado = {
    estado,
    filtros: filtrosConsulta,
    primeroFunes,
    pagina,
    ofertaSinPostulaciones,
    errorBusqueda,
    conFiltros: Boolean(q || ofertaId),
  };
  // La clave cambia con cada filtro o página: el Suspense se vuelve a montar
  // y muestra el esqueleto mientras llega el resultado nuevo.
  const clave = JSON.stringify({ estado, ofertaId, q, primeroFunes, pagina });

  return (
    <section className="flex flex-col gap-6">
      <BotonVolver href="/admin" destacado />
      <EncabezadoPagina
        banda
        className="-mt-2"
        botonesBlancos
        titulo="Postulaciones"
        bajada="Revisá cada postulación antes de derivarla a la empresa."
      />

      <nav aria-label="Estado de las postulaciones" className="min-w-0">
        <div className="sin-barra-scroll -mx-4 -my-1 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {ESTADOS_FILTRO.map((tab) => (
            <PastillaFiltro
              key={tab}
              href={hrefConParams(RUTA, {}, {
                estado: tab,
                oferta_id: ofertaId || null,
                q: sp.q ?? null,
                orden: sp.orden === "prioridad" ? "prioridad" : null,
              })}
              activa={tab === estado}
              cantidad={cantidades?.[tab] ?? undefined}
            >
              {LABEL_FILTRO[tab]}
            </PastillaFiltro>
          ))}
        </div>
      </nav>

      <div className="flex flex-col gap-3">
        {/* Buscador, Oferta y Orden en una fila (1.4fr / 1fr / 1fr), los tres
            de 48 px con el label arriba; uno debajo del otro por debajo de md. */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-end">
          <Buscador
            etiquetaVisible
            etiqueta="Buscar"
            className="min-w-0"
            inputClassName="rounded-xl"
            placeholder="Buscar por nombre, apellido o DNI"
          />

          {/* Oferta y Orden se aplican solos al elegir (enviarAlCambiar). Form
              navega sin recargar la página, así el foco vuelve al filtro; sin
              JavaScript es un formulario GET común y aparece el botón. El form
              es "contents": sus campos son celdas de la grilla. */}
          <Form action={RUTA} scroll={false} className="contents">
            <input type="hidden" name="estado" value={estado} />
            {sp.q && <input type="hidden" name="q" value={sp.q} />}
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="filtro-oferta" className="etiqueta-campo">
                Oferta
              </label>
              {/* key: las opciones cambian con la pestaña y valorInicial solo
                  se aplica al montar. */}
              <Combobox
                id="filtro-oferta"
                key={`${estado}-${ofertaId}`}
                name="oferta_id"
                valorInicial={ofertaId}
                opcionVacia="Todas las ofertas"
                opciones={ofertasDisponibles.map((o) => ({
                  id: o.id,
                  nombre: `${o.empresaNombre ? `${o.titulo} — ${o.empresaNombre}` : o.titulo} (${o.cantidad})`,
                }))}
                placeholderBusqueda="Buscar oferta"
                etiquetaBusqueda="Buscar oferta"
                vacioTexto="No hay ofertas con ese nombre"
                triggerClassName="campo w-full cursor-pointer"
                enviarAlCambiar
              />
            </div>
            {ordenDisponible && (
              <div className="flex min-w-0 flex-col gap-1.5">
                <label htmlFor="filtro-orden" className="etiqueta-campo">
                  Orden
                </label>
                <Combobox
                  id="filtro-orden"
                  key={`orden-${primeroFunes}`}
                  name="orden"
                  valorInicial={primeroFunes ? "prioridad" : ""}
                  opcionVacia="Más recientes primero"
                  opciones={[{ id: "prioridad", nombre: "Primero verificados de Funes" }]}
                  triggerClassName="campo w-full cursor-pointer"
                  enviarAlCambiar
                />
              </div>
            )}
            <noscript>
              <button type="submit" className="btn-neutro min-h-12">
                Filtrar
              </button>
            </noscript>
          </Form>
        </div>

        {(q || ofertaId || primeroFunes) && (
          <Link
            href={hrefConParams(RUTA, {}, { estado })}
            className="inline-flex min-h-11 w-fit items-center rounded-[var(--radius-sm)] px-1 text-[15px] font-semibold text-primary underline-offset-2 outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]"
          >
            Limpiar filtros
          </Link>
        )}
      </div>

      <Suspense key={clave} fallback={<EsqueletoPostulacionesAdmin etiquetaFecha={ENCABEZADO_FECHA[estado]} />}>
        <ListadoPostulaciones datos={cargarListado(filtros)} estado={estado} searchParams={sp} />
      </Suspense>
    </section>
  );
}

const TEXTO_VACIO: Record<EstadoFiltro, string> = {
  pendiente: "No hay postulaciones pendientes de revisión en este momento.",
  derivada: "No hay postulaciones derivadas esperando el resultado de la empresa.",
  contratado: "Todavía ninguna empresa marcó a un postulante como contratado.",
  rechazada_municipalidad: "No hay postulaciones no seleccionadas en este momento.",
  retirada_postulante: "Ningún postulante retiró una postulación.",
};

type FiltrosListado = {
  estado: EstadoFiltro;
  filtros: FiltrosPostulaciones;
  primeroFunes: boolean;
  pagina: number;
  /** La oferta de la URL no tiene postulaciones en esta pestaña. */
  ofertaSinPostulaciones: boolean;
  /** Código del error si falló la búsqueda de postulantes. */
  errorBusqueda: string | null;
  conFiltros: boolean;
};

type Avatar = { url: string; ajuste: { x: number; y: number; zoom: number } };

type DatosListado =
  | { tipo: "error"; refError: string }
  | { tipo: "oferta-sin-postulaciones" }
  | { tipo: "vacio"; conFiltros: boolean }
  | {
      tipo: "ok";
      filas: Fila[];
      pagina: number;
      total: number;
      procedenciaMap: Map<string, Procedencia>;
      porInvitacion: Set<string>;
      avatarMap: Map<string, Avatar>;
    };

async function cargarListado({
  estado,
  filtros,
  primeroFunes,
  pagina,
  ofertaSinPostulaciones,
  errorBusqueda,
  conFiltros,
}: FiltrosListado): Promise<DatosListado> {
  if (errorBusqueda) return { tipo: "error", refError: errorBusqueda };
  if (ofertaSinPostulaciones) return { tipo: "oferta-sin-postulaciones" };

  const supabase = await createSupabaseServerClient();

  let filas: Fila[];
  let paginaActual: number;
  let total: number;

  if (estado === "contratado") {
    const resultado = await consultarPagina(pagina, (desde, hasta) =>
      filtrarOfertaYBusqueda(
        filtrarContratados(
          supabase.from("derivaciones").select(
            `
            id,
            fecha_respuesta,
            updated_at,
            postulaciones!inner(
              id,
              postulante_id,
              oferta_id,
              postulantes!postulante_id(
                id,
                usuario_id,
                dni,
                usuarios!usuario_id(nombre, apellido)
              ),
              ofertas!oferta_id(id, titulo, empresa_nombre)
            )
          `,
            { count: "exact" }
          )
        ),
        "contratado",
        filtros
      )
        // fecha_respuesta es la fecha de contratación (la fija el trigger de
        // derivaciones); updated_at cubre filas viejas que no la tengan.
        .order("fecha_respuesta", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false })
        .order("id", { ascending: false })
        .range(desde, hasta)
    );

    if (!resultado.ok) {
      return { tipo: "error", refError: logError("admin_postulaciones_contratados", resultado.error) };
    }

    filas = resultado.filas.map((d) => ({
      postulacionId: d.postulaciones.id,
      postulante: d.postulaciones.postulantes,
      oferta: d.postulaciones.ofertas,
      fecha: d.fecha_respuesta ?? d.updated_at,
      visible: "contratado",
    }));
    paginaActual = resultado.pagina;
    total = resultado.total;
  } else if (estado === "rechazada_municipalidad") {
    const resultado = await consultarPagina(pagina, async (desde, hasta) => {
      const respuesta = await filtrarOfertaYBusqueda(
        supabase.rpc("postulaciones_no_seleccionadas", undefined, { count: "exact" }),
        "rechazada_municipalidad",
        filtros
      )
        .order("fecha_rechazo", { ascending: false })
        .order("postulacion_id", { ascending: false })
        .range(desde, hasta);
      const data: FilaPostulacionNoSeleccionada[] | null = respuesta.data;
      return { data, count: respuesta.count, error: respuesta.error };
    });

    if (!resultado.ok) {
      return {
        tipo: "error",
        refError: logError("admin_postulaciones_no_seleccionadas", resultado.error),
      };
    }

    filas = resultado.filas.map((r) => ({
      postulacionId: r.postulacion_id,
      postulante: r.usuario_id
        ? {
            id: r.postulante_id,
            usuario_id: r.usuario_id,
            dni: r.dni,
            usuarios:
              r.nombre !== null && r.apellido !== null
                ? { nombre: r.nombre, apellido: r.apellido }
                : null,
          }
        : null,
      oferta: {
        id: r.oferta_id,
        titulo: r.oferta_titulo,
        empresa_nombre: r.empresa_nombre ?? "",
      },
      fecha: r.fecha_rechazo,
      visible:
        r.rechazado_por === "empresa" ? "no_seleccionado_empresa" : "no_seleccionado_oficina",
    }));
    paginaActual = resultado.pagina;
    total = resultado.total;
  } else {
    const resultado = await consultarPagina(pagina, (desde, hasta) => {
      const columnas = `
        id,
        estado,
        created_at,
        postulante_id,
        postulantes!postulante_id(
          id,
          usuario_id,
          dni,
          nivel_prioridad,
          usuarios!usuario_id(nombre, apellido)
        ),
        retirada_en,
        ofertas!oferta_id(id, titulo, empresa_nombre),
        pre_entrevistas(estado, fecha_hora)
      `;

      // "Derivadas" se filtra por el estado de la derivación (relación 1 a 1).
      let query = filtrarOfertaYBusqueda(
        filtrarPestanaPostulaciones(
          supabase
            .from("postulaciones")
            .select(
              estado === "derivada"
                ? `${columnas}, derivaciones!inner(estado_empresa)`
                : `${columnas}, derivaciones(estado_empresa)`,
              { count: "exact" }
            ),
          estado
        ),
        estado,
        filtros
      );

      // Nivel 1, 2, 3 y dentro de cada nivel el orden de siempre. El id
      // desempata, así cada página es estable.
      if (primeroFunes) {
        query = query.order("postulantes(nivel_prioridad)", { ascending: true });
      }
      if (estado === "retirada_postulante") {
        query = query.order("retirada_en", { ascending: false, nullsFirst: false });
      }

      return query
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(desde, hasta);
    });

    if (!resultado.ok) {
      return {
        tipo: "error",
        refError: logError("admin_postulaciones_listado", resultado.error, { estado }),
      };
    }

    filas = resultado.filas.map((r) => ({
      postulacionId: r.id,
      postulante: r.postulantes,
      oferta: r.ofertas,
      fecha: estado === "retirada_postulante" ? (r.retirada_en ?? r.created_at) : r.created_at,
      visible: estadoVisiblePostulacion(r.estado, r.derivaciones?.estado_empresa),
      preEntrevista: estado === "pendiente" ? r.pre_entrevistas : undefined,
    }));
    paginaActual = resultado.pagina;
    total = resultado.total;
  }

  if (filas.length === 0) return { tipo: "vacio", conFiltros };

  // Avatares en batch
  const usuarioIds = filas
    .map((f) => f.postulante?.usuario_id)
    .filter((id): id is string => Boolean(id));

  // Procedencia de cada candidato (chip; solo la oficina la ve)
  const postulanteIds = filas
    .map((f) => f.postulante?.id)
    .filter((id): id is string => Boolean(id));
  const [procedenciaRes, comprobantes, porInvitacionRes] = await Promise.all([
    postulanteIds.length > 0
      ? supabase
          .from("postulantes")
          .select("id, localidad, nivel_prioridad")
          .in("id", postulanteIds)
      : Promise.resolve({ data: [], error: null }),
    estadosDeComprobantes(supabase, usuarioIds),
    // Las que vinieron de una invitación (migration_056), en una sola consulta
    // para las cinco pestañas.
    supabase
      .from("postulaciones")
      .select("id")
      .in("id", filas.map((f) => f.postulacionId))
      .eq("origen", "invitacion"),
  ]);
  if (procedenciaRes.error) logError("admin_postulaciones_procedencia", procedenciaRes.error);
  if (porInvitacionRes.error) logError("admin_postulaciones_origen", porInvitacionRes.error);
  const porInvitacion = new Set((porInvitacionRes.data ?? []).map((p) => p.id));
  const procedenciaMap = new Map<string, Procedencia>();
  for (const fila of filas) {
    const p = (procedenciaRes.data ?? []).find((r) => r.id === fila.postulante?.id);
    if (!p || !fila.postulante) continue;
    procedenciaMap.set(fila.postulacionId, {
      nivel: nivelDe(p.nivel_prioridad),
      localidad: p.localidad,
      comprobante: comprobantes.get(fila.postulante.usuario_id) ?? null,
    });
  }

  const avatarMap = new Map<string, Avatar>();

  if (usuarioIds.length > 0) {
    const { data: avatarArchivos } = await supabase
      .from("archivos_usuario")
      .select("usuario_id, ruta, ajuste_x, ajuste_y, ajuste_zoom")
      .in("usuario_id", usuarioIds)
      .eq("tipo", "avatar")
      .eq("activo", true);

    if (avatarArchivos && avatarArchivos.length > 0) {
      const paths = avatarArchivos.map((a) => a.ruta);
      const { data: signedUrls } = await supabase.storage
        .from("avatares")
        .createSignedUrls(paths, 600);

      if (signedUrls) {
        for (const signed of signedUrls) {
          if (signed.signedUrl) {
            const archivo = avatarArchivos.find((a) => a.ruta === signed.path);
            if (archivo) {
              avatarMap.set(archivo.usuario_id, {
                url: signed.signedUrl,
                ajuste: {
                  x: Number(archivo.ajuste_x),
                  y: Number(archivo.ajuste_y),
                  zoom: Number(archivo.ajuste_zoom),
                },
              });
            }
          }
        }
      }
    }
  }

  return {
    tipo: "ok",
    filas,
    pagina: paginaActual,
    total,
    procedenciaMap,
    porInvitacion,
    avatarMap,
  };
}

const ENCABEZADO_FECHA: Record<EstadoFiltro, string> = {
  pendiente: "Fecha",
  derivada: "Fecha",
  contratado: "Contratado el",
  rechazada_municipalidad: "Rechazado el",
  retirada_postulante: "Retirada el",
};

async function ListadoPostulaciones({
  datos,
  estado,
  searchParams,
}: {
  datos: Promise<DatosListado>;
  estado: EstadoFiltro;
  searchParams: ParamsUrl;
}) {
  const d = await datos;

  if (d.tipo === "error") return <ErrorListado refError={d.refError} />;

  if (d.tipo === "oferta-sin-postulaciones") {
    return (
      <EstadoVacio
        tipo="sin-resultados"
        titulo="No hay postulaciones de esta oferta en esta pestaña."
        descripcion="Elegí otra pestaña u otra oferta."
        hrefLimpiar={hrefConParams(RUTA, searchParams, { oferta_id: null, pagina: null })}
        textoLimpiar="Ver todas las ofertas"
      />
    );
  }

  if (d.tipo === "vacio") {
    return d.conFiltros ? (
      <EstadoVacio
        tipo="sin-resultados"
        titulo="No se encontraron postulaciones con los filtros aplicados"
        hrefLimpiar={hrefConParams(RUTA, {}, { estado })}
      />
    ) : (
      <EstadoVacio tipo="sin-registros" icono={ClipboardList} titulo={TEXTO_VACIO[estado]} />
    );
  }

  const etiquetaFecha = ENCABEZADO_FECHA[estado];

  return (
    <div className="flex flex-col gap-4">
      <TablaListado
        columnas={COLUMNAS}
        etiqueta="Postulaciones"
        semantica="tabla"
        encabezados={[
          "Postulante",
          "Oferta y empresa",
          etiquetaFecha,
          "Estado",
          <span key="a" className="sr-only">
            Acciones
          </span>,
        ]}
      >
        {d.filas.map((fila) => {
          const usuario = fila.postulante?.usuarios;
          const nombre = usuario ? `${usuario.nombre} ${usuario.apellido}` : "—";
          const avatar = d.avatarMap.get(fila.postulante?.usuario_id ?? "");
          const procedencia = d.procedenciaMap.get(fila.postulacionId);
          const href = `/admin/postulaciones/${fila.postulacionId}`;
          const badge = BADGE_ESTADO_VISIBLE[fila.visible];
          const preCoordinada =
            fila.preEntrevista?.estado === "coordinada" ? fila.preEntrevista : null;
          const titulo = fila.oferta?.titulo ?? "—";
          return (
            <FilaTabla
              key={fila.postulacionId}
              semantica="tabla"
              filete={preCoordinada ? ESTILO_ETAPA.preentrevista.filete : FILETE_ESTADO_VISIBLE[fila.visible]}
            >
              <div role="cell" className="min-w-0">
                <CeldaPersona
                  nombre={nombre}
                  href={href}
                  foto={avatar}
                  iniciales={usuario ? inicialesDePersona(usuario.nombre, usuario.apellido) : undefined}
                  secundario={fila.postulante?.dni ? `DNI ${fila.postulante.dni}` : null}
                >
                  {procedencia && (
                    <>
                      <ChipLocalidad nivel={procedencia.nivel} localidad={procedencia.localidad} />
                      {procedencia.nivel === 2 && (
                        <span className="text-[13px] font-semibold text-sin-comprobante">
                          {detalleSinVerificar(procedencia.comprobante)}
                        </span>
                      )}
                    </>
                  )}
                </CeldaPersona>
              </div>
              <div role="cell" className="min-w-0 break-words">
                <span className="block text-[15px] leading-snug font-extrabold text-heading">
                  {titulo}
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  {fila.oferta?.empresa_nombre || "—"}
                </span>
              </div>
              <div
                role="cell"
                className="flex items-center gap-2 text-sm whitespace-nowrap text-muted-foreground-strong tabular-nums @4xl:block @4xl:text-[15px] @4xl:text-foreground"
              >
                <Calendar aria-hidden="true" className="size-4 shrink-0 text-muted-icon @4xl:hidden" />
                <span>
                  <span className="@4xl:sr-only">{etiquetaFecha}: </span>
                  {formatFechaCorta(fila.fecha)}
                </span>
              </div>
              {/* En la tarjeta del celular, el estado va arriba. */}
              <div
                role="cell"
                className="order-first flex min-w-0 flex-col items-start gap-1.5 @4xl:order-none"
              >
                <Badge tono={badge.tono} estado multilinea>
                  {badge.label}
                </Badge>
                {d.porInvitacion.has(fila.postulacionId) && <BadgePorInvitacion />}
                {preCoordinada && (
                  <p className="flex items-center gap-1.5 text-[13px] font-semibold text-info">
                    <CalendarClock aria-hidden="true" className="size-4 shrink-0" />
                    Pre-entrevista: {formatFechaHoraCorta(preCoordinada.fecha_hora)}
                  </p>
                )}
              </div>
              <div role="cell" className="@4xl:text-right">
                <Link
                  href={href}
                  aria-label={`Ver ficha de ${nombre}, postulación a ${titulo}`}
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
        className="mt-2"
        ruta={RUTA}
        searchParams={searchParams}
        pagina={d.pagina}
        total={d.total}
        variante="numeros"
        elemento={{ singular: "postulación", plural: "postulaciones" }}
      />
    </div>
  );
}
