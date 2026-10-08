import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { formatFechaCorta } from "@/lib/fechas";
import { getOfertaEstadoLabel } from "@/lib/oferta-estados";

export const metadata: Metadata = {
  title: "Ofertas | Panel municipal | Portal de Empleo Funes",
};

type EstadoFiltro = "pendiente_aprobacion" | "activa" | "rechazada" | "cerrada";

const ESTADOS_FILTRO: EstadoFiltro[] = [
  "pendiente_aprobacion",
  "activa",
  "rechazada",
  "cerrada",
];

const LABEL_FILTRO: Record<EstadoFiltro, string> = {
  pendiente_aprobacion: "Pendientes",
  activa: "Activas",
  rechazada: "Rechazadas",
  cerrada: "Cerradas",
};

const ESTADO_STYLE: Record<EstadoFiltro, string> = {
  pendiente_aprobacion: "bg-amber-100 text-amber-800",
  activa: "bg-emerald-100 text-emerald-800",
  rechazada: "bg-red-100 text-red-700",
  cerrada: "bg-gray-100 text-gray-600",
};

type OfertaRow = {
  id: string;
  titulo: string;
  empresa_nombre: string;
  created_at: string;
  estado: string;
  contenido_editado_en: string | null;
};

function buildHref(params: {
  estado?: string;
  q?: string;
  page?: number;
}) {
  const url = new URLSearchParams();
  if (params.estado) url.set("estado", params.estado);
  if (params.q) url.set("q", params.q);
  if (params.page && params.page > 1) url.set("page", String(params.page));
  const qs = url.toString();
  return `/admin/ofertas${qs ? `?${qs}` : ""}`;
}

const PAGE_SIZE = 20;

export default async function AdminOfertasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string; page?: string }>;
}) {
  const {
    estado: rawEstado,
    q: rawQ = "",
    page: rawPage = "1",
  } = await searchParams;

  const estado: EstadoFiltro = ESTADOS_FILTRO.includes(
    rawEstado as EstadoFiltro
  )
    ? (rawEstado as EstadoFiltro)
    : "pendiente_aprobacion";

  const q = rawQ.trim();
  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createSupabaseServerClient();

  const [
    { count: cPendientes },
    { count: cActivas },
    { count: cRechazadas },
    { count: cCerradas },
  ] = await Promise.all([
    supabase
      .from("ofertas")
      .select("*", { count: "exact", head: true })
      .eq("estado", "pendiente_aprobacion"),
    supabase
      .from("ofertas")
      .select("*", { count: "exact", head: true })
      .eq("estado", "activa"),
    supabase
      .from("ofertas")
      .select("*", { count: "exact", head: true })
      .eq("estado", "rechazada"),
    supabase
      .from("ofertas")
      .select("*", { count: "exact", head: true })
      .eq("estado", "cerrada"),
  ]);

  let query = supabase
    .from("ofertas")
    .select(
      "id, titulo, empresa_nombre, created_at, estado, contenido_editado_en",
      { count: "exact" }
    )
    .eq("estado", estado)
    // Pendientes: de más vieja a más nueva (más urgentes primero)
    .order("created_at", { ascending: estado === "pendiente_aprobacion" })
    .range(from, to);

  if (q) {
    query = query.ilike("titulo", `%${q}%`);
  }

  const { data, count } = await query;
  const rows = (data ?? []) as unknown as OfertaRow[];
  const total = count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">
          Panel
        </Link>
        <span>/</span>
        <span className="text-foreground">Ofertas</span>
      </div>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Ofertas
      </h1>

      {/* Contadores */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
          <p className="text-xs font-medium text-muted-foreground">Pendientes</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">
            {cPendientes ?? 0}
          </p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
          <p className="text-xs font-medium text-muted-foreground">Activas</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {cActivas ?? 0}
          </p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
          <p className="text-xs font-medium text-muted-foreground">Rechazadas</p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {cRechazadas ?? 0}
          </p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
          <p className="text-xs font-medium text-muted-foreground">Cerradas</p>
          <p className="mt-1 text-2xl font-bold text-muted-foreground">
            {cCerradas ?? 0}
          </p>
        </div>
      </div>

      {/* Barra de pestañas */}
      <div className="mt-6 flex gap-1 rounded-[var(--radius-md)] border border-border bg-surface p-1">
        {ESTADOS_FILTRO.map((tab) => (
          <Link
            key={tab}
            href={buildHref({ estado: tab, q: q || undefined })}
            className={
              tab === estado
                ? "flex-1 rounded-[var(--radius-sm)] bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground"
                : "flex-1 rounded-[var(--radius-sm)] px-3 py-2 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            {LABEL_FILTRO[tab]}
          </Link>
        ))}
      </div>

      {/* Búsqueda */}
      <form
        method="GET"
        action="/admin/ofertas"
        className="mt-4 flex gap-3"
      >
        <input type="hidden" name="estado" value={estado} />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por título…"
          className="h-9 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Buscar
        </button>
        {q && (
          <Link
            href={buildHref({ estado })}
            className="flex h-9 items-center px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* Resultados */}
      {rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          {q
            ? "No se encontraron ofertas con ese título."
            : `No hay ofertas ${LABEL_FILTRO[estado].toLowerCase()} en este momento.`}
        </p>
      ) : (
        <>
          {/* Tabla desktop */}
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-3 pr-4 font-medium text-muted-foreground">
                    Título
                  </th>
                  <th className="py-3 pr-4 font-medium text-muted-foreground">
                    Empresa
                  </th>
                  <th className="py-3 pr-4 font-medium text-muted-foreground">
                    Enviada
                  </th>
                  <th className="py-3 pr-4 font-medium text-muted-foreground">
                    Estado
                  </th>
                  <th className="py-3 font-medium text-muted-foreground" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-4 pr-4 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {row.titulo}
                        {row.contenido_editado_en && (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Modificada
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-muted-foreground">
                      {row.empresa_nombre}
                    </td>
                    <td className="py-4 pr-4 text-muted-foreground">
                      {formatFechaCorta(row.created_at)}
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_STYLE[row.estado as EstadoFiltro] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {getOfertaEstadoLabel(row.estado)}
                      </span>
                    </td>
                    <td className="py-4">
                      <Link
                        href={`/admin/ofertas/${row.id}`}
                        className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-tinted"
                      >
                        Ver oferta
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards mobile */}
          <div className="mt-4 space-y-3 md:hidden">
            {rows.map((row) => (
              <div
                key={row.id}
                className="rounded-[var(--radius-lg)] border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{row.titulo}</p>
                    {row.contenido_editado_en && (
                      <span className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Modificada
                      </span>
                    )}
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_STYLE[row.estado as EstadoFiltro] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {getOfertaEstadoLabel(row.estado)}
                  </span>
                </div>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex gap-2">
                    <dt className="w-20 flex-shrink-0 text-muted-foreground">
                      Empresa
                    </dt>
                    <dd className="text-foreground">{row.empresa_nombre}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 flex-shrink-0 text-muted-foreground">
                      Enviada
                    </dt>
                    <dd className="text-muted-foreground">
                      {formatFechaCorta(row.created_at)}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4">
                  <Link
                    href={`/admin/ofertas/${row.id}`}
                    className="inline-flex h-9 items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-tinted"
                  >
                    Ver oferta
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Mostrando {from + 1}–{Math.min(to + 1, total)} de {total}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={buildHref({
                      estado,
                      q: q || undefined,
                      page: page - 1,
                    })}
                    className="inline-flex h-9 items-center rounded-lg border border-border px-4 text-foreground transition-colors hover:bg-surface-tinted"
                  >
                    Anterior
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={buildHref({
                      estado,
                      q: q || undefined,
                      page: page + 1,
                    })}
                    className="inline-flex h-9 items-center rounded-lg border border-border px-4 text-foreground transition-colors hover:bg-surface-tinted"
                  >
                    Siguiente
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
