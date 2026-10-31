"use client";

import { useCallback, useEffect, useRef, useState, type FocusEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function sinMovimiento(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Una fila de pastillas que no baja de renglón: si no entran, se recorre de
 * costado (scroll sin barra). Un degradé en cada borde indica que hay más y,
 * desde md, una flecha de 44 px desplaza la fila hacia ese lado; las dos
 * aparecen solo cuando se puede desplazar. Con teclado, la pastilla con foco
 * se desplaza hasta quedar visible (scroll-padding deja libre la flecha).
 */
export function FilaDesplazable({
  etiquetaId,
  textoAnteriores,
  textoSiguientes,
  children,
  className,
  fondo = "surface",
}: {
  /** id del título del grupo (role="group" aria-labelledby). */
  etiquetaId: string;
  textoAnteriores: string;
  textoSiguientes: string;
  children: ReactNode;
  /** Clases extra de la fila (por ejemplo, una grilla desde cierto ancho). */
  className?: string;
  /** Color sobre el que va la fila: el degradé de los bordes lo usa. */
  fondo?: "surface" | "background";
}) {
  const desde = fondo === "background" ? "from-background" : "from-surface";
  const filaRef = useRef<HTMLDivElement>(null);
  const [puedeAnterior, setPuedeAnterior] = useState(false);
  const [puedeSiguiente, setPuedeSiguiente] = useState(false);

  const medir = useCallback(() => {
    const fila = filaRef.current;
    if (!fila) return;
    setPuedeAnterior(fila.scrollLeft > 1);
    setPuedeSiguiente(fila.scrollLeft + fila.clientWidth < fila.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const fila = filaRef.current;
    if (!fila) return;
    medir();
    // La pastilla activa (aria-current) a la vista al entrar con un filtro
    // elegido. Solo de costado: scrollIntoView podría mover también la página.
    const activa = fila.querySelector<HTMLElement>("[aria-current]");
    if (activa && activa.offsetLeft + activa.offsetWidth > fila.clientWidth) {
      fila.scrollLeft = activa.offsetLeft - (fila.clientWidth - activa.offsetWidth) / 2;
    }
    const observador = new ResizeObserver(medir);
    observador.observe(fila);
    fila.addEventListener("scroll", medir, { passive: true });
    return () => {
      observador.disconnect();
      fila.removeEventListener("scroll", medir);
    };
  }, [medir]);

  function desplazar(sentido: -1 | 1) {
    const fila = filaRef.current;
    if (!fila) return;
    fila.scrollBy({
      left: sentido * fila.clientWidth * 0.75,
      behavior: sinMovimiento() ? "auto" : "smooth",
    });
  }

  function alEnfocar(e: FocusEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) return;
    e.target.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: sinMovimiento() ? "auto" : "smooth",
    });
  }

  const flecha =
    "absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-control-foreground shadow-[var(--sombra-tarjeta-hover)] outline-none transition-colors hover:border-primary hover:text-primary focus-visible:shadow-[var(--sombra-foco)] md:flex";

  return (
    <div className="relative -mx-4 -my-1 sm:mx-0">
      <div
        ref={filaRef}
        role="group"
        aria-labelledby={etiquetaId}
        onFocus={alEnfocar}
        className={cn(
          "sin-barra-scroll flex gap-2 overflow-x-auto scroll-px-4 px-4 py-1 sm:px-0 sm:scroll-px-0 md:scroll-px-14",
          className,
        )}
      >
        {children}
      </div>

      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r to-transparent transition-opacity duration-150 md:w-16",
          desde,
          puedeAnterior ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l to-transparent transition-opacity duration-150 md:w-16",
          desde,
          puedeSiguiente ? "opacity-100" : "opacity-0",
        )}
      />

      {puedeAnterior && (
        <button
          type="button"
          aria-label={textoAnteriores}
          onClick={() => desplazar(-1)}
          className={cn(flecha, "left-0")}
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
      )}
      {puedeSiguiente && (
        <button
          type="button"
          aria-label={textoSiguientes}
          onClick={() => desplazar(1)}
          className={cn(flecha, "right-0")}
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
