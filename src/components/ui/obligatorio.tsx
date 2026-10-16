import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Marca de campo obligatorio. Va dentro del <label>, después del texto:
 * `<label>Nombre <Obligatorio /></label>`. Es la única forma de marcar
 * campos obligatorios en los formularios del portal.
 */
export function Obligatorio({ className }: { className?: string }) {
  return (
    <span className={cn("font-normal text-red-600", className)}>
      <span aria-hidden="true">*</span>
      <span className="sr-only">(obligatorio)</span>
    </span>
  );
}

/** Borde rojo de un control con aria-invalid (lo trae Input; para inputs y selects nativos). */
export const CLASE_CONTROL_INVALIDO =
  "aria-invalid:border-red-500 aria-invalid:ring-2 aria-invalid:ring-red-500/20";

/** id del mensaje de error de un campo, para aria-describedby. */
export function idErrorCampo(idCampo: string): string {
  return `${idCampo}-error`;
}

/** aria-invalid y aria-describedby del control cuando el campo tiene error. */
export function ariaErrorCampo(idCampo: string, mensaje: string | null | undefined) {
  return mensaje
    ? { "aria-invalid": true as const, "aria-describedby": idErrorCampo(idCampo) }
    : {};
}

/** Mensaje de error debajo de un campo (validación propia o error del servidor). */
export function ErrorCampo({
  idCampo,
  mensaje,
  className,
}: {
  idCampo: string;
  mensaje: string | null | undefined;
  className?: string;
}) {
  if (!mensaje) return null;
  return (
    <p
      id={idErrorCampo(idCampo)}
      className={cn("flex items-start gap-1.5 text-xs text-red-600", className)}
    >
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {mensaje}
    </p>
  );
}
