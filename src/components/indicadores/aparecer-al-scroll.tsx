"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Envuelve una tarjeta o una fila de los indicadores: si al cargar está
 * debajo de la pantalla, aparece (opacidad y 16 px hacia arriba, 400 ms) la
 * primera vez que entra. El contenido viene renderizado del servidor y se ve
 * desde el principio: el componente solo pone `data-aparecer` (los estilos
 * están en globals.css), así que sin JavaScript, con movimiento reducido o
 * si ya estaba a la vista, no se oculta nunca. No cambia el layout.
 */
export function AparecerAlScroll({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Antes de pintar: lo que está a la vista no llega a ocultarse.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Solo lo que está debajo: lo de arriba (al volver con el scroll guardado) ya se vio.
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    el.dataset.aparecer = "oculto";
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada?.isIntersecting) return;
        el.dataset.aparecer = "visible";
        observador.disconnect();
      },
      { rootMargin: "0px 0px -40px 0px" },
    );
    observador.observe(el);
    return () => {
      observador.disconnect();
      delete el.dataset.aparecer;
    };
  }, []);

  return (
    <div ref={ref} className={cn("min-w-0", className)}>
      {children}
    </div>
  );
}
