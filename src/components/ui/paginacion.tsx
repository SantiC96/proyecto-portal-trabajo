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
  className?: string;
};

const BOTON =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border px-3 text-sm font-medium sm:px-4";

export function Paginacion({
  ruta,
  searchParams,
  pagina,
  total,
  tamano = TAMANO_PAGINA,
  ancla,
  className,
}: Props) {
  if (total <= 0) return null;

  const totalPaginas = calcularTotalPaginas(total, tamano);
  const desde = (pagina - 1) * tamano + 1;
  const hasta = Math.min(pagina * tamano, total);

  const href = (destino: number) =>
    hrefConParams(ruta, searchParams, { pagina: destino }, ancla);

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
              className={cn(BOTON, "btn-secundario")}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span className="max-[359px]:sr-only">Anterior</span>
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={cn(BOTON, "border-border bg-white text-muted-icon")}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span className="max-[359px]:sr-only">Anterior</span>
            </span>
          )}

          <span className="whitespace-nowrap px-1 text-center text-muted-foreground-strong">
            Página {pagina} de {totalPaginas}
          </span>

          {pagina < totalPaginas ? (
            <Link
              href={href(pagina + 1)}
              rel="next"
              className={cn(BOTON, "btn-secundario")}
            >
              <span className="max-[359px]:sr-only">Siguiente</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={cn(BOTON, "border-border bg-white text-muted-icon")}
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
