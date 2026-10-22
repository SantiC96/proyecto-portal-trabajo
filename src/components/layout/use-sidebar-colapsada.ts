"use client";

import { useSyncExternalStore } from "react";
import {
  ATRIBUTO_SIDEBAR,
  ATRIBUTO_SIDEBAR_ANIMANDO,
  CLAVE_SIDEBAR,
} from "./preferencia-sidebar";

const oyentes = new Set<() => void>();
let finAnimacion: ReturnType<typeof setTimeout> | undefined;

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

function leer(): boolean {
  return document.documentElement.getAttribute(ATRIBUTO_SIDEBAR) === "colapsada";
}

/**
 * En el servidor y durante la hidratación vale false; después, lo que dejó el
 * script del <head>. Lo visual (ancho, textos, íconos) lo resuelve el CSS con
 * el atributo de <html>, así que ese primer valor no se ve.
 */
export function useSidebarColapsada(): boolean {
  return useSyncExternalStore(suscribir, leer, () => false);
}

export function alternarSidebar() {
  const html = document.documentElement;
  const colapsada = !leer();
  html.setAttribute(ATRIBUTO_SIDEBAR_ANIMANDO, "");
  html.setAttribute(ATRIBUTO_SIDEBAR, colapsada ? "colapsada" : "expandida");
  try {
    localStorage.setItem(CLAVE_SIDEBAR, colapsada ? "1" : "0");
  } catch {
    // Sin localStorage (modo privado, bloqueado): la preferencia dura hasta recargar.
  }
  clearTimeout(finAnimacion);
  finAnimacion = setTimeout(() => html.removeAttribute(ATRIBUTO_SIDEBAR_ANIMANDO), 450);
  oyentes.forEach((oyente) => oyente());
}
