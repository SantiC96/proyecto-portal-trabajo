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
  /**
   * "simple": "Mostrando X–Y de N" y la página actual entre Anterior y
   * Siguiente. "numeros": "Página N de M" y un botón por página (con puntos
   * suspensivos si son muchas), para listas que ya muestran el total arriba.
   */
  variante?: "simple" | "numeros";
  className?: string;
};

// Botón neutro de 44 × 44 como mínimo (en pantallas muy angostas queda solo la flecha).
const BOTON = "btn-neutro min-w-11";
const BOTON_NUMERO = "btn-neutro min-w-11 px-0!";
const PAGINA_ACTUAL =
  "inline-flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-primary font-bold text-primary-foreground";

/**
 * Páginas a mostrar: la primera, la última y las vecinas de la actual; los
 * huecos se marcan con null ("…").
 */
function paginasVisibles(actual: number, total: number): (number | null)[] {
  const vecinas = new Set([1, total, actual - 1, actual, actual + 1]);
  // Cerca de un extremo se completa para que la cantidad de botones no salte.
  if (actual <= 3) [2, 3, 4].forEach((p) => vecinas.add(p));
  if (actual >= total - 2) [total - 1, total - 2, total - 3].forEach((p) => vecinas.add(p));
  const ordenadas = [...vecinas].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const resultado: (number | null)[] = [];
  ordenadas.forEach((p, i) => {
    const anterior = ordenadas[i - 1];
    if (anterior !== undefined && p - anterior > 1) {
      // Un hueco de una sola página se muestra como número, no como "…".
      resultado.push(p - anterior === 2 ? p - 1 : null);
    }
    resultado.push(p);
  });
  return resultado;
}

export function Paginacion({
  ruta,
  searchParams,
  pagina,
  total,
  tamano = TAMANO_PAGINA,
  ancla,
  parametro = "pagina",
  variante = "simple",
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

  const anterior =
    pagina > 1 ? (
      <Link href={href(pagina - 1)} rel="prev" className={BOTON}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        <span className="max-[359px]:sr-only">Anterior</span>
      </Link>
    ) : (
      <span aria-disabled="true" className={BOTON}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        <span className="max-[359px]:sr-only">Anterior</span>
      </span>
    );

  const siguiente =
    pagina < totalPaginas ? (
      <Link href={href(pagina + 1)} rel="next" className={BOTON}>
        <span className="max-[359px]:sr-only">Siguiente</span>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    ) : (
      <span aria-disabled="true" className={BOTON}>
        <span className="max-[359px]:sr-only">Siguiente</span>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </span>
    );

  if (variante === "numeros") {
    return (
      <nav
        aria-label="Paginación"
        className={cn(
          "flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between",
          className,
        )}
      >
        <p className="text-center text-muted-foreground-strong sm:text-left">
          Página {pagina} de {totalPaginas}
        </p>

        {totalPaginas > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
            {anterior}
            {/* En el celular solo entran Anterior y Siguiente; los números, desde sm. */}
            <ul className="hidden items-center gap-1.5 sm:flex">
              {paginasVisibles(pagina, totalPaginas).map((p, i) => (
                <li key={p ?? `hueco-${i}`}>
                  {p === null ? (
                    <span aria-hidden="true" className="inline-flex size-11 items-center justify-center text-muted-foreground">
                      …
                    </span>
                  ) : p === pagina ? (
                    <span aria-current="page" className={PAGINA_ACTUAL}>
                      <span className="sr-only">Página </span>
                      {p}
                    </span>
                  ) : (
                    <Link href={href(p)} className={BOTON_NUMERO}>
                      <span className="sr-only">Página </span>
                      {p}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            {siguiente}
          </div>
        )}
      </nav>
    );
  }

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
          {anterior}

          <span className="flex items-center gap-1.5 whitespace-nowrap px-1 text-center text-muted-foreground-strong">
            Página
            <span aria-current="page" className={PAGINA_ACTUAL}>
              {pagina}
            </span>
            de {totalPaginas}
          </span>

          {siguiente}
        </div>
      )}
    </nav>
  );
}
