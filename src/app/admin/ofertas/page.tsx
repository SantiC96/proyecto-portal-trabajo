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
import { PestanasEstado } from "@/components/ui/pestanas-estado";
import { Badge, type TonoBadge } from "@/components/ui/badge";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import {
  CLASE_ACCION_FILA,
  CeldaTabla,
  FilaTabla,
  Tabla as TablaListado,
} from "@/components/ui/tabla";
import type { Enum, Tabla } from "@/types/db";
import { requerirRolPagina } from "@/lib/auth";

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
  pendiente_aprobacion: "Por revisar",
  activa: "Activas",
  vencida: "Vencidas",
  rechazada: "Rechazadas",
  cerrada: "Cerradas",
};

const TEXTO_VACIO: Record<EstadoFiltro, string> = {
  pendiente_aprobacion: "No hay ofertas por revisar en este momento.",
  activa: "No hay ofertas activas en este momento.",
  vencida: "No hay ofertas vencidas en este momento.",
  rechazada: "No hay ofertas rechazadas en este momento.",
  cerrada: "No hay ofertas cerradas en este momento.",
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

  const cantidades: Record<EstadoFiltro, number> = {
    pendiente_aprobacion: cPendientes ?? 0,
    activa: cActivas ?? 0,
    vencida: cVencidas ?? 0,
    rechazada: cRechazadas ?? 0,
    cerrada: cCerradas ?? 0,
  };

  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Ofertas"
        bajada="Revisá las ofertas que cargan las empresas antes de publicarlas."
      />

      <PestanasEstado
        etiqueta="Estado de las ofertas"
        pestanas={ESTADOS_FILTRO.map((tab) => ({
          href: hrefConParams(RUTA, {}, { estado: tab, q: sp.q ?? null }),
          label: LABEL_FILTRO[tab],
          activa: tab === estado,
          cantidad: cantidades[tab],
        }))}
      />

      <Buscador
        className="min-w-0 lg:max-w-xl"
        inputClassName="rounded-xl"
        placeholder="Buscar por título…"
      />

      <Suspense key={JSON.stringify({ estado, q, pagina })} fallback={<EsqueletoLista filas={5} />}>
        <ListadoOfertas estado={estado} q={q} pagina={pagina} searchParams={sp} />
      </Suspense>
    </section>
  );
}

type EtiquetaRevision = { texto: string; tono: TonoBadge };

/**
 * Qué tipo de envío es una oferta por revisar, deducido de sus columnas:
 * - contenido_editado_en vacío: nunca se editó después de enviarla (los
 *   cambios de un borrador no cuentan, migration_051) → "Nueva".
 * - editada y con publicado_en: ya estuvo publicada → "Modificada".
 * - editada y nunca publicada: una oferta pendiente no se puede editar
 *   (migration_024), así que solo pudo editarse después de un rechazo → "Corregida".
 */
function etiquetaRevision(row: {
  contenido_editado_en: string | null;
  publicado_en: string | null;
}): EtiquetaRevision {
  if (!row.contenido_editado_en) return { texto: "Nueva", tono: "teal" };
  if (row.publicado_en) return { texto: "Modificada", tono: "info" };
  return { texto: "Corregida", tono: "info" };
}

// Oferta | Empresa | Fecha | Estado | acción.
const COLUMNAS = "minmax(0,2.2fr) minmax(0,1.4fr) 7.5rem minmax(0,1.3fr) auto";

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
        "id, titulo, empresa_nombre, created_at, estado, contenido_editado_en, publicado_en, vence_en",
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
    return <ErrorListado refError={ref} />;
  }

  const rows = resultado.filas;

  if (rows.length === 0) {
    return q ? (
      <EstadoVacio
        tipo="sin-resultados"
        titulo="No se encontraron ofertas con ese título"
        hrefLimpiar={hrefConParams(RUTA, {}, { estado })}
        textoLimpiar="Limpiar búsqueda"
      />
    ) : (
      <EstadoVacio tipo="sin-registros" icono={Briefcase} titulo={TEXTO_VACIO[estado]} />
    );
  }

  const porRevisar = estado === "pendiente_aprobacion";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground-strong" aria-live="polite">
        Mostrando {rows.length} de {resultado.total} {resultado.total === 1 ? "oferta" : "ofertas"}
      </p>

      <TablaListado
        columnas={COLUMNAS}
        etiqueta="Ofertas"
        encabezados={["Oferta", "Empresa", "Fecha", "Estado", ""]}
      >
        {rows.map((row) => {
          const href = `/admin/ofertas/${row.id}`;
          const etiqueta = porRevisar ? etiquetaRevision(row) : null;
          return (
            <FilaTabla key={row.id}>
              <div className="flex min-w-0 flex-col items-start gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={href}
                    className="rounded-[var(--radius-sm)] text-[15px] leading-snug font-bold break-words text-heading no-underline outline-none hover:text-primary hover:underline focus-visible:shadow-[var(--sombra-foco)]"
                  >
                    {row.titulo}
                  </Link>
                  {etiqueta && <Badge tono={etiqueta.tono}>{etiqueta.texto}</Badge>}
                </div>
                <VencimientoOferta estado={row.estado} venceEn={row.vence_en} />
              </div>
              <CeldaTabla etiqueta="Empresa" rotuloVisible>
                {row.empresa_nombre}
              </CeldaTabla>
              <CeldaTabla etiqueta="Fecha" rotuloVisible className="tabular-nums">
                {formatFechaCorta(row.created_at)}
              </CeldaTabla>
              <CeldaTabla etiqueta="Estado">
                <Badge tono={ESTADO_TONO[estadoVisible(row)] ?? "neutral"} estado>
                  {etiquetaEstado(row)}
                </Badge>
              </CeldaTabla>
              <Link href={href} className={`btn-neutro ${CLASE_ACCION_FILA}`}>
                Revisar
                <span className="sr-only">: {row.titulo}</span>
              </Link>
            </FilaTabla>
          );
        })}
      </TablaListado>

      <Paginacion
        className="mt-2"
        ruta={RUTA}
        searchParams={searchParams}
        pagina={resultado.pagina}
        total={resultado.total}
        variante="numeros"
      />
    </div>
  );
}

function estadoVisible(row: OfertaRow): EstadoVisible {
  if (estadoVencimiento(row.estado, row.vence_en).vencida) return "vencida";
  return row.estado;
}

function etiquetaEstado(row: OfertaRow): string {
  return estadoVisible(row) === "vencida" ? "Vencida" : getOfertaEstadoLabel(row.estado);
}
