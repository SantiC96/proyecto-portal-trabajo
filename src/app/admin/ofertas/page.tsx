import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { dentroDeDiasISO, formatFechaCorta } from "@/lib/fechas";
import { VencimientoOferta } from "@/components/ofertas/vencimiento-oferta";
import { estadoVencimiento } from "@/lib/ofertas-vencimiento";
import { getOfertaEstadoLabel } from "@/lib/oferta-estados";
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

export const metadata: Metadata = {
  title: "Ofertas | Panel municipal | Portal de Empleo Funes",
};

// "vencida" no es un estado de la base: es una oferta 'activa' con vence_en
// vencido (migration_036). Se muestra aparte porque ya no se ve en el portal.
type EstadoFiltro = "pendiente_aprobacion" | "activa" | "vencida" | "rechazada" | "cerrada";

const ESTADOS_FILTRO: EstadoFiltro[] = [
  "pendiente_aprobacion",
  "activa",
  "vencida",
  "rechazada",
  "cerrada",
];

const LABEL_FILTRO: Record<EstadoFiltro, string> = {
  pendiente_aprobacion: "Pendientes",
  activa: "Activas",
  vencida: "Vencidas",
  rechazada: "Rechazadas",
  cerrada: "Cerradas",
};

const ESTADO_STYLE: Record<EstadoFiltro, string> = {
  pendiente_aprobacion: "bg-amber-100 text-amber-800",
  activa: "bg-emerald-100 text-emerald-800",
  vencida: "bg-red-100 text-red-700",
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
  vence_en: string | null;
};

const RUTA = "/admin/ofertas";

export default async function AdminOfertasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string; pagina?: string }>;
}) {
  const sp = await searchParams;

  const estado: EstadoFiltro = ESTADOS_FILTRO.includes(
    sp.estado as EstadoFiltro
  )
    ? (sp.estado as EstadoFiltro)
    : "pendiente_aprobacion";

  const q = limpiarBusqueda(sp.q);
  const pagina = leerPagina(sp.pagina);

  const supabase = await createSupabaseServerClient();

  const ahora = dentroDeDiasISO(0);
  const [
    { count: cPendientes },
    { count: cActivas },
    { count: cVencidas },
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
      .eq("estado", "activa")
      .gt("vence_en", ahora),
    supabase
      .from("ofertas")
      .select("*", { count: "exact", head: true })
      .eq("estado", "activa")
      .lte("vence_en", ahora),
    supabase
      .from("ofertas")
      .select("*", { count: "exact", head: true })
      .eq("estado", "rechazada"),
    supabase
      .from("ofertas")
      .select("*", { count: "exact", head: true })
      .eq("estado", "cerrada"),
  ]);

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
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
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
          <p className="text-xs font-medium text-muted-foreground">Vencidas</p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {cVencidas ?? 0}
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
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-[var(--radius-md)] border border-border bg-surface p-1">
        {ESTADOS_FILTRO.map((tab) => (
          <Link
            key={tab}
            href={hrefConParams(RUTA, {}, { estado: tab, q: sp.q ?? null })}
            className={
              tab === estado
                ? "flex-1 whitespace-nowrap rounded-[var(--radius-sm)] bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground"
                : "flex-1 whitespace-nowrap rounded-[var(--radius-sm)] px-3 py-2 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            {LABEL_FILTRO[tab]}
          </Link>
        ))}
      </div>

      {/* Búsqueda */}
      <Buscador className="mt-4" placeholder="Buscar por título…" />

      {/* Resultados */}
      <Suspense
        key={JSON.stringify({ estado, q, pagina })}
        fallback={<EsqueletoLista filas={5} className="mt-4" />}
      >
        <ListadoOfertas estado={estado} q={q} pagina={pagina} searchParams={sp} />
      </Suspense>
    </section>
  );
}

async function ListadoOfertas({
  estado,
  q,
  pagina,
  searchParams,
}: {
  estado: EstadoFiltro;
  q: string;
  pagina: number;
  searchParams: ParamsUrl;
}) {
  const supabase = await createSupabaseServerClient();
  // Pendientes: de más vieja a más nueva (más urgentes primero)
  const ascendente = estado === "pendiente_aprobacion";

  const resultado = await consultarPagina<OfertaRow>(pagina, (desde, hasta) => {
    let query = supabase
      .from("ofertas")
      .select(
        "id, titulo, empresa_nombre, created_at, estado, contenido_editado_en, vence_en",
        { count: "exact" }
      );
    if (estado === "activa") {
      query = query.eq("estado", "activa").gt("vence_en", dentroDeDiasISO(0));
    } else if (estado === "vencida") {
      query = query.eq("estado", "activa").lte("vence_en", dentroDeDiasISO(0));
    } else {
      query = query.eq("estado", estado);
    }
    if (q) query = query.ilike("titulo", patronIlike(q));
    return query
      .order("created_at", { ascending: ascendente })
      .order("id", { ascending: ascendente })
      .range(desde, hasta)
      .overrideTypes<OfertaRow[], { merge: false }>();
  });

  if (!resultado.ok) {
    const ref = logError("admin_ofertas_listado", resultado.error, { estado });
    return <ErrorListado className="mt-4" refError={ref} />;
  }

  const rows = resultado.filas;

  if (rows.length === 0) {
    return q ? (
      <EstadoVacio
        tipo="sin-resultados"
        className="mt-4"
        titulo="No se encontraron ofertas con ese título"
        hrefLimpiar={hrefConParams(RUTA, {}, { estado })}
        textoLimpiar="Limpiar búsqueda"
      />
    ) : (
      <EstadoVacio
        tipo="sin-registros"
        className="mt-4"
        icono={Briefcase}
        titulo={`No hay ofertas ${LABEL_FILTRO[estado].toLowerCase()} en este momento.`}
      />
    );
  }

  return (
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
                      <VencimientoOferta
                        className="mt-1 font-normal"
                        estado={row.estado}
                        venceEn={row.vence_en}
                      />
                    </td>
                    <td className="py-4 pr-4 text-muted-foreground">
                      {row.empresa_nombre}
                    </td>
                    <td className="py-4 pr-4 text-muted-foreground">
                      {formatFechaCorta(row.created_at)}
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_STYLE[estadoVisible(row)] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {etiquetaEstado(row)}
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
                    <VencimientoOferta
                      className="mt-1"
                      estado={row.estado}
                      venceEn={row.vence_en}
                    />
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_STYLE[estadoVisible(row)] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {etiquetaEstado(row)}
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

function estadoVisible(row: OfertaRow): EstadoFiltro {
  if (estadoVencimiento(row.estado, row.vence_en).vencida) return "vencida";
  return row.estado as EstadoFiltro;
}

function etiquetaEstado(row: OfertaRow): string {
  return estadoVisible(row) === "vencida" ? "Vencida" : getOfertaEstadoLabel(row.estado);
}
