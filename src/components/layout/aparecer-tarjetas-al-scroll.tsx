"use client";

import { useLayoutEffect } from "react";

const SELECTOR_ELEMENTOS = ".tarjeta, .auth-tarjeta, article, .banda-ofertas, .banda-resumen";

export function AparecerTarjetasAlScroll({ pathname }: { pathname: string }) {
  useLayoutEffect(() => {
    const raiz = document.querySelector<HTMLElement>(".app-pagina, .login-pantalla");
    if (
      !raiz ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const observados = new Set<HTMLElement>();
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          const elemento = entrada.target as HTMLElement;
          elemento.dataset.aparecer = "visible";
          observador.unobserve(elemento);
        }
      },
      { rootMargin: "0px 0px -40px 0px" },
    );

    const registrar = (elemento: HTMLElement) => {
      if (
        elemento.closest("[data-aparecer-manual]") ||
        elemento.dataset.aparecerGlobal !== undefined ||
        elemento.getBoundingClientRect().top < window.innerHeight
      ) {
        return;
      }

      elemento.dataset.aparecerGlobal = "";
      elemento.dataset.aparecer = "oculto";
      observados.add(elemento);
      observador.observe(elemento);
    };

    const registrarSubarbol = (nodo: Node) => {
      if (!(nodo instanceof HTMLElement)) return;
      if (nodo.matches(SELECTOR_ELEMENTOS)) registrar(nodo);
      nodo.querySelectorAll<HTMLElement>(SELECTOR_ELEMENTOS).forEach(registrar);
    };

    raiz.querySelectorAll<HTMLElement>(SELECTOR_ELEMENTOS).forEach(registrar);

    const cambios = new MutationObserver((mutaciones) => {
      for (const mutacion of mutaciones) {
        mutacion.addedNodes.forEach(registrarSubarbol);
      }
    });
    cambios.observe(raiz, { childList: true, subtree: true });

    return () => {
      observador.disconnect();
      cambios.disconnect();
      for (const elemento of observados) {
        delete elemento.dataset.aparecer;
        delete elemento.dataset.aparecerGlobal;
      }
    };
  }, [pathname]);

  return null;
}
