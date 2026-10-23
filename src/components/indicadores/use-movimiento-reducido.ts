"use client";

import { useSyncExternalStore } from "react";

const CONSULTA = "(prefers-reduced-motion: reduce)";

function suscribir(avisar: () => void) {
  const media = window.matchMedia(CONSULTA);
  media.addEventListener("change", avisar);
  return () => media.removeEventListener("change", avisar);
}

/**
 * true si el usuario pidió reducir el movimiento. En el servidor y durante la
 * hidratación vale true: los gráficos no animan hasta saber la preferencia.
 */
export function useMovimientoReducido(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia(CONSULTA).matches,
    () => true,
  );
}
