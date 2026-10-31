"use client";

import { useLayoutEffect, useRef, useState, type ComponentProps } from "react";

/**
 * "final": el gráfico completo, sin animación (servidor, sin JavaScript,
 * movimiento reducido o sin IntersectionObserver). "espera": en cero, hasta
 * que entra a la pantalla. "animando": entró y se dibuja una sola vez.
 */
export type FaseAnimacion = "final" | "espera" | "animando";

/**
 * Anima un gráfico la primera vez que entra a la pantalla. Lo que ya está a
 * la vista al cargar se anima al cargar. Arranca en "final" (lo mismo que
 * renderiza el servidor) y pasa a "espera" antes de pintar, así que nunca se
 * ve el gráfico completo y después en cero. No cambia el layout: solo cambia
 * cómo se dibuja lo que ya ocupa su lugar.
 */
export function useAnimarAlVerse<T extends Element>() {
  const ref = useRef<T>(null);
  const [fase, setFase] = useState<FaseAnimacion>("final");

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let observador: IntersectionObserver;
    try {
      observador = new IntersectionObserver(
        ([entrada]) => {
          if (!entrada?.isIntersecting) return;
          setFase("animando");
          observador.disconnect();
        },
        { rootMargin: "0px 0px -40px 0px" },
      );
      observador.observe(el);
    } catch {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- antes de pintar, para no mostrar el gráfico completo y después en cero.
    setFase("espera");
    return () => observador.disconnect();
  }, []);

  return [ref, fase] as const;
}

/**
 * Contenedor para gráficos de HTML o SVG del servidor: pone `data-animar` con
 * la fase y los estilos de globals.css animan las piezas marcadas con
 * `.grafico-barra-x`, `.grafico-barra-y`, `.grafico-tramo` y
 * `.grafico-centro`. Sin el atributo (servidor, sin JavaScript, movimiento
 * reducido) todo se ve completo.
 */
export function AnimarAlVerse(props: ComponentProps<"div">) {
  const [ref, fase] = useAnimarAlVerse<HTMLDivElement>();
  return <div {...props} ref={ref} data-animar={fase === "final" ? undefined : fase} />;
}
