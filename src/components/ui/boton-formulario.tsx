"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/ui/spinner";

/**
 * Botón de envío para un <form action={…}> con server action. Mientras el
 * formulario se envía queda deshabilitado y muestra el indicador de carga, así
 * un segundo clic no vuelve a enviarlo. Sin estilos propios: los define quien
 * lo usa.
 */
export function BotonFormulario({
  children,
  textoPendiente,
  icono,
  className,
}: {
  children: ReactNode;
  textoPendiente?: string;
  icono?: ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending ? <Spinner /> : icono}
      {pending && textoPendiente ? textoPendiente : children}
    </button>
  );
}
