import Link from "next/link";
import { Briefcase, Filter } from "lucide-react";

/**
 * Estado vacío del listado de ofertas (/ofertas): sin resultados para los
 * filtros, o todavía sin ofertas publicadas. Está aislado para poder
 * rediseñarlo sin tocar el resto de la pantalla.
 */
export function OfertasSinResultados({
  hayFiltros,
  hrefLimpiar,
}: {
  /** Hay búsqueda, rubro o modalidad activos. */
  hayFiltros: boolean;
  /** El listado sin filtros (para "Ver todas las ofertas"). */
  hrefLimpiar: string;
}) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-border bg-white p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
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
            className="btn-primario mt-4"
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
