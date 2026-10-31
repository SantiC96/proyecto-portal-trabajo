"use client";

import type { ReactNode } from "react";
import { abrirNotificacion } from "@/app/(dashboard)/notificaciones/actions";
import { marcarNavegacionDelUsuario } from "@/lib/navegacion-interna";

/**
 * Abre una notificación: la acción la marca como leída y redirige a su
 * destino. Para "Volver" es una navegación del usuario (como un link), no el
 * redirect de una acción: así vuelve a la pantalla desde la que se abrió.
 */
export function FormAbrirNotificacion({
  id,
  alEnviar,
  className,
  children,
}: {
  id: string;
  /** Se llama antes de navegar (la campanita cierra su panel). */
  alEnviar?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <form
      action={abrirNotificacion.bind(null, id)}
      onSubmit={() => {
        marcarNavegacionDelUsuario();
        alEnviar?.();
      }}
      className={className}
    >
      {children}
    </form>
  );
}
