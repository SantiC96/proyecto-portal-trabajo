"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  MAXIMO_ENTRADAS,
  guardarPila,
  leerPila,
  rutaNormalizada,
  type EntradaNavegacion,
} from "@/lib/navegacion-interna";

/** Cuánto puede tardar en cambiar la ruta después de un clic o de un "atrás". */
const VENTANA_MS = 10_000;

// Por documento y no por componente: AppShell lo monta en otra rama al pasar
// de /auth al resto del sitio, y eso no es una carga nueva de la página.
let ultimoClicEnLink = 0;
let ultimoPopstate = 0;
let primeraCarga = true;

function vieneDelSitio(): boolean {
  try {
    return document.referrer !== "" && new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}

function tipoDeCarga(): string | undefined {
  const [carga] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  return carga?.type;
}

/**
 * Guarda en sessionStorage la pila de pantallas del sitio visitadas en esta
 * pestaña (lib/navegacion-interna.ts). No renderiza nada. Va dentro de un
 * Suspense porque usa useSearchParams.
 *
 * Cada cambio de ruta se clasifica así:
 * - vino de "atrás"/"adelante" (popstate): se recorta la pila hasta esa ruta;
 * - history.length creció (push): se apila, marcando si hubo un clic en un link;
 * - si no (router.replace, por ejemplo al quitar ?aviso=): reemplaza la última.
 */
export function RegistroNavegacion() {
  const pathname = usePathname();
  const query = useSearchParams().toString();

  useEffect(() => {
    function alHacerClic(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.origin !== window.location.origin || (link.target && link.target !== "_self")) return;
      ultimoClicEnLink = Date.now();
    }
    function alVolverOAvanzar() {
      ultimoPopstate = Date.now();
    }
    document.addEventListener("click", alHacerClic, true);
    window.addEventListener("popstate", alVolverOAvanzar);
    return () => {
      document.removeEventListener("click", alHacerClic, true);
      window.removeEventListener("popstate", alVolverOAvanzar);
    };
  }, []);

  useEffect(() => {
    const ruta = rutaNormalizada(pathname, query);
    const largo = window.history.length;
    const ahora = Date.now();
    const porHistorial = ahora - ultimoPopstate < VENTANA_MS;
    const porLink = !porHistorial && ahora - ultimoClicEnLink < VENTANA_MS;
    ultimoPopstate = 0;
    ultimoClicEnLink = 0;

    let pila = leerPila();
    if (primeraCarga) {
      primeraCarga = false;
      // Una pestaña nueva, un link de un email o un sitio externo empiezan de
      // cero aunque sessionStorage tenga una pila de antes.
      const tipo = tipoDeCarga();
      const continua =
        largo > 1 &&
        (tipo === "reload" || tipo === "back_forward" || (tipo === "navigate" && vieneDelSitio()));
      if (!continua) pila = null;
    }

    let entradas: EntradaNavegacion[] = pila?.entradas ?? [];
    const ultima = entradas[entradas.length - 1];

    if (ultima?.ruta === ruta) {
      // Recarga o el mismo render dos veces: nada que registrar.
    } else if (porHistorial) {
      const indice = entradas.map((e) => e.ruta).lastIndexOf(ruta);
      // Si no está en la pila no se sabe qué hay antes: se empieza de cero.
      entradas =
        indice >= 0 ? entradas.slice(0, indice + 1) : [{ ruta, trasAccion: false }];
    } else if (!pila || entradas.length === 0 || largo > pila.largoHistorial) {
      entradas = [...entradas, { ruta, trasAccion: entradas.length > 0 && !porLink }];
    } else {
      entradas = [...entradas.slice(0, -1), { ruta, trasAccion: ultima?.trasAccion ?? false }];
    }

    guardarPila({ entradas: entradas.slice(-MAXIMO_ENTRADAS), largoHistorial: largo });
  }, [pathname, query]);

  return null;
}
