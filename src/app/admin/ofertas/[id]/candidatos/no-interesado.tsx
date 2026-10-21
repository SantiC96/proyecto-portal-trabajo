"use client";

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * "No interesado" de la última invitación rechazada. Si la persona dejó un
 * motivo, se ve al pasar el mouse, al tocar o al activar el aviso con el
 * teclado (es un botón que abre un popover).
 */
export function NoInteresado({ motivo, className }: { motivo: string | null; className: string }) {
  const clase = cn(
    "inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-md)] border px-3 text-sm font-medium sm:min-h-9",
    className,
  );
  const texto = motivo?.trim();

  if (!texto) return <p className={cn(clase, "w-fit")}>No interesado</p>;

  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        aria-label="No interesado. Ver el motivo"
        className={cn(clase, "cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30")}
      >
        No interesado
        <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-auto max-w-72">
        <p className="break-words">
          <span className="font-medium">Motivo:</span> {texto}
        </p>
      </PopoverContent>
    </Popover>
  );
}
