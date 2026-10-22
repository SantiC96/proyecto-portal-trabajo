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
import { ContadoresEstado, PestanasEstado } from "@/components/ui/pestanas-estado";
import { Badge, type TonoBadge } from "@/components/ui/badge";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import type { Enum, Tabla } from "@/types/db";
import { requerirRolPagina } from "@/lib/auth";
import { BotonVolver } from "@/components/ui/boton-volver";

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

type EstadoVisible = Enum<"estado_oferta"> | "vencida";

const ESTADO_TONO: Record<EstadoVisible, TonoBadge> = {
  borrador: "neutral",
  pendiente_aprobacion: "warning",
  activa: "success",
  vencida: "danger",
  rechazada: "danger",
  cerrada: "neutral",
};

type OfertaRow = Pick<Tabla<"ofertas">, "estado" | "vence_en">;

const RUTA = "/admin/ofertas";

export default async function AdminOfertasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string; pagina?: string }>;
}) {
  await requerirRolPagina("municipalidad");
  const sp = await searchParams;

  const estado: EstadoFiltro =
    ESTADOS_FILTRO.find((e) => e === sp.estado) ?? "pendiente_aprobacion";

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
      <BotonVolver href="/admin">Volver al panel</BotonVolver>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Ofertas
      </h1>

      <ContadoresEstado
        className="mt-6"
        contadores={[
          { label: "Pendientes", valor: cPendientes ?? 0, tono: "warning" },
          { label: "Activas", valor: cActivas ?? 0, tono: "success" },
          { label: "Vencidas", valor: cVencidas ?? 0, tono: "danger" },
          { label: "Rechazadas", valor: cRechazadas ?? 0, tono: "danger" },
          { label: "Cerradas", valor: cCerradas ?? 0, tono: "neutral" },
        ]}
      />

      <PestanasEstado
        className="mt-6"
        etiqueta="Estado de las ofertas"
        pestanas={ESTADOS_FILTRO.map((tab) => ({
          href: hrefConParams(RUTA, {}, { estado: tab, q: sp.q ?? null }),
          label: LABEL_FILTRO[tab],
          activa: tab === estado,
        }))}
      />

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

  const resultado = await consultarPagina(pagina, (desde, hasta) => {
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
      .range(desde, hasta);
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
                          <Badge tono="info">Modificada</Badge>
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
                      <Badge tono={ESTADO_TONO[estadoVisible(row)] ?? "neutral"} estado>
                        {etiquetaEstado(row)}
                      </Badge>
                    </td>
                    <td className="py-4">
                      <Link
                        href={`/admin/ofertas/${row.id}`}
                        className="btn-neutro whitespace-nowrap"
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
                      <Badge tono="info" className="mt-1">Modificada</Badge>
                    )}
                    <VencimientoOferta
                      className="mt-1"
                      estado={row.estado}
                      venceEn={row.vence_en}
                    />
                  </div>
                  <Badge tono={ESTADO_TONO[estadoVisible(row)] ?? "neutral"} estado>
                    {etiquetaEstado(row)}
                  </Badge>
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

function estadoVisible(row: OfertaRow): EstadoVisible {
  if (estadoVencimiento(row.estado, row.vence_en).vencida) return "vencida";
  return row.estado;
}

function etiquetaEstado(row: OfertaRow): string {
  return estadoVisible(row) === "vencida" ? "Vencida" : getOfertaEstadoLabel(row.estado);
}
