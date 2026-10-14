import { Suspense } from "react";
import Link from "next/link";
import { Briefcase, Filter } from "lucide-react";
import { JobCard } from "@/components/public/job-card";
import { Buscador } from "@/components/ui/buscador";
import { Paginacion } from "@/components/ui/paginacion";
import { ErrorListado } from "@/components/ui/estado-listado";
import { Esqueleto, EsqueletoTarjeta } from "@/components/ui/esqueleto";
import {
  MODALIDADES,
  buscarOfertasPublicas,
  type FiltrosOfertasPublicas,
  type ResultadoOfertasPublicas,
} from "@/lib/ofertas";
import { hrefConParams, type ParamsUrl } from "@/lib/paginacion";

const ANCLA = "ofertas";

interface JobDirectoryProps {
  ruta: string;
  searchParams: ParamsUrl;
  categorias: string[];
  filtros: FiltrosOfertasPublicas;
}

export function JobDirectory({ ruta, searchParams, categorias, filtros }: JobDirectoryProps) {
  // Una sola consulta compartida por el contador del encabezado y la grilla.
  const resultado = buscarOfertasPublicas(filtros);
  // La clave cambia con cada búsqueda/página: el Suspense se vuelve a montar y
  // muestra el esqueleto mientras llega el resultado nuevo.
  const clave = JSON.stringify(filtros);

  const hasActiveFilters =
    filtros.q !== "" || filtros.categoria !== null || filtros.modalidad !== null;
  const hrefLimpiar = hrefConParams(ruta, {}, {}, ANCLA);
  const hrefFiltro = (cambios: Record<string, string | null>) =>
    hrefConParams(ruta, searchParams, { ...cambios, pagina: null });

  const rubroOptions: Array<{ label: string; valor: string | null }> = [
    { label: "Todos", valor: null },
    ...categorias.map((c) => ({ label: c, valor: c })),
  ];
  const modalidadOptions: Array<{ label: string; valor: string | null }> = [
    { label: "Todas", valor: null },
    ...MODALIDADES.map((m) => ({ label: m, valor: m })),
  ];

  return (
    <section id={ANCLA} className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16 scroll-mt-20">
      {/* Section Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-xs font-bold tracking-wider text-primary uppercase">
            Búsquedas activas en Funes
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Ofertas laborales publicadas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Explorá las vacantes vigentes de comercios, empresas e industrias de la ciudad.
          </p>
        </div>

        <Suspense key={clave} fallback={<Esqueleto className="mt-2 h-4 w-32 md:mt-0" />}>
          <ContadorOfertas resultado={resultado} />
        </Suspense>
      </div>

      {/* Search and Filters Bar */}
      <div className="mt-6 rounded-2xl border border-border bg-white p-4 shadow-xs">
        {/* Main Search Input */}
        <Buscador
          placeholder="Buscar por puesto, empresa, palabra clave o conocimiento..."
          inputClassName="rounded-xl bg-background/60 placeholder:text-muted-foreground/70 focus:border-primary focus:bg-white focus:ring-3 focus:ring-primary/15"
        />

        {/* Categories / Rubros Pills (Mobile horizontal scroll) */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Rubro o Sector:</span>
            {hasActiveFilters && (
              <Link
                href={hrefLimpiar}
                className="text-xs font-medium text-primary hover:underline"
              >
                Limpiar filtros
              </Link>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            {rubroOptions.map((rubro) => {
              const isSelected = filtros.categoria === rubro.valor;
              return (
                <Link
                  key={rubro.label}
                  href={hrefFiltro({ categoria: rubro.valor })}
                  scroll={false}
                  aria-current={isSelected ? "true" : undefined}
                  className={`shrink-0 rounded-lg px-3 py-1.5 font-medium transition-all ${
                    isSelected
                      ? "bg-primary text-white shadow-xs"
                      : "border border-border bg-white text-muted-foreground-strong hover:border-primary hover:text-primary"
                  }`}
                >
                  {rubro.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Modality Filter Pills */}
        <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-border/60 text-xs">
          <span className="font-semibold text-foreground">Modalidad:</span>
          {modalidadOptions.map((mod) => {
            const isSelected = filtros.modalidad === mod.valor;
            return (
              <Link
                key={mod.label}
                href={hrefFiltro({ modalidad: mod.valor })}
                scroll={false}
                aria-current={isSelected ? "true" : undefined}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  isSelected
                    ? "bg-foreground text-white font-medium"
                    : "bg-surface-tinted text-muted-foreground-strong hover:bg-secondary-hover"
                }`}
              >
                {mod.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Job Cards Grid */}
      <Suspense key={clave} fallback={<EsqueletoResultados />}>
        <ResultadosOfertas
          resultado={resultado}
          ruta={ruta}
          searchParams={searchParams}
          hrefLimpiar={hrefLimpiar}
          hayFiltros={hasActiveFilters}
        />
      </Suspense>
    </section>
  );
}

async function ContadorOfertas({ resultado }: { resultado: Promise<ResultadoOfertasPublicas> }) {
  const datos = await resultado;
  if (!datos.ok) return null;
  return (
    <div className="mt-2 flex items-center gap-2 text-xs font-medium text-muted-foreground-strong md:mt-0">
      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      <span>
        {datos.total} {datos.total === 1 ? "oferta disponible" : "ofertas disponibles"}
      </span>
    </div>
  );
}

async function ResultadosOfertas({
  resultado,
  ruta,
  searchParams,
  hrefLimpiar,
  hayFiltros,
}: {
  resultado: Promise<ResultadoOfertasPublicas>;
  ruta: string;
  searchParams: ParamsUrl;
  hrefLimpiar: string;
  hayFiltros: boolean;
}) {
  const datos = await resultado;

  if (!datos.ok) {
    return (
      <ErrorListado
        className="mt-8"
        mensaje="No pudimos cargar las ofertas. Intentá de nuevo en unos minutos."
        refError={datos.refError}
      />
    );
  }

  if (datos.ofertas.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-border bg-white p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-muted-foreground">
          {hayFiltros ? <Filter className="h-6 w-6" /> : <Briefcase className="h-6 w-6" />}
        </div>
        {hayFiltros ? (
          <>
            <h3 className="mt-3 text-base font-bold text-foreground">
              No encontramos ofertas con esos criterios
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Probá quitando o modificando los filtros aplicados o buscando un término más general.
            </p>
            <Link
              href={hrefLimpiar}
              className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-hover"
            >
              Ver todas las ofertas
            </Link>
          </>
        ) : (
          <>
            <h3 className="mt-3 text-base font-bold text-foreground">
              Todavía no hay ofertas publicadas
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Cuando las empresas de la ciudad publiquen búsquedas, van a aparecer en este espacio.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 grid auto-rows-fr grid-cols-1 gap-5 md:grid-cols-2">
        {datos.ofertas.map((oferta) => (
          <JobCard key={oferta.id} oferta={oferta} />
        ))}
      </div>
      <Paginacion
        className="mt-8"
        ruta={ruta}
        searchParams={searchParams}
        pagina={datos.pagina}
        total={datos.total}
        ancla={ANCLA}
      />
    </>
  );
}

function EsqueletoResultados() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2" aria-busy="true">
      {Array.from({ length: 4 }, (_, i) => (
        <EsqueletoTarjeta key={i} className="rounded-2xl p-5" />
      ))}
    </div>
  );
}
