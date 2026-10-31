import Link from "next/link";
import { AlertCircle, Tag } from "lucide-react";
import type { ConteoModalidad, FiltrosOfertasPublicas } from "@/lib/ofertas";
import { listaConO } from "@/lib/filtros-ofertas";
import { hrefConParams, type ParamsUrl } from "@/lib/paginacion";
import { ReintentarCarga } from "@/components/public/retry-job-results";
import { cn } from "@/lib/utils";

const CLASE_ACCION =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-ofertas-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ofertas-primary/40";

/**
 * "No hay ofertas de Gastronomía en modalidad Remoto, pero hay 3 en modalidad
 * Presencial." Con texto buscado: "…de Gastronomía para «mozo» en modalidad…".
 */
function textoSugerencia(filtros: FiltrosOfertasPublicas, sugerencias: SugerenciaModalidad[]) {
  const rubros = filtros.categorias.length > 0 ? ` de ${listaConO(filtros.categorias)}` : "";
  const texto = filtros.q !== "" ? ` para «${filtros.q}»` : "";
  const otras = sugerencias.map((s) => `${s.cantidad} en modalidad ${s.modalidad}`);
  const listaOtras =
    otras.length <= 1 ? otras.join("") : `${otras.slice(0, -1).join(", ")} y ${otras[otras.length - 1]}`;
  return `No hay ofertas${rubros}${texto} en modalidad ${listaConO(filtros.modalidades)}, pero hay ${listaOtras}.`;
}

type VarianteVacia = "busqueda" | "filtros" | "busqueda-filtros";

/** Otra modalidad con ofertas de los mismos rubros y texto, y el link que la elige. */
export type SugerenciaModalidad = ConteoModalidad & { href: string };

type PropsVacio = {
  variant: VarianteVacia;
  ruta: string;
  searchParams: ParamsUrl;
  filtros: FiltrosOfertasPublicas;
  sugerencias?: SugerenciaModalidad[];
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

  const { ruta, searchParams, filtros, sugerencias = [] } = props;
  const haySugerencia = sugerencias.length > 0 && filtros.modalidades.length > 0;
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
        No encontramos ofertas con esos filtros
      </h3>
      {haySugerencia ? (
        <>
          <p className="mt-2 max-w-prose text-[clamp(0.875rem,1.5vw,1rem)] leading-6 text-ofertas-secondary">
            {textoSugerencia(filtros, sugerencias)}
          </p>
          <ul className="mt-5 flex flex-wrap justify-center gap-3">
            {sugerencias.map((s) => (
              <li key={s.modalidad}>
                <Link href={s.href} className={CLASE_ACCION}>
                  Ver {s.cantidad === 1 ? "la oferta" : `las ${s.cantidad}`} en modalidad {s.modalidad}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={hrefLimpiarFiltros}
            className="mt-3 inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-2 text-sm font-bold text-primary underline-offset-2 outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]"
          >
            Limpiar filtros
          </Link>
        </>
      ) : (
        <>
          <p className="mt-2 text-[clamp(0.875rem,1.5vw,1rem)] leading-6 text-ofertas-secondary">
            Probá con otro rubro o modalidad, o quitá algún filtro para ver más ofertas laborales.
          </p>

          <Link href={hrefLimpiarFiltros} className={cn(CLASE_ACCION, "mt-5")}>
            Limpiar filtros
          </Link>
        </>
      )}
    </section>
  );
}
