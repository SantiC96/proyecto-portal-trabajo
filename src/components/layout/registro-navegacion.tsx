"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  MAXIMO_ENTRADAS,
  guardarPila,
  leerPila,
  rutaNormalizada,
  sinQuery,
  tomarNavegacionDelUsuario,
  tomarSaltoPendiente,
  type EntradaNavegacion,
} from "@/lib/navegacion-interna";

/** Cuánto puede tardar en cambiar la ruta después de un clic o de un "atrás". */
const VENTANA_MS = 10_000;

// Por documento y no por componente: AppShell lo monta en otra rama al pasar
// de /auth al resto del sitio, y eso no es una carga nueva de la página.
let ultimoClicEnLink = 0;
let ultimoPopstate = 0;
let primeraCarga = true;
// pushState hechos desde el último registro. history.length no alcanza: el
// navegador lo topea (50 en Chrome) y a partir de ahí un push no lo hace crecer.
let pushesPendientes = 0;
let historialObservado = false;

function observarPushState() {
  if (historialObservado) return;
  historialObservado = true;
  const pushOriginal = window.history.pushState;
  window.history.pushState = function pushState(...args: Parameters<History["pushState"]>) {
    pushesPendientes++;
    return pushOriginal.apply(this, args);
  };
}

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
 * - "Volver" a una pantalla más atrás (tomarSaltoPendiente): se recorta la
 *   pila hasta esa entrada;
 * - vino de "atrás"/"adelante" (popstate): se recorta la pila hasta esa ruta;
 * - hubo un pushState: se apila. Es "tras una acción" si no hubo un clic en un
 *   link ni una navegación marcada del usuario; un cambio de query en la misma
 *   pantalla (pestaña, filtro, página) hereda lo de la entrada anterior;
 * - si no (router.replace, por ejemplo al quitar ?aviso=): reemplaza la última.
 */
export function RegistroNavegacion() {
  const pathname = usePathname();
  const query = useSearchParams().toString();

  useEffect(() => {
    observarPushState();
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
    // En la tarea siguiente: el router de Next renderiza la ruta nueva dentro
    // de su listener de popstate, antes de que corra el de acá.
    const espera = window.setTimeout(() => registrarRuta(pathname, query), 0);
    return () => window.clearTimeout(espera);
  }, [pathname, query]);

  return null;
}

/** Clasifica el cambio de ruta (ver RegistroNavegacion) y actualiza la pila. */
function registrarRuta(pathname: string, query: string) {
  const ruta = rutaNormalizada(pathname, query);
  const largo = window.history.length;
  const ahora = Date.now();
  const salto = tomarSaltoPendiente();
  const porSalto = salto !== null && salto.ruta === ruta && ahora - salto.en < VENTANA_MS;
  const porHistorial = !porSalto && ahora - ultimoPopstate < VENTANA_MS;
  const navegacionMarcada = tomarNavegacionDelUsuario();
  const delUsuario =
    ahora - ultimoClicEnLink < VENTANA_MS || ahora - navegacionMarcada < VENTANA_MS;
  const huboPush = pushesPendientes > 0;
  ultimoPopstate = 0;
  ultimoClicEnLink = 0;
  pushesPendientes = 0;

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
  } else if (porSalto && entradas[salto.indice]?.ruta === ruta) {
    // El historial del navegador sigue teniendo las pantallas salteadas:
    // desde acá, "Volver" ya no puede usar router.back().
    entradas = [
      ...entradas.slice(0, salto.indice),
      { ...entradas[salto.indice], anteriorEnHistorial: false },
    ];
  } else if (porHistorial) {
    const indice = entradas.map((e) => e.ruta).lastIndexOf(ruta);
    // Si no está en la pila no se sabe qué hay antes: se empieza de cero.
    entradas =
      indice >= 0 ? entradas.slice(0, indice + 1) : [{ ruta, trasAccion: false }];
  } else if (!pila || entradas.length === 0 || huboPush || largo > pila.largoHistorial) {
    const mismaPantalla = ultima !== undefined && sinQuery(ultima.ruta) === pathname;
    const trasAccion = mismaPantalla
      ? ultima.trasAccion
      : entradas.length > 0 && !delUsuario && !porSalto;
    entradas = [...entradas, { ruta, trasAccion }];
  } else {
    entradas = [
      ...entradas.slice(0, -1),
      { ...(ultima ?? { trasAccion: false }), ruta },
    ];
  }

  guardarPila({ entradas: entradas.slice(-MAXIMO_ENTRADAS), largoHistorial: largo });
}
