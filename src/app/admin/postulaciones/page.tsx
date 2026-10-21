import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
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
import { ContadoresEstado, PestanasEstado, type Contador } from "@/components/ui/pestanas-estado";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { Badge } from "@/components/ui/badge";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
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
import { BotonVolver } from "@/components/ui/boton-volver";
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

  // Contadores por sección
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

  const pendientesTotal = (cRecibidas ?? 0) + (cRevision ?? 0);

  const contadores: Contador[] = [
    { label: "Recibidas", valor: cRecibidas ?? 0, color: "text-foreground" },
    { label: "En revisión", valor: cRevision ?? 0, color: "text-blue-700" },
    { label: "Derivadas", valor: cDerivadas ?? 0, color: "text-primary" },
    { label: "Contratado", valor: cContratados ?? 0, color: "text-emerald-700" },
    { label: "No seleccionado", valor: cRechazadas ?? 0, color: "text-red-600" },
    { label: "Retiradas", valor: cRetiradas ?? 0, color: "text-muted-foreground" },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <BotonVolver href="/admin">Volver al panel</BotonVolver>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Postulaciones
      </h1>

      <ContadoresEstado className="mt-6" contadores={contadores} />

      <PestanasEstado
        className="mt-6"
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
          cantidad: tab === "pendiente" ? pendientesTotal : undefined,
        }))}
      />

      {/* Filtros de búsqueda */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Buscador
          className="flex-1 sm:min-w-[180px]"
          placeholder="Nombre, apellido o DNI…"
        />
        <form method="GET" action={RUTA} className="flex flex-wrap gap-3">
          <input type="hidden" name="estado" value={estado} />
          {sp.q && <input type="hidden" name="q" value={sp.q} />}
          {ordenDisponible && (
            <select
              name="orden"
              defaultValue={primeroFunes ? "prioridad" : ""}
              aria-label="Ordenar postulaciones"
              className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 sm:max-w-xs"
            >
              <option value="">Más recientes primero</option>
              <option value="prioridad">Primero verificados de Funes</option>
            </select>
          )}
          {/* key: las opciones cambian con la pestaña y defaultValue solo
              se aplica al montar. */}
          <select
            key={`${estado}-${ofertaId}`}
            name="oferta_id"
            defaultValue={ofertaId}
            aria-label="Filtrar por oferta"
            className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 sm:max-w-xs"
          >
            <option value="">Todas las ofertas</option>
            {ofertasDisponibles.map((o) => (
              <option key={o.id} value={o.id}>
                {o.empresaNombre ? `${o.titulo} — ${o.empresaNombre}` : o.titulo} ({o.cantidad})
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Filtrar
          </button>
        </form>
      </div>
      {(q || ofertaId || primeroFunes) && (
        <Link
          href={hrefConParams(RUTA, {}, { estado })}
          className="mt-2 inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Limpiar filtros
        </Link>
      )}

      {/* Resultados */}
      <Suspense
        key={JSON.stringify({ estado, ofertaId, q, primeroFunes, pagina })}
        fallback={<EsqueletoLista filas={5} className="mt-4" />}
      >
        <ListadoPostulaciones
          estado={estado}
          ofertaId={ofertaId}
          q={q}
          primeroFunes={primeroFunes}
          pagina={pagina}
          ofertaSinPostulaciones={ofertaSinPostulaciones}
          searchParams={sp}
        />
      </Suspense>
    </section>
  );
}

const TEXTO_VACIO: Record<EstadoFiltro, string> = {
  pendiente: "No hay postulaciones pendientes de revisión en este momento.",
  derivada: "No hay postulaciones derivadas esperando el resultado de la empresa.",
  contratado: "Todavía ninguna empresa marcó a un postulante como contratado.",
  rechazada_municipalidad: "No hay postulaciones no seleccionadas en este momento.",
  retirada_postulante: "Ningún postulante retiró una postulación en revisión o derivada.",
};

async function ListadoPostulaciones({
  estado,
  ofertaId,
  q,
  primeroFunes,
  pagina,
  ofertaSinPostulaciones,
  searchParams,
}: {
  estado: EstadoFiltro;
  ofertaId: string;
  q: string;
  primeroFunes: boolean;
  pagina: number;
  /** La oferta de la URL no tiene postulaciones en esta pestaña. */
  ofertaSinPostulaciones: boolean;
  searchParams: ParamsUrl;
}) {
  if (ofertaSinPostulaciones) {
    return (
      <EstadoVacio
        tipo="sin-resultados"
        className="mt-4"
        titulo="No hay postulaciones de esta oferta en esta pestaña."
        descripcion="Elegí otra pestaña u otra oferta."
        hrefLimpiar={hrefConParams(RUTA, searchParams, { oferta_id: null, pagina: null })}
        textoLimpiar="Ver todas las ofertas"
      />
    );
  }

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
      const ref = logError("admin_postulaciones_busqueda", errorPrefiltro);
      return <ErrorListado className="mt-4" refError={ref} />;
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
      const ref = logError("admin_postulaciones_contratados", resultado.error);
      return <ErrorListado className="mt-4" refError={ref} />;
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
      const ref = logError("admin_postulaciones_no_seleccionadas", resultado.error);
      return <ErrorListado className="mt-4" refError={ref} />;
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
      const ref = logError("admin_postulaciones_listado", resultado.error, { estado });
      return <ErrorListado className="mt-4" refError={ref} />;
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

  if (filas.length === 0) {
    return q || ofertaId ? (
      <EstadoVacio
        tipo="sin-resultados"
        className="mt-4"
        titulo="No se encontraron postulaciones con los filtros aplicados"
        hrefLimpiar={hrefConParams(RUTA, {}, { estado })}
      />
    ) : (
      <EstadoVacio
        tipo="sin-registros"
        className="mt-4"
        icono={ClipboardList}
        titulo={TEXTO_VACIO[estado]}
      />
    );
  }

  const etiquetaFecha =
    estado === "contratado"
      ? "Contratado el"
      : estado === "rechazada_municipalidad"
        ? "Rechazado el"
        : estado === "retirada_postulante"
          ? "Retirada el"
          : "Fecha";

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

  const avatarMap = new Map<
    string,
    { url: string; ajuste: { x: number; y: number; zoom: number } }
  >();

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

  return (
    <>
          {/* Tabla desktop */}
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-3 pr-4 font-medium text-muted-foreground">
                    Candidato
                  </th>
                  <th className="py-3 pr-4 font-medium text-muted-foreground">
                    DNI
                  </th>
                  <th className="py-3 pr-4 font-medium text-muted-foreground">
                    Oferta
                  </th>
                  <th className="py-3 pr-4 font-medium text-muted-foreground">
                    Empresa
                  </th>
                  <th className="py-3 pr-4 font-medium text-muted-foreground">
                    {estado === "contratado"
                      ? "Fecha de contratación"
                      : estado === "rechazada_municipalidad"
                        ? "Fecha de rechazo"
                        : estado === "retirada_postulante"
                          ? "Fecha de retiro"
                          : "Fecha"}
                  </th>
                  <th className="py-3 pr-4 font-medium text-muted-foreground">
                    Estado
                  </th>
                  <th className="py-3 font-medium text-muted-foreground" />
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => {
                  const usuario = fila.postulante?.usuarios;
                  const usuarioId = fila.postulante?.usuario_id ?? "";
                  const avatar = avatarMap.get(usuarioId);
                  return (
                    <tr
                      key={fila.postulacionId}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <AvatarAjustado
                            src={avatar?.url ?? null}
                            alt={
                              usuario
                                ? `${usuario.nombre} ${usuario.apellido}`
                                : "Candidato"
                            }
                            ajuste={avatar?.ajuste}
                            size="sm"
                          />
                          <div className="min-w-0 space-y-1">
                            <span className="block font-medium text-foreground">
                              {usuario
                                ? `${usuario.nombre} ${usuario.apellido}`
                                : "—"}
                            </span>
                            <ProcedenciaFila procedencia={procedenciaMap.get(fila.postulacionId)} />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-4 font-mono text-muted-foreground">
                        {fila.postulante?.dni ?? "—"}
                      </td>
                      <td className="py-4 pr-4 text-foreground">
                        {fila.oferta?.titulo ?? "—"}
                      </td>
                      <td className="py-4 pr-4 text-muted-foreground">
                        {fila.oferta?.empresa_nombre ?? "—"}
                      </td>
                      <td className="py-4 pr-4 text-muted-foreground">
                        {formatFechaCorta(fila.fecha)}
                      </td>
                      <td className="py-4 pr-4">
                        <Badge
                          variant={fila.badge.variant}
                          className={fila.badge.className}
                        >
                          {fila.badge.label}
                        </Badge>
                        {porInvitacion.has(fila.postulacionId) && (
                          <BadgePorInvitacion className="mt-1.5 flex" />
                        )}
                        <PreEntrevistaCoordinada pre={fila.preEntrevista} className="mt-1.5" />
                      </td>
                      <td className="py-4">
                        <Link
                          href={`/admin/postulaciones/${fila.postulacionId}`}
                          className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-tinted"
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
            {filas.map((fila) => {
              const usuario = fila.postulante?.usuarios;
              const usuarioId = fila.postulante?.usuario_id ?? "";
              const avatar = avatarMap.get(usuarioId);
              return (
                <div
                  key={fila.postulacionId}
                  className="rounded-[var(--radius-lg)] border border-border bg-surface p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <AvatarAjustado
                        src={avatar?.url ?? null}
                        alt={
                          usuario
                            ? `${usuario.nombre} ${usuario.apellido}`
                            : "Candidato"
                        }
                        ajuste={avatar?.ajuste}
                        size="sm"
                      />
                      <p className="font-semibold text-foreground">
                        {usuario
                          ? `${usuario.nombre} ${usuario.apellido}`
                          : "—"}
                      </p>
                    </div>
                    <Badge variant={fila.badge.variant} className={fila.badge.className}>
                      {fila.badge.label}
                    </Badge>
                  </div>
                  <ProcedenciaFila
                    procedencia={procedenciaMap.get(fila.postulacionId)}
                    className="mt-2"
                  />
                  {porInvitacion.has(fila.postulacionId) && (
                    <BadgePorInvitacion className="mt-2" />
                  )}
                  <dl className="mt-3 space-y-1.5 text-sm">
                    <div className="flex gap-2">
                      <dt className="w-24 flex-shrink-0 text-muted-foreground">
                        DNI
                      </dt>
                      <dd className="font-mono text-foreground">
                        {fila.postulante?.dni ?? "—"}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-24 flex-shrink-0 text-muted-foreground">
                        Oferta
                      </dt>
                      <dd className="text-foreground">
                        {fila.oferta?.titulo ?? "—"}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-24 flex-shrink-0 text-muted-foreground">
                        Empresa
                      </dt>
                      <dd className="text-muted-foreground">
                        {fila.oferta?.empresa_nombre ?? "—"}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-24 flex-shrink-0 text-muted-foreground">
                        {etiquetaFecha}
                      </dt>
                      <dd className="text-muted-foreground">
                        {formatFechaCorta(fila.fecha)}
                      </dd>
                    </div>
                  </dl>
                  <PreEntrevistaCoordinada pre={fila.preEntrevista} className="mt-3" />
                  <div className="mt-4">
                    <Link
                      href={`/admin/postulaciones/${fila.postulacionId}`}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-tinted"
                    >
                      Ver ficha
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <Paginacion
            className="mt-6"
            ruta={RUTA}
            searchParams={searchParams}
            pagina={paginaActual}
            total={total}
          />
    </>
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
