import { Suspense } from "react";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import { JobCard } from "@/components/public/job-card";
import { EmptyJobResults } from "@/components/public/empty-job-results";
import { Buscador } from "@/components/ui/buscador";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio } from "@/components/ui/estado-listado";
import { Esqueleto, EsqueletoTarjeta } from "@/components/ui/esqueleto";
import {
  MODALIDADES,
  buscarOfertasPublicas,
  type FiltrosOfertasPublicas,
  type ResultadoOfertasPublicas,
} from "@/lib/ofertas";
import { hrefConParams, type ParamsUrl } from "@/lib/paginacion";
import { esOficinaActiva, obtenerUsuarioActual } from "@/lib/auth";
import { rutaBuscarPostulantes } from "@/lib/invitaciones";

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
    filtros.categoria !== null || filtros.modalidad !== null;
  const hrefLimpiar = hrefConParams(
    ruta,
    searchParams,
    { categoria: null, modalidad: null, pagina: null },
    ANCLA,
  );
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
    <section id={ANCLA} className="scroll-mt-20">
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
      <div className="tarjeta mt-6 rounded-[var(--radius-ofertas)] border-ofertas-border bg-white p-[clamp(1rem,2.5vw,2rem)]">
        {/* Main Search Input */}
        <Buscador
          placeholder="Buscar por puesto, empresa, palabra clave o conocimiento..."
          inputClassName="rounded-full border-ofertas-border-strong bg-ofertas-background placeholder:text-ofertas-secondary focus:border-ofertas-primary focus:bg-white focus:ring-3 focus:ring-ofertas-primary/15"
        />

        {/* Categories / Rubros Pills */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-ofertas-heading">Rubro o Sector:</span>
            {hasActiveFilters && (
              <Link
                href={hrefLimpiar}
                className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-ofertas-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ofertas-primary/40"
              >
                Limpiar filtros
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {rubroOptions.map((rubro) => {
              const isSelected = filtros.categoria === rubro.valor;
              return (
                <Link
                  key={rubro.label}
                  href={hrefFiltro({ categoria: rubro.valor })}
                  scroll={false}
                  aria-current={isSelected ? "true" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-full px-4 py-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ofertas-primary/40 ${
                    isSelected
                      ? "bg-ofertas-primary text-white shadow-xs"
                      : "border border-ofertas-border bg-white text-ofertas-secondary hover:border-ofertas-primary hover:text-ofertas-primary"
                  }`}
                >
                  {rubro.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Modality Filter Pills */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ofertas-border pt-3 text-sm">
          <span className="mr-1 font-semibold text-ofertas-heading">Modalidad:</span>
          {modalidadOptions.map((mod) => {
            const isSelected = filtros.modalidad === mod.valor;
            return (
              <Link
                key={mod.label}
                href={hrefFiltro({ modalidad: mod.valor })}
                scroll={false}
                aria-current={isSelected ? "true" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full px-4 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ofertas-primary/40 ${
                  isSelected
                    ? "bg-ofertas-active font-medium text-white"
                    : "border border-ofertas-border bg-white text-ofertas-secondary hover:border-ofertas-primary hover:text-ofertas-primary"
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
          filtros={filtros}
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
      <span className="inline-flex h-2 w-2 rounded-full bg-success" />
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
  filtros,
}: {
  resultado: Promise<ResultadoOfertasPublicas>;
  ruta: string;
  searchParams: ParamsUrl;
  filtros: FiltrosOfertasPublicas;
}) {
  const [datos, usuario] = await Promise.all([resultado, obtenerUsuarioActual()]);
  // buscar_ofertas_publicas solo devuelve ofertas activas y vigentes: la
  // oficina puede buscar postulantes para cualquiera de ellas.
  const esOficina = esOficinaActiva(usuario);
  // La búsqueda vuelve a esta misma vista: el listado con sus filtros, o el inicio.
  const volver = ruta === "/" ? "/" : hrefConParams(ruta, searchParams);

  if (!datos.ok) {
    return (
      <EmptyJobResults variant="error" refError={datos.refError} />
    );
  }

  if (datos.ofertas.length === 0) {
    const hayBusqueda = filtros.q !== "";
    const hayFiltros = filtros.categoria !== null || filtros.modalidad !== null;

    if (!hayBusqueda && !hayFiltros) {
      return (
        <EstadoVacio
          tipo="sin-registros"
          className="mt-8"
          icono={Briefcase}
          titulo="Todavía no hay ofertas publicadas"
          descripcion="Cuando las empresas de la ciudad publiquen búsquedas, van a aparecer en este espacio."
        />
      );
    }

    return (
      <EmptyJobResults
        variant={
          hayBusqueda && hayFiltros
            ? "busqueda-filtros"
            : hayBusqueda
              ? "busqueda"
              : "filtros"
        }
        ruta={ruta}
        searchParams={searchParams}
        filtros={filtros}
      />
    );
  }

  return (
    <>
      <div className="mt-6 grid auto-rows-fr grid-cols-1 gap-5 md:grid-cols-2">
        {datos.ofertas.map((oferta) => (
          <JobCard
            key={oferta.id}
            oferta={oferta}
            hrefBuscarPostulantes={esOficina ? rutaBuscarPostulantes(oferta.id, { volver }) : null}
          />
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
