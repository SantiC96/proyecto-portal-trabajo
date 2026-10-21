"use client";

import { useEffect } from "react";
import { marcarNotificacionesVistas } from "@/app/(dashboard)/notificaciones/actions";
import { useAccion } from "@/lib/use-accion";
import { avisarCambioNotificaciones } from "./eventos";

/**
 * Al entrar al listado marca como leídas las notificaciones que había hasta
 * `hasta`. No refresca la página: las que eran nuevas siguen resaltadas
 * hasta la próxima visita. Un fallo no se muestra (la acción lo registra) y
 * se reintenta la próxima vez.
 */
export function MarcarLeidasAlEntrar({ hasta }: { hasta: string }) {
  const { ejecutar } = useAccion();

  useEffect(() => {
    ejecutar(async () => {
      try {
        const res = await marcarNotificacionesVistas(hasta);
        if (res.ok) avisarCambioNotificaciones();
      } catch {
        // Sin aviso: se reintenta en la próxima visita.
      }
    });
  }, [ejecutar, hasta]);

  return null;
}
