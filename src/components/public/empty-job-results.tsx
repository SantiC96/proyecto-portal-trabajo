import Link from "next/link";
import { AlertCircle, Tag } from "lucide-react";
import type { FiltrosOfertasPublicas } from "@/lib/ofertas";
import { hrefConParams, type ParamsUrl } from "@/lib/paginacion";
import { ReintentarCarga } from "@/components/public/retry-job-results";

type VarianteVacia = "busqueda" | "filtros" | "busqueda-filtros";

type PropsVacio = {
  variant: VarianteVacia;
  ruta: string;
  searchParams: ParamsUrl;
  filtros: FiltrosOfertasPublicas;
};

type PropsError = {
  variant: "error";
  refError: string;
};

type Props = PropsVacio | PropsError;

export function EmptyJobResults(props: Props) {
  if (props.variant === "error") {
    return (
      <section
        role="alert"
        className="mt-8 flex w-full flex-col items-center gap-3 rounded-2xl bg-danger px-5 py-8 text-center text-white sm:px-8 sm:py-10"
      >
        <AlertCircle className="h-8 w-8" aria-hidden="true" />
        <div>
          <h3 className="text-lg font-bold">No pudimos cargar las ofertas</h3>
          <p className="mt-2 text-sm text-white/90">
            Hubo un problema al buscar. Intentá de nuevo en unos minutos.
          </p>
          <p className="mt-2 text-sm text-white/90">
            Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código:{" "}
            <span className="font-mono">{props.refError}</span>
          </p>
        </div>
        <ReintentarCarga />
      </section>
    );
  }

  const { ruta, searchParams } = props;
  const hrefLimpiarFiltros = hrefConParams(
    ruta,
    searchParams,
    { q: null, categoria: null, modalidad: null, pagina: null },
    "ofertas",
  );
  return (
    <section
      aria-labelledby="empty-job-results-title"
      className="estado-vacio mt-8 flex w-full flex-col items-center rounded-[var(--radius-ofertas)] border border-ofertas-border p-[clamp(1.5rem,4vw,3rem)] text-center shadow-xs"
    >
      <p className="sr-only" role="status" aria-live="polite">
        No se encontraron ofertas.
      </p>
      <div className="estado-vacio-icono flex size-[clamp(3.5rem,8vw,4.5rem)] items-center justify-center rounded-full bg-ofertas-icon text-ofertas-primary">
        <Tag className="size-[clamp(1.5rem,4vw,2rem)]" aria-hidden="true" />
      </div>
      <h3 id="empty-job-results-title" className="mt-4 text-[clamp(1.125rem,2.5vw,1.5rem)] font-bold text-ofertas-heading">
        Aún no hay empleos que coincidan con tu búsqueda
      </h3>
      <p className="mt-2 text-[clamp(0.875rem,1.5vw,1rem)] leading-6 text-ofertas-secondary">
        Probá con otro rubro o modalidad, o quitá algún filtro para ver más ofertas laborales.
      </p>

      <Link
        href={hrefLimpiarFiltros}
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-ofertas-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ofertas-primary/40"
      >
        Limpiar filtros
      </Link>
    </section>
  );
}
