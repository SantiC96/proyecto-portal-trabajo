"use client";

import { useCallback, useRef, useTransition } from "react";

/**
 * Ejecuta una acción del servidor dentro de una transición y descarta los
 * clics que llegan mientras la anterior sigue corriendo. `pendiente` sirve
 * para deshabilitar el botón y mostrar el indicador de carga; el ref cubre el
 * intervalo entre el clic y el primer render con `pendiente = true`, en el
 * que un doble clic rápido todavía encuentra el botón habilitado.
 */
export function useAccion() {
  const [pendiente, startTransition] = useTransition();
  const enCurso = useRef(false);

  const ejecutar = useCallback((accion: () => Promise<void>) => {
    if (enCurso.current) return;
    enCurso.current = true;
    startTransition(async () => {
      try {
        await accion();
      } finally {
        enCurso.current = false;
      }
    });
  }, []);

  return { pendiente, ejecutar };
}
