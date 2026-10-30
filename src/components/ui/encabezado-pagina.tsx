import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  titulo: ReactNode;
  bajada?: ReactNode;
  /** Botones a la derecha, alineados abajo; en el celular pasan debajo del título. */
  acciones?: ReactNode;
  /** Título de portada: Georgia 400 de 52 px (36 en el celular) y bajada de 17 px (indicadores de la oficina). */
  grande?: boolean;
  className?: string;
};

/** Título de la página en Georgia (32 px 700; 26 px en el celular) con su bajada y acciones opcionales. */
export function EncabezadoPagina({ titulo, bajada, acciones, grande = false, className }: Props) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1
          className={cn(
            "break-words text-heading",
            grande
              ? "titulo-portada text-[36px] leading-[1.05] sm:text-[52px]"
              : "titulo-display text-[26px] leading-[1.15] sm:text-[32px]",
          )}
        >
          {titulo}
        </h1>
        {bajada && (
          <p className={cn("mt-1.5 text-muted-foreground", grande ? "text-[17px]" : "text-base")}>
            {bajada}
          </p>
        )}
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap gap-3">{acciones}</div>}
    </header>
  );
}
