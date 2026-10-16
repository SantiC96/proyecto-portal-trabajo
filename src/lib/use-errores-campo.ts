"use client";

import { useCallback, useState } from "react";
import type { Resultado } from "@/lib/resultado";
import { camposVacios } from "@/lib/validaciones";

export type ErroresCampo<C extends string> = Partial<Record<C, string>>;

// Después del render que agrega aria-invalid.
function enfocarPrimerError(raiz: HTMLElement | null | undefined) {
  requestAnimationFrame(() => {
    (raiz ?? document).querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
}

/**
 * Errores por campo de un formulario. Los formularios llevan noValidate y
 * validan con esto en lugar del globo del navegador:
 *
 *   if (!validar({ nombre, email }, e.currentTarget)) return;
 *
 * marca "Este campo es obligatorio." debajo de cada obligatorio vacío (o solo
 * con espacios) y enfoca el primero. `tomarDelServidor` muestra en el mismo
 * lugar el error de campo que devuelve la acción (ResultadoError.campo).
 */
export function useErroresCampo<C extends string>() {
  const [errores, setErrores] = useState<ErroresCampo<C>>({});

  const validar = useCallback(
    (obligatorios: Partial<Record<C, unknown>>, raiz?: HTMLElement | null): boolean => {
      const nuevos = camposVacios(obligatorios);
      setErrores(nuevos);
      const hayErrores = Object.keys(nuevos).length > 0;
      if (hayErrores) enfocarPrimerError(raiz);
      return !hayErrores;
    },
    []
  );

  const limpiar = useCallback((campo: C) => {
    setErrores((prev) => {
      if (!prev[campo]) return prev;
      const siguiente = { ...prev };
      delete siguiente[campo];
      return siguiente;
    });
  }, []);

  /** Error de otra validación propia (formato, largo); con `raiz` enfoca el campo. */
  const marcar = useCallback((campo: C, mensaje: string, raiz?: HTMLElement | null) => {
    setErrores((prev) => ({ ...prev, [campo]: mensaje }));
    if (raiz !== undefined) enfocarPrimerError(raiz);
  }, []);

  /** true si el error era de uno de `campos` y quedó debajo del campo. */
  const tomarDelServidor = useCallback(
    (resultado: Resultado<unknown>, campos: readonly C[]): boolean => {
      if (resultado.ok || !resultado.campo) return false;
      const campo = campos.find((c) => c === resultado.campo);
      if (!campo) return false;
      setErrores((prev) => ({ ...prev, [campo]: resultado.mensaje }));
      return true;
    },
    []
  );

  const limpiarTodos = useCallback(() => setErrores({}), []);

  return { errores, validar, limpiar, marcar, tomarDelServidor, limpiarTodos };
}
