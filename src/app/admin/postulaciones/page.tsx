import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
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
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { abrirFicha } from "./actions";
import { Badge } from "@/components/ui/badge";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import {
  BADGE_CONFIG,
  type EstadoPostulacion,
} from "@/lib/admin/postulacion-estados";
import { formatFechaCorta } from "@/lib/fechas";

export const metadata: Metadata = {
  title: "Postulaciones | Panel municipal | Portal de Empleo Funes",
};

type EstadoFiltro = "pendiente" | "derivada" | "rechazada_municipalidad";

const ESTADOS_FILTRO: EstadoFiltro[] = [
  "pendiente",
  "derivada",
  "rechazada_municipalidad",
];

const LABEL_FILTRO: Record<EstadoFiltro, string> = {
  pendiente: "Pendientes",
  derivada: "Derivadas",
  rechazada_municipalidad: "No seleccionadas",
};

type PostulacionRow = {
  id: string;
  estado: EstadoPostulacion;
  created_at: string;
  postulante_id: string;
  postulantes: {
    id: string;
    usuario_id: string;
    dni: string | null;
    usuarios: { nombre: string; apellido: string } | null;
  } | null;
  ofertas: { id: string; titulo: string; empresa_nombre: string } | null;
};

const RUTA = "/admin/postulaciones";

export default async function PostulacionesPage({
  searchParams,
}: {
  searchParams: Promise<{
    estado?: string;
    oferta_id?: string;
    q?: string;
    pagina?: string;
  }>;
}) {
  const sp = await searchParams;

  const estado: EstadoFiltro = ESTADOS_FILTRO.includes(
    sp.estado as EstadoFiltro
  )
    ? (sp.estado as EstadoFiltro)
    : "pendiente";

  const ofertaId = (sp.oferta_id ?? "").trim();
  const q = limpiarBusqueda(sp.q);
  const pagina = leerPagina(sp.pagina);

  const supabase = await createSupabaseServerClient();

  // Contadores por estado
  const [
    { count: cRecibidas },
    { count: cRevision },
    { count: cDerivadas },
    { count: cRechazadas },
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
      .select("*", { count: "exact", head: true })
      .eq("estado", "derivada"),
    supabase
      .from("postulaciones")
      .select("*", { count: "exact", head: true })
      .eq("estado", "rechazada_municipalidad"),
  ]);

  // Ofertas que tienen al menos una postulación (para el selector de filtro)
  const { data: ofertaIdsData } = await supabase
    .from("postulaciones")
    .select("oferta_id");
  const ofertaIdsUnicos = [
    ...new Set((ofertaIdsData ?? []).map((r) => r.oferta_id)),
  ];
  const { data: ofertasDisponibles } = ofertaIdsUnicos.length > 0
    ? await supabase
        .from("ofertas")
        .select("id, titulo, empresa_nombre")
        .in("id", ofertaIdsUnicos)
        .order("titulo")
    : { data: [] };

  const pendientesTotal = (cRecibidas ?? 0) + (cRevision ?? 0);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">
          Panel
        </Link>
        <span>/</span>
        <span className="text-foreground">Postulaciones</span>
      </div>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Postulaciones
      </h1>

      {/* Contadores */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
          <p className="text-xs font-medium text-muted-foreground">Recibidas</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {cRecibidas ?? 0}
          </p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
          <p className="text-xs font-medium text-muted-foreground">
            En revisión
          </p>
          <p className="mt-1 text-2xl font-bold text-blue-700">
            {cRevision ?? 0}
          </p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
          <p className="text-xs font-medium text-muted-foreground">Derivadas</p>
          <p className="mt-1 text-2xl font-bold text-primary">
            {cDerivadas ?? 0}
          </p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
          <p className="text-xs font-medium text-muted-foreground">
            No seleccionadas
          </p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {cRechazadas ?? 0}
          </p>
        </div>
      </div>

      {/* Barra de pestañas de estado */}
      <div className="mt-6 flex gap-1 rounded-[var(--radius-md)] border border-border bg-surface p-1">
        {ESTADOS_FILTRO.map((tab) => (
          <Link
            key={tab}
            href={hrefConParams(RUTA, {}, {
              estado: tab,
              oferta_id: ofertaId || null,
              q: sp.q ?? null,
            })}
            className={
              tab === estado
                ? "flex-1 rounded-[var(--radius-sm)] bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground"
                : "flex-1 rounded-[var(--radius-sm)] px-3 py-2 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            {LABEL_FILTRO[tab]}
            {tab === "pendiente" && pendientesTotal > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1 text-xs font-semibold text-primary">
                {pendientesTotal}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Filtros de búsqueda */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Buscador
          className="flex-1 sm:min-w-[180px]"
          placeholder="Nombre, apellido o DNI…"
        />
        <form method="GET" action={RUTA} className="flex gap-3">
          <input type="hidden" name="estado" value={estado} />
          {sp.q && <input type="hidden" name="q" value={sp.q} />}
          <select
            name="oferta_id"
            defaultValue={ofertaId}
            aria-label="Filtrar por oferta"
            className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 sm:max-w-xs"
          >
            <option value="">Todas las ofertas</option>
            {(ofertasDisponibles ?? []).map(
              (o: { id: string; titulo: string; empresa_nombre: string }) => (
                <option key={o.id} value={o.id}>
                  {o.titulo} — {o.empresa_nombre}
                </option>
              )
            )}
          </select>
          <button
            type="submit"
            className="h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Filtrar
          </button>
        </form>
      </div>
      {(q || ofertaId) && (
        <Link
          href={hrefConParams(RUTA, {}, { estado })}
          className="mt-2 inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Limpiar filtros
        </Link>
      )}

      {/* Resultados */}
      <Suspense
        key={JSON.stringify({ estado, ofertaId, q, pagina })}
        fallback={<EsqueletoLista filas={5} className="mt-4" />}
      >
        <ListadoPostulaciones
          estado={estado}
          ofertaId={ofertaId}
          q={q}
          pagina={pagina}
          searchParams={sp}
        />
      </Suspense>
    </section>
  );
}

async function ListadoPostulaciones({
  estado,
  ofertaId,
  q,
  pagina,
  searchParams,
}: {
  estado: EstadoFiltro;
  ofertaId: string;
  q: string;
  pagina: number;
  searchParams: ParamsUrl;
}) {
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

  const resultado = await consultarPagina<PostulacionRow>(pagina, (desde, hasta) => {
    let query = supabase
      .from("postulaciones")
      .select(
        `
        id,
        estado,
        created_at,
        postulante_id,
        postulantes!postulante_id(
          id,
          usuario_id,
          dni,
          usuarios!usuario_id(nombre, apellido)
        ),
        ofertas!oferta_id(id, titulo, empresa_nombre)
      `,
        { count: "exact" }
      );

    // Filtro de estado
    if (estado === "pendiente") {
      query = query.in("estado", ["recibida", "en_revision"]);
    } else {
      query = query.eq("estado", estado);
    }

    if (ofertaId) {
      query = query.eq("oferta_id", ofertaId);
    }

    if (filtroPostulanteIds !== null) {
      // Si la búsqueda no encontró coincidencias, forzar resultado vacío
      const ids =
        filtroPostulanteIds.length > 0
          ? filtroPostulanteIds
          : ["00000000-0000-0000-0000-000000000000"];
      query = query.in("postulante_id", ids);
    }

    return query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(desde, hasta)
      .overrideTypes<PostulacionRow[], { merge: false }>();
  });

  if (!resultado.ok) {
    const ref = logError("admin_postulaciones_listado", resultado.error, { estado });
    return <ErrorListado className="mt-4" refError={ref} />;
  }

  const rows = resultado.filas;

  if (rows.length === 0) {
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
        titulo={`No hay postulaciones ${
          estado === "pendiente"
            ? "pendientes de revisión"
            : estado === "derivada"
              ? "derivadas"
              : "no seleccionadas"
        } en este momento.`}
      />
    );
  }

  // Avatares en batch
  const usuarioIds = rows
    .map((r) => r.postulantes?.usuario_id)
    .filter((id): id is string => Boolean(id));

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
                    Fecha
                  </th>
                  <th className="py-3 pr-4 font-medium text-muted-foreground">
                    Estado
                  </th>
                  <th className="py-3 font-medium text-muted-foreground" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const usuario = row.postulantes?.usuarios;
                  const usuarioId = row.postulantes?.usuario_id ?? "";
                  const avatar = avatarMap.get(usuarioId);
                  const badge = BADGE_CONFIG[row.estado];
                  return (
                    <tr
                      key={row.id}
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
                          <span className="font-medium text-foreground">
                            {usuario
                              ? `${usuario.nombre} ${usuario.apellido}`
                              : "—"}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 pr-4 font-mono text-muted-foreground">
                        {row.postulantes?.dni ?? "—"}
                      </td>
                      <td className="py-4 pr-4 text-foreground">
                        {row.ofertas?.titulo ?? "—"}
                      </td>
                      <td className="py-4 pr-4 text-muted-foreground">
                        {row.ofertas?.empresa_nombre ?? "—"}
                      </td>
                      <td className="py-4 pr-4 text-muted-foreground">
                        {formatFechaCorta(row.created_at)}
                      </td>
                      <td className="py-4 pr-4">
                        <Badge
                          variant={badge.variant}
                          className={badge.className}
                        >
                          {badge.label}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <form action={abrirFicha.bind(null, row.id)}>
                          <button
                            type="submit"
                            className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-tinted"
                          >
                            Ver ficha
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards mobile */}
          <div className="mt-4 space-y-3 md:hidden">
            {rows.map((row) => {
              const usuario = row.postulantes?.usuarios;
              const usuarioId = row.postulantes?.usuario_id ?? "";
              const avatar = avatarMap.get(usuarioId);
              const badge = BADGE_CONFIG[row.estado];
              return (
                <div
                  key={row.id}
                  className="rounded-[var(--radius-lg)] border border-border bg-surface p-4"
                >
                  <div className="flex items-center justify-between gap-3">
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
                    <Badge variant={badge.variant} className={badge.className}>
                      {badge.label}
                    </Badge>
                  </div>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    <div className="flex gap-2">
                      <dt className="w-20 flex-shrink-0 text-muted-foreground">
                        DNI
                      </dt>
                      <dd className="font-mono text-foreground">
                        {row.postulantes?.dni ?? "—"}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-20 flex-shrink-0 text-muted-foreground">
                        Oferta
                      </dt>
                      <dd className="text-foreground">
                        {row.ofertas?.titulo ?? "—"}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-20 flex-shrink-0 text-muted-foreground">
                        Empresa
                      </dt>
                      <dd className="text-muted-foreground">
                        {row.ofertas?.empresa_nombre ?? "—"}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-20 flex-shrink-0 text-muted-foreground">
                        Fecha
                      </dt>
                      <dd className="text-muted-foreground">
                        {formatFechaCorta(row.created_at)}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4">
                    <form action={abrirFicha.bind(null, row.id)}>
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-tinted"
                      >
                        Ver ficha
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>

          <Paginacion
            className="mt-6"
            ruta={RUTA}
            searchParams={searchParams}
            pagina={resultado.pagina}
            total={resultado.total}
          />
    </>
  );
}
