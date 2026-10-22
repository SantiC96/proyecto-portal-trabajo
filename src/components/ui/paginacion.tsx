import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TAMANO_PAGINA,
  calcularTotalPaginas,
  hrefConParams,
  type ParamsUrl,
} from "@/lib/paginacion";

type Props = {
  ruta: string;
  searchParams: ParamsUrl;
  pagina: number;
  total: number;
  tamano?: number;
  /** id del elemento al que vuelve el scroll al cambiar de página. */
  ancla?: string;
  /**
   * Parámetro de la URL con el número de página. Cambiarlo permite tener
   * varias paginaciones independientes en la misma pantalla.
   */
  parametro?: string;
  className?: string;
};

// Botón neutro de 44 × 44 como mínimo (en pantallas muy angostas queda solo la flecha).
const BOTON = "btn-neutro min-w-11";

export function Paginacion({
  ruta,
  searchParams,
  pagina,
  total,
  tamano = TAMANO_PAGINA,
  ancla,
  parametro = "pagina",
  className,
}: Props) {
  if (total <= 0) return null;

  const totalPaginas = calcularTotalPaginas(total, tamano);
  const desde = (pagina - 1) * tamano + 1;
  const hasta = Math.min(pagina * tamano, total);

  const href = (destino: number) =>
    hrefConParams(
      ruta,
      searchParams,
      { [parametro]: destino === 1 ? null : destino },
      ancla,
    );

  return (
    <nav
      aria-label="Paginación"
      className={cn(
        "flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-center text-muted-foreground sm:text-left">
        Mostrando {desde}–{hasta} de {total}
      </p>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          {pagina > 1 ? (
            <Link
              href={href(pagina - 1)}
              rel="prev"
              className={BOTON}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span className="max-[359px]:sr-only">Anterior</span>
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={BOTON}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span className="max-[359px]:sr-only">Anterior</span>
            </span>
          )}

          <span className="flex items-center gap-1.5 whitespace-nowrap px-1 text-center text-muted-foreground-strong">
            Página
            <span
              aria-current="page"
              className="inline-flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-primary font-bold text-primary-foreground"
            >
              {pagina}
            </span>
            de {totalPaginas}
          </span>

          {pagina < totalPaginas ? (
            <Link
              href={href(pagina + 1)}
              rel="next"
              className={BOTON}
            >
              <span className="max-[359px]:sr-only">Siguiente</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={BOTON}
            >
              <span className="max-[359px]:sr-only">Siguiente</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
        </div>
      )}
    </nav>
  );
}
