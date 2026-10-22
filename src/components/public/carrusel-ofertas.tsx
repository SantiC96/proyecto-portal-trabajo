"use client";

import { Children, useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  titulo: string;
  bajada: string;
  /** Link "Ver todas las ofertas", a la izquierda de las flechas. */
  enlace: ReactNode;
  /** Una tarjeta por elemento. */
  children: ReactNode;
};

type Medida = {
  pagina: number;
  paginas: number;
  alInicio: boolean;
  alFinal: boolean;
};

const BOTON_FLECHA =
  "inline-grid size-11 shrink-0 place-items-center rounded-full border-[1.5px] border-border-control bg-surface text-control-foreground outline-none transition-colors hover:bg-surface-tinted focus-visible:shadow-[var(--sombra-foco)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface";

/**
 * Carrusel de tarjetas con scroll horizontal y scroll-snap. Entran 3 tarjetas
 * con 896 px de ancho disponible, 2 desde 576 px y, más angosto, una sola
 * mostrando el borde de la siguiente (se mide el contenedor y no la ventana:
 * la sidebar le quita ancho al contenido). Las flechas desplazan una página;
 * con teclado se llega a cada tarjeta y el navegador la trae a la vista. Si
 * todas entran, no hay flechas ni puntos.
 */
export function CarruselOfertas({ titulo, bajada, enlace, children }: Props) {
  const idTitulo = useId();
  const pista = useRef<HTMLUListElement>(null);
  const [medida, setMedida] = useState<Medida | null>(null);
  const items = Children.toArray(children);

  const pasoDePagina = useCallback(() => {
    const el = pista.current;
    const primero = el?.firstElementChild as HTMLElement | null;
    if (!el || !primero) return null;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const paso = primero.offsetWidth + gap;
    const porVista = Math.max(1, Math.round((el.clientWidth + gap) / paso));
    return { el, paso, porVista };
  }, []);

  const medir = useCallback(() => {
    const datos = pasoDePagina();
    if (!datos) return;
    const { el, paso, porVista } = datos;
    const maximo = el.scrollWidth - el.clientWidth;
    if (maximo <= 1) {
      setMedida(null);
      return;
    }
    const paginas = Math.ceil(el.children.length / porVista);
    const alFinal = el.scrollLeft >= maximo - 1;
    const pagina = alFinal
      ? paginas - 1
      : Math.min(paginas - 1, Math.round(el.scrollLeft / (paso * porVista)));
    setMedida({ pagina, paginas, alInicio: el.scrollLeft <= 1, alFinal });
  }, [pasoDePagina]);

  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    let cuadro = 0;
    const alDesplazar = () => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(medir);
    };
    const observador = new ResizeObserver(alDesplazar);
    observador.observe(el);
    el.addEventListener("scroll", alDesplazar, { passive: true });
    return () => {
      cancelAnimationFrame(cuadro);
      observador.disconnect();
      el.removeEventListener("scroll", alDesplazar);
    };
  }, [medir]);

  function desplazar(sentido: 1 | -1) {
    const datos = pasoDePagina();
    if (!datos) return;
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    datos.el.scrollBy({
      left: sentido * datos.paso * datos.porVista,
      behavior: reducido ? "auto" : "smooth",
    });
  }

  return (
    <section aria-labelledby={idTitulo} className="@container">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 id={idTitulo} className="text-[26px] leading-tight font-extrabold">
            {titulo}
          </h2>
          <p className="mt-1.5 text-base text-muted-foreground">{bajada}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {enlace}
          {medida && (
            <div className="flex gap-2">
              <button
                type="button"
                className={BOTON_FLECHA}
                aria-label="Ofertas anteriores"
                aria-controls={`${idTitulo}-pista`}
                disabled={medida.alInicio}
                onClick={() => desplazar(-1)}
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={BOTON_FLECHA}
                aria-label="Ofertas siguientes"
                aria-controls={`${idTitulo}-pista`}
                disabled={medida.alFinal}
                onClick={() => desplazar(1)}
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>

      <ul
        ref={pista}
        id={`${idTitulo}-pista`}
        // El padding de 4 px deja ver el foco y la elevación de la tarjeta, que
        // el desplazamiento horizontal recortaría.
        className="sin-barra-scroll mt-5 -mx-1 flex snap-x snap-mandatory scroll-px-1 gap-4 overflow-x-auto scroll-smooth p-1 motion-reduce:scroll-auto"
      >
        {items.map((item, i) => (
          <li
            key={i}
            className="flex shrink-0 basis-[85%] snap-start @xl:basis-[calc((100%_-_16px)/2)] @4xl:basis-[calc((100%_-_32px)/3)]"
          >
            <div className="w-full">{item}</div>
          </li>
        ))}
      </ul>

      {medida && medida.paginas > 1 && (
        <div aria-hidden="true" className="mt-5 flex items-center justify-center gap-2">
          {Array.from({ length: medida.paginas }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 rounded-full transition-[width,background-color] duration-200",
                i === medida.pagina ? "w-6 bg-primary" : "w-2 bg-punto-carrusel",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
