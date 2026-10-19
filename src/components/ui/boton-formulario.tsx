"use client";

import type { AriaRole, ReactNode } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useEnvioFormulario } from "@/lib/use-accion";

/**
 * Botón de envío para un <form action={…}> con server action. Mientras el
 * formulario se envía queda deshabilitado y muestra el indicador de carga, y
 * un segundo clic (o Enter) no lo vuelve a enviar. Sin estilos propios: los
 * define quien lo usa.
 */
export function BotonFormulario({
  children,
  textoPendiente,
  icono,
  className,
  rol,
}: {
  children: ReactNode;
  textoPendiente?: string;
  icono?: ReactNode;
  className?: string;
  /** role ARIA del botón, por ejemplo "menuitem" dentro de un menú. */
  rol?: AriaRole;
}) {
  const { pendiente, alHacerClic } = useEnvioFormulario();

  return (
    <button
      type="submit"
      role={rol}
      onClick={alHacerClic}
      disabled={pendiente}
      aria-busy={pendiente}
      className={className}
    >
      {pendiente ? <Spinner /> : icono}
      {pendiente && textoPendiente ? textoPendiente : children}
    </button>
  );
}
