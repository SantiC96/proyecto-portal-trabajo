"use client";

import { useCallback, useEffect, useRef, useTransition, type MouseEvent } from "react";
import { useFormStatus } from "react-dom";

/**
 * Protección única contra el doble envío desde el cliente. Todo botón que
 * dispara una acción del servidor, un fetch o una navegación con efectos pasa
 * por uno de estos dos hooks:
 *
 * - `useAccion`: para handlers propios (onClick, onSubmit con preventDefault).
 * - `useEnvioFormulario`: para el botón de un `<form action={serverAction}>`.
 *
 * Los dos combinan un estado (`pendiente`, para deshabilitar el botón y
 * mostrar la carga) con un ref, que corta el segundo clic aunque llegue antes
 * del render que deshabilita el botón.
 */

/**
 * Ejecuta una acción dentro de una transición y descarta las llamadas que
 * llegan mientras la anterior sigue corriendo (doble clic, Enter repetido).
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

/**
 * Para el botón de envío de un `<form action={serverAction}>` (va dentro del
 * form). El Enter del teclado también pasa por el clic del botón de envío, así
 * que cubre los dos casos. Solo para formularios sin validación propia en
 * onSubmit: esos usan `useAccion`.
 */
export function useEnvioFormulario() {
  const { pending } = useFormStatus();
  const enviado = useRef(false);

  // El envío anterior terminó: se puede volver a enviar.
  useEffect(() => {
    if (!pending) enviado.current = false;
  }, [pending]);

  const alHacerClic = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    if (enviado.current) {
      e.preventDefault();
      return;
    }
    const form = e.currentTarget.form;
    if (form && !form.noValidate && !form.checkValidity()) return;
    enviado.current = true;
  }, []);

  return { pendiente: pending, alHacerClic };
}
