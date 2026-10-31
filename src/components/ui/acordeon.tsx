import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Lista de desplegables en una tarjeta, separados por una línea. */
export function Acordeon({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("tarjeta divide-y divide-border", className)}>{children}</div>;
}

/**
 * Un desplegable con details/summary: se abre con clic, Enter o Espacio, y el
 * lector de pantalla anuncia si está abierto, sin JavaScript.
 */
export function ItemAcordeon({ titulo, children }: { titulo: ReactNode; children: ReactNode }) {
  return (
    <details className="group">
      <summary className="flex min-h-11 list-none items-center justify-between gap-3 rounded-[var(--radius-xl)] px-4 py-3.5 text-base font-bold text-heading outline-none hover:text-primary focus-visible:shadow-[var(--sombra-foco)] sm:px-6 [&::-webkit-details-marker]:hidden">
        {titulo}
        <ChevronDown
          className="size-5 shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="px-4 pb-4 text-[15px] leading-relaxed text-texto-parrafo sm:px-6">
        {children}
      </div>
    </details>
  );
}
