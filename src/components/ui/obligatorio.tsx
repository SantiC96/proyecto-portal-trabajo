import { cn } from "@/lib/utils";

/**
 * Marca de campo obligatorio. Va dentro del <label>, después del texto:
 * `<label>Nombre <Obligatorio /></label>`. Es la única forma de marcar
 * campos obligatorios en los formularios del portal.
 */
export function Obligatorio({ className }: { className?: string }) {
  return (
    <span className={cn("text-xs font-normal text-red-600", className)}>
      (obligatorio)
    </span>
  );
}
