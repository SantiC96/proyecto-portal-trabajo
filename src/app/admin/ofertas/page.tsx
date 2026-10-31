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
import { inicialesDeEmpresa } from "@/lib/iniciales";
import {
  consultarPagina,
  hrefConParams,
  leerPagina,
  type ParamsUrl,
} from "@/lib/paginacion";
import {
  ESTADOS_FILTRO_ADMIN,
  aplicarFiltroOfertasAdmin,
  leerEstadoFiltroAdmin,
  type EstadoFiltroAdmin,
} from "@/lib/admin/filtro-ofertas";
import { Buscador } from "@/components/ui/buscador";
import { PastillaFiltro } from "@/components/ui/pastilla-filtro";
import { Badge, type TonoBadge } from "@/components/ui/badge";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import {
  CLASE_ACCION_FILA,
  CeldaPersona,
  FilaTabla,
  Tabla as TablaListado,
} from "@/components/ui/tabla";
import type { Enum, Tabla } from "@/types/db";
import { requerirRolPagina } from "@/lib/auth";
import { BotonVolver } from "@/components/ui/boton-volver";

export const metadata: Metadata = {
  title: "Ofertas | Panel municipal | Portal de Empleo Funes",
};

const LABEL_FILTRO: Record<EstadoFiltroAdmin, string> = {
  pendiente_aprobacion: "Por revisar",
  activa: "Activas",
  vencida: "Vencidas",
  rechazada: "Rechazadas",
  cerrada: "Cerradas",
};

const TEXTO_VACIO: Record<EstadoFiltroAdmin, string> = {
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

// Filete izquierdo de la fila: el color del estado.
const ESTADO_FILETE: Record<EstadoVisible, string> = {
  borrador: "before:bg-neutral",
  pendiente_aprobacion: "before:bg-accent",
  activa: "before:bg-primary",
  vencida: "before:bg-danger",
  rechazada: "before:bg-danger",
  cerrada: "before:bg-neutral",
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

  const estado = leerEstadoFiltroAdmin(sp.estado);
  const q = limpiarBusqueda(sp.q);
  const pagina = leerPagina(sp.pagina);

  const supabase = await createSupabaseServerClient();

  // Mismo instante y misma búsqueda para las cantidades y la lista.
  const ahora = dentroDeDiasISO(0);
  const patron = q ? patronIlike(q) : null;
  const conteos = await Promise.all(
    ESTADOS_FILTRO_ADMIN.map((e) =>
      aplicarFiltroOfertasAdmin(
        supabase.from("ofertas").select("*", { count: "exact", head: true }),
        e,
        ahora,
        patron,
      ),
    ),
  );
  const cantidades = Object.fromEntries(
    ESTADOS_FILTRO_ADMIN.map((e, i) => [e, conteos[i].count ?? 0]),
  ) as Record<EstadoFiltroAdmin, number>;

  return (
    <section className="flex flex-col gap-6">
      <BotonVolver href="/admin" destacado />
      <EncabezadoPagina
        banda
        className="-mt-2"
        botonesBlancos
        titulo="Ofertas"
        bajada="Revisá las ofertas que cargan las empresas antes de publicarlas."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <nav aria-label="Estado de las ofertas" className="min-w-0">
          <div className="sin-barra-scroll -mx-4 -my-1 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {ESTADOS_FILTRO_ADMIN.map((tab) => (
              <PastillaFiltro
                key={tab}
                href={hrefConParams(RUTA, {}, { estado: tab, q: sp.q ?? null })}
                activa={tab === estado}
                cantidad={cantidades[tab]}
              >
                {LABEL_FILTRO[tab]}
              </PastillaFiltro>
            ))}
          </div>
        </nav>

        <Buscador
          className="w-full min-w-0 lg:w-80 lg:shrink-0"
          inputClassName="rounded-xl"
          placeholder="Buscar por título…"
        />
      </div>

      <Suspense key={JSON.stringify({ estado, q, pagina })} fallback={<EsqueletoLista filas={5} />}>
        <ListadoOfertas
          estado={estado}
          q={q}
          patron={patron}
          ahora={ahora}
          pagina={pagina}
          searchParams={sp}
        />
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
const COLUMNAS =
  "minmax(0,2fr) minmax(0,1.3fr) minmax(max-content,.8fr) minmax(0,1.1fr) minmax(max-content,.6fr)";

const CLASE_TITULO =
  "rounded-[var(--radius-sm)] text-[15px] leading-snug font-extrabold break-words text-heading no-underline outline-none hover:text-primary hover:underline focus-visible:shadow-[var(--sombra-foco)]";

async function ListadoOfertas({
  estado,
  q,
  patron,
  ahora,
  pagina,
  searchParams,
}: {
  estado: EstadoFiltroAdmin;
  q: string;
  patron: string | null;
  ahora: string;
  pagina: number;
  searchParams: ParamsUrl;
}) {
  const supabase = await createSupabaseServerClient();
  // Pendientes: de más vieja a más nueva (más urgentes primero)
  const ascendente = estado === "pendiente_aprobacion";

  const resultado = await consultarPagina(pagina, (desde, hasta) =>
    aplicarFiltroOfertasAdmin(
      supabase
        .from("ofertas")
        .select(
          "id, titulo, empresa_id, empresa_nombre, created_at, estado, contenido_editado_en, publicado_en, vence_en",
          { count: "exact" },
        ),
      estado,
      ahora,
      patron,
    )
      .order("created_at", { ascending: ascendente })
      .order("id", { ascending: ascendente })
      .range(desde, hasta),
  );

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
      <TablaListado
        columnas={COLUMNAS}
        etiqueta="Ofertas"
        semantica="tabla"
        encabezados={[
          "Oferta",
          "Empresa",
          "Fecha",
          "Estado",
          <span key="a" className="sr-only">
            Acciones
          </span>,
        ]}
      >
        {rows.map((row) => {
          const href = `/admin/ofertas/${row.id}`;
          const etiqueta = porRevisar ? etiquetaRevision(row) : null;
          const visible = estadoVisible(row);
          return (
            <FilaTabla key={row.id} semantica="tabla" filete={ESTADO_FILETE[visible]}>
              <div role="cell" className="flex min-w-0 flex-col items-start gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={href} className={CLASE_TITULO}>
                    {row.titulo}
                  </Link>
                  {etiqueta && <Badge tono={etiqueta.tono}>{etiqueta.texto}</Badge>}
                </div>
                <VencimientoOferta estado={row.estado} venceEn={row.vence_en} />
              </div>
              <div role="cell" className="min-w-0">
                <CeldaPersona
                  nombre={row.empresa_nombre}
                  href={row.empresa_id ? `/admin/empresas/${row.empresa_id}` : undefined}
                  iniciales={inicialesDeEmpresa(row.empresa_nombre)}
                  secundario={null}
                />
              </div>
              <div
                role="cell"
                className="text-sm whitespace-nowrap text-muted-foreground-strong tabular-nums @4xl:text-[15px] @4xl:text-foreground"
              >
                <span className="font-bold text-neutral @4xl:sr-only">Fecha </span>
                {formatFechaCorta(row.created_at)}
              </div>
              {/* En la tarjeta, el estado va arriba de todo. */}
              <div role="cell" className="order-first min-w-0 @4xl:order-none">
                <Badge tono={ESTADO_TONO[visible] ?? "neutral"} estado>
                  {etiquetaEstado(row)}
                </Badge>
              </div>
              <div role="cell" className="@4xl:text-right">
                <Link
                  href={href}
                  aria-label={`Revisar ${row.titulo}`}
                  className={`btn-secundario ${CLASE_ACCION_FILA}`}
                >
                  Revisar
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
        pagina={resultado.pagina}
        total={resultado.total}
        variante="numeros"
        elemento={{ singular: "oferta", plural: "ofertas" }}
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
