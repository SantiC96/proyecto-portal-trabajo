import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Form from "next/form";
import { CalendarClock, ClipboardList } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { limpiarBusqueda, patronIlike } from "@/lib/busqueda";
import {
  consultarPagina,
  hrefConParams,
  leerPagina,
  type ParamsUrl,
} from "@/lib/paginacion";
import { Buscador } from "@/components/ui/buscador";
import { Combobox } from "@/components/ui/combobox";
import { PestanasEstado } from "@/components/ui/pestanas-estado";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { Esqueleto, EsqueletoLista } from "@/components/ui/esqueleto";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import {
  CLASE_ACCION_FILA,
  CeldaPersona,
  CeldaTabla,
  FilaTabla,
  Tabla as TablaListado,
} from "@/components/ui/tabla";
import { Badge } from "@/components/ui/badge";
import {
  BADGE_ESTADO_VISIBLE,
  badgePostulacion,
  type BadgePostulacion,
} from "@/lib/admin/postulacion-estados";
import {
  DERIVACION_ABIERTA,
  filtrarContratados,
  filtrarPestanaPostulaciones,
  ofertasDePestana,
  type PestanaPostulaciones,
} from "@/lib/admin/postulaciones-pestanas";
import type { FilaPostulacionNoSeleccionada, Tabla } from "@/types/db";
import { formatFechaCorta, formatFechaHoraCorta } from "@/lib/fechas";
import { requerirRolPagina } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { inicialesDePersona } from "@/lib/iniciales";
import { BadgeProcedencia } from "@/components/postulantes/badge-procedencia";
import { BadgePorInvitacion } from "@/components/admin/badge-por-invitacion";
import { estadosDeComprobantes } from "@/lib/comprobantes";
import { nivelDe, type EstadoComprobante, type NivelPrioridad } from "@/lib/procedencia";

export const metadata: Metadata = {
  title: "Postulaciones | Panel municipal | Portal de Empleo Funes",
};

// Qué entra en cada pestaña: src/lib/admin/postulaciones-pestanas.ts.
type EstadoFiltro = PestanaPostulaciones;

const ESTADOS_FILTRO: EstadoFiltro[] = [
  "pendiente",
  "derivada",
  "contratado",
  "rechazada_municipalidad",
  "retirada_postulante",
];

const LABEL_FILTRO: Record<EstadoFiltro, string> = {
  pendiente: "Pendientes",
  derivada: "Derivadas",
  contratado: "Contratado",
  rechazada_municipalidad: "No seleccionado",
  retirada_postulante: "Retiradas",
};

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

const ID_INEXISTENTE = "00000000-0000-0000-0000-000000000000";

type PostulanteEmbebido =
  | (Pick<Tabla<"postulantes">, "id" | "usuario_id" | "dni"> & {
      usuarios: Pick<Tabla<"usuarios">, "nombre" | "apellido"> | null;
    })
  | null;

type OfertaEmbebida = Pick<Tabla<"ofertas">, "id" | "titulo" | "empresa_nombre"> | null;

type PreEntrevistaEmbebida = Pick<Tabla<"pre_entrevistas">, "estado" | "fecha_hora"> | null;

/** Fila común a las cuatro secciones. */
type Fila = {
  postulacionId: string;
  postulante: PostulanteEmbebido;
  oferta: OfertaEmbebida;
  fecha: string;
  badge: BadgePostulacion;
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

  // Cantidad de cada pestaña: conteos sin filas (head: true), en paralelo, con
  // las mismas condiciones que el listado (postulaciones-pestanas.ts).
  const [
    { count: cRecibidas },
    { count: cRevision },
    { count: cDerivadas },
    { count: cContratados },
    { count: cRechazadas },
    { count: cRetiradas },
  ] = await Promise.all([
    supabase
      .from("postulaciones")
      .select("*", { count: "exact", head: true })
      .eq("estado", "recibida"),
    supabase
      .from("postulaciones")
      .select("*", { count: "exact", head: true })
      .eq("estado", "en_revision"),
    supabase
      .from("postulaciones")
      .select("id, derivaciones!inner(estado_empresa)", { count: "exact", head: true })
      .eq("estado", "derivada")
      .in("derivaciones.estado_empresa", DERIVACION_ABIERTA),
    supabase
      .from("derivaciones")
      .select("*", { count: "exact", head: true })
      .eq("estado_empresa", "contratado"),
    supabase.rpc("postulaciones_no_seleccionadas", undefined, {
      count: "exact",
      head: true,
    }),
    supabase
      .from("postulaciones")
      .select("*", { count: "exact", head: true })
      .eq("estado", "retirada_postulante"),
  ]);

  const resOfertas = await ofertasDePestana(supabase, estado, ofertaId);
  if (!resOfertas.ok) logError("admin_postulaciones_ofertas_filtro", resOfertas.error, { estado });
  const ofertasDisponibles = resOfertas.ok ? resOfertas.valor : [];
  const ofertaSinPostulaciones =
    resOfertas.ok &&
    ofertaId !== "" &&
    (ofertasDisponibles.find((o) => o.id === ofertaId)?.cantidad ?? 0) === 0;

  const cantidades: Record<EstadoFiltro, number> = {
    pendiente: (cRecibidas ?? 0) + (cRevision ?? 0),
    derivada: cDerivadas ?? 0,
    contratado: cContratados ?? 0,
    rechazada_municipalidad: cRechazadas ?? 0,
    retirada_postulante: cRetiradas ?? 0,
  };

  // Una sola carga compartida por el contador de los filtros y la lista. La
  // clave cambia con cada filtro o página: los Suspense se vuelven a montar y
  // muestran el esqueleto mientras llega el resultado nuevo.
  const filtros: FiltrosListado = { estado, ofertaId, q, primeroFunes, pagina, ofertaSinPostulaciones };
  const datos = cargarListado(filtros);
  const clave = JSON.stringify(filtros);

  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Postulaciones"
        bajada="Revisá cada postulación antes de derivarla a la empresa."
      />

      <PestanasEstado
        etiqueta="Estado de las postulaciones"
        pestanas={ESTADOS_FILTRO.map((tab) => ({
          href: hrefConParams(RUTA, {}, {
            estado: tab,
            oferta_id: ofertaId || null,
            q: sp.q ?? null,
            orden: sp.orden === "prioridad" ? "prioridad" : null,
          }),
          label: LABEL_FILTRO[tab],
          activa: tab === estado,
          cantidad: cantidades[tab],
        }))}
      />

      <div className="flex flex-col gap-4">
        {/* Mide lo mismo que los desplegables de abajo: Oferta (w-80) y, si
            se muestra, Orden (w-64) con la separación entre ellos (gap-3). */}
        <Buscador
          className={cn("w-full min-w-0", ordenDisponible ? "sm:w-[36.75rem]" : "sm:w-80")}
          inputClassName="rounded-xl"
          placeholder="Buscar por nombre, apellido o DNI"
        />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          {/* Oferta y Orden se aplican solos al elegir (enviarAlCambiar). Form
              navega sin recargar la página, así el foco vuelve al filtro; sin
              JavaScript es un formulario GET común y aparece el botón. */}
          <Form
            action={RUTA}
            scroll={false}
            className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          >
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
                triggerClassName="campo cursor-pointer sm:w-80"
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
                  triggerClassName="campo cursor-pointer sm:w-64"
                  enviarAlCambiar
                />
              </div>
            )}
            <noscript>
              <button type="submit" className="btn-neutro min-h-12">
                Filtrar
              </button>
            </noscript>
            {(q || ofertaId || primeroFunes) && (
              <Link
                href={hrefConParams(RUTA, {}, { estado })}
                className="inline-flex min-h-12 items-center rounded-[var(--radius-sm)] px-1 text-[15px] font-semibold text-primary underline-offset-2 outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]"
              >
                Limpiar filtros
              </Link>
            )}
          </Form>

          <Suspense key={`${clave}:contador`} fallback={<Esqueleto className="h-4 w-48" />}>
            <ContadorPostulaciones datos={datos} />
          </Suspense>
        </div>
      </div>

      <Suspense key={`${clave}:lista`} fallback={<EsqueletoLista filas={5} />}>
        <ListadoPostulaciones datos={datos} estado={estado} searchParams={sp} />
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
  ofertaId: string;
  q: string;
  primeroFunes: boolean;
  pagina: number;
  /** La oferta de la URL no tiene postulaciones en esta pestaña. */
  ofertaSinPostulaciones: boolean;
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
  ofertaId,
  q,
  primeroFunes,
  pagina,
  ofertaSinPostulaciones,
}: FiltrosListado): Promise<DatosListado> {
  if (ofertaSinPostulaciones) return { tipo: "oferta-sin-postulaciones" };

  const supabase = await createSupabaseServerClient();

  // Pre-filtro por texto: buscar postulante_ids que coincidan
  let filtroPostulanteIds: string[] | null = null;
  if (q) {
    const patron = patronIlike(q);
    const [usuariosRes, postulantesRes] = await Promise.all([
      supabase
        .from("usuarios")
        .select("id")
        .or(`nombre.ilike.${patron},apellido.ilike.${patron}`),
      supabase.from("postulantes").select("id").ilike("dni", patron),
    ]);

    const errorPrefiltro = usuariosRes.error ?? postulantesRes.error;
    if (errorPrefiltro) {
      return { tipo: "error", refError: logError("admin_postulaciones_busqueda", errorPrefiltro) };
    }

    const idsFromNombre = usuariosRes.data?.map((u) => u.id) ?? [];
    let idsFromDni = postulantesRes.data?.map((p) => p.id) ?? [];

    // Agregar postulantes cuyo usuario_id coincide con un nombre/apellido
    if (idsFromNombre.length > 0) {
      const { data: postulantesPorUsuario } = await supabase
        .from("postulantes")
        .select("id")
        .in("usuario_id", idsFromNombre);
      const idsExtra = postulantesPorUsuario?.map((p) => p.id) ?? [];
      idsFromDni = [...new Set([...idsFromDni, ...idsExtra])];
    }

    filtroPostulanteIds = idsFromDni;
  }

  // Si la búsqueda no encontró coincidencias, forzar resultado vacío
  const idsBusqueda =
    filtroPostulanteIds === null
      ? null
      : filtroPostulanteIds.length > 0
        ? filtroPostulanteIds
        : [ID_INEXISTENTE];

  let filas: Fila[];
  let paginaActual: number;
  let total: number;

  if (estado === "contratado") {
    const resultado = await consultarPagina(pagina, (desde, hasta) => {
      let query = filtrarContratados(
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
      );

      if (ofertaId) query = query.eq("postulaciones.oferta_id", ofertaId);
      if (idsBusqueda) query = query.in("postulaciones.postulante_id", idsBusqueda);

      // fecha_respuesta es la fecha de contratación (la fija el trigger de
      // derivaciones); updated_at cubre filas viejas que no la tengan.
      return query
        .order("fecha_respuesta", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false })
        .order("id", { ascending: false })
        .range(desde, hasta);
    });

    if (!resultado.ok) {
      return { tipo: "error", refError: logError("admin_postulaciones_contratados", resultado.error) };
    }

    filas = resultado.filas.map((d) => ({
      postulacionId: d.postulaciones.id,
      postulante: d.postulaciones.postulantes,
      oferta: d.postulaciones.ofertas,
      fecha: d.fecha_respuesta ?? d.updated_at,
      badge: BADGE_ESTADO_VISIBLE.contratado,
    }));
    paginaActual = resultado.pagina;
    total = resultado.total;
  } else if (estado === "rechazada_municipalidad") {
    const resultado = await consultarPagina(pagina, async (desde, hasta) => {
      let query = supabase.rpc("postulaciones_no_seleccionadas", undefined, {
        count: "exact",
      });

      if (ofertaId) query = query.eq("oferta_id", ofertaId);
      if (idsBusqueda) query = query.in("postulante_id", idsBusqueda);

      const respuesta = await query
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
      badge:
        BADGE_ESTADO_VISIBLE[
          r.rechazado_por === "empresa" ? "no_seleccionado_empresa" : "no_seleccionado_oficina"
        ],
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
      let query = filtrarPestanaPostulaciones(
        supabase
          .from("postulaciones")
          .select(
            estado === "derivada"
              ? `${columnas}, derivaciones!inner(estado_empresa)`
              : `${columnas}, derivaciones(estado_empresa)`,
            { count: "exact" }
          ),
        estado
      );

      if (ofertaId) query = query.eq("oferta_id", ofertaId);
      if (idsBusqueda) query = query.in("postulante_id", idsBusqueda);

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
      badge: badgePostulacion(r.estado, r.derivaciones?.estado_empresa),
      preEntrevista: estado === "pendiente" ? r.pre_entrevistas : undefined,
    }));
    paginaActual = resultado.pagina;
    total = resultado.total;
  }

  if (filas.length === 0) return { tipo: "vacio", conFiltros: Boolean(q || ofertaId) };

  // Avatares en batch
  const usuarioIds = filas
    .map((f) => f.postulante?.usuario_id)
    .filter((id): id is string => Boolean(id));

  // Procedencia de cada candidato (badge; solo la oficina la ve)
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

async function ContadorPostulaciones({ datos }: { datos: Promise<DatosListado> }) {
  const d = await datos;
  if (d.tipo !== "ok") return null;
  return (
    <p className="text-sm whitespace-nowrap text-muted-foreground-strong" aria-live="polite">
      Mostrando {d.filas.length} de {d.total} {d.total === 1 ? "postulación" : "postulaciones"}
    </p>
  );
}

// Postulante | Oferta y empresa | Fecha | Estado | acción.
const COLUMNAS = "minmax(0,1.6fr) minmax(0,1.6fr) 7rem minmax(0,1.4fr) auto";

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
    <div className="flex flex-col gap-6">
      <TablaListado
        columnas={COLUMNAS}
        etiqueta="Postulaciones"
        encabezados={["Postulante", "Oferta y empresa", etiquetaFecha, "Estado", ""]}
      >
        {d.filas.map((fila) => {
          const usuario = fila.postulante?.usuarios;
          const nombre = usuario ? `${usuario.nombre} ${usuario.apellido}` : "—";
          const avatar = d.avatarMap.get(fila.postulante?.usuario_id ?? "");
          const href = `/admin/postulaciones/${fila.postulacionId}`;
          return (
            <FilaTabla key={fila.postulacionId}>
              <CeldaPersona
                nombre={nombre}
                href={href}
                foto={avatar}
                iniciales={usuario ? inicialesDePersona(usuario.nombre, usuario.apellido) : undefined}
              >
                {fila.postulante?.dni && (
                  <span className="text-[13px] text-muted-foreground tabular-nums">
                    DNI {fila.postulante.dni}
                  </span>
                )}
                <ProcedenciaFila procedencia={d.procedenciaMap.get(fila.postulacionId)} />
              </CeldaPersona>
              <CeldaTabla etiqueta="Oferta y empresa">
                <span className="block text-[15px] leading-snug font-bold text-heading">
                  {fila.oferta?.titulo ?? "—"}
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  {fila.oferta?.empresa_nombre || "—"}
                </span>
              </CeldaTabla>
              <CeldaTabla etiqueta={etiquetaFecha} rotuloVisible className="tabular-nums">
                {formatFechaCorta(fila.fecha)}
              </CeldaTabla>
              <CeldaTabla etiqueta="Estado" className="flex flex-col items-start gap-1.5">
                <Badge tono={fila.badge.tono} estado>
                  {fila.badge.label}
                </Badge>
                {d.porInvitacion.has(fila.postulacionId) && <BadgePorInvitacion />}
                <PreEntrevistaCoordinada pre={fila.preEntrevista} />
              </CeldaTabla>
              <Link href={href} className={`btn-neutro ${CLASE_ACCION_FILA}`}>
                Ver ficha
                <span className="sr-only">: {nombre}</span>
              </Link>
            </FilaTabla>
          );
        })}
      </TablaListado>

      <Paginacion
        ruta={RUTA}
        searchParams={searchParams}
        pagina={d.pagina}
        total={d.total}
        variante="numeros"
      />
    </div>
  );
}

function ProcedenciaFila({
  procedencia,
  className,
}: {
  procedencia: Procedencia | undefined;
  className?: string;
}) {
  if (!procedencia) return null;
  return (
    <BadgeProcedencia
      nivel={procedencia.nivel}
      localidad={procedencia.localidad}
      comprobante={procedencia.comprobante}
      className={className}
    />
  );
}

/** Solo la pre-entrevista coordinada; el resto del detalle está en la ficha. */
function PreEntrevistaCoordinada({
  pre,
  className,
}: {
  pre: PreEntrevistaEmbebida | undefined;
  className?: string;
}) {
  if (pre?.estado !== "coordinada") return null;
  return (
    <p
      className={cn("flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground", className)}
    >
      <CalendarClock className="h-3.5 w-3.5 flex-shrink-0 text-primary" aria-hidden="true" />
      Pre-entrevista: {formatFechaHoraCorta(pre.fecha_hora)}
    </p>
  );
}
