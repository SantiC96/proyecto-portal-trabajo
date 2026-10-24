import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  titulo: ReactNode;
  bajada?: ReactNode;
  /** Botones a la derecha, alineados abajo; en el celular pasan debajo del título. */
  acciones?: ReactNode;
  className?: string;
};

/** Título de la página (32 px 800; 26 px en el celular) con su bajada y acciones opcionales. */
export function EncabezadoPagina({ titulo, bajada, acciones, className }: Props) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="break-words text-[26px] leading-[1.15] sm:text-[32px] font-extrabold tracking-[-0.01em] text-heading">
          {titulo}
        </h1>
        {bajada && <p className="mt-1.5 text-base text-muted-foreground">{bajada}</p>}
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap gap-3">{acciones}</div>}
    </header>
  );
}
