import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Anillo de progreso de 96 px (trazo de 10 px) con el porcentaje en el centro;
 * `tamano={64}` lo achica entero (Mi perfil).
 * El llenado y la cuenta del número son solo CSS (`.anillo-progreso` en
 * globals.css): sin JavaScript, sin movimiento si se pidió reducirlo, y el
 * valor real está en el aria-label desde el primer render.
 */
export function AnilloProgreso({
  porcentaje,
  etiqueta,
  tamano = 96,
}: {
  porcentaje: number;
  etiqueta: string;
  tamano?: 96 | 64;
}) {
  const valor = Math.min(100, Math.max(0, Math.round(porcentaje)));
  return (
    <div
      role="img"
      aria-label={etiqueta}
      className={cn("anillo-progreso", tamano === 64 && "anillo-progreso-64")}
      style={{ "--progreso": valor } as CSSProperties}
    >
      <svg viewBox="0 0 96 96" aria-hidden="true">
        <circle cx="48" cy="48" r="43" fill="none" strokeWidth="10" className="anillo-progreso-fondo" />
        {/* En 0 % no se dibuja: el extremo redondeado dejaría un punto. */}
        {valor > 0 && (
          <circle
            cx="48"
            cy="48"
            r="43"
            fill="none"
            strokeWidth="10"
            pathLength={100}
            transform="rotate(-90 48 48)"
            className="anillo-progreso-valor"
          />
        )}
      </svg>
      <span aria-hidden="true" className="anillo-progreso-numero" />
    </div>
  );
}
