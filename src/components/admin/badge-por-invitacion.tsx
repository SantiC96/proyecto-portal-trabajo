import { Mail } from "lucide-react";
import { ETIQUETA_POR_INVITACION } from "@/lib/invitaciones";
import { cn } from "@/lib/utils";

/**
 * Postulación que vino de una invitación de la oficina (postulaciones.origen,
 * migration_056). Solo la oficina la ve: para la empresa es una derivación
 * más.
 */
export function BadgePorInvitacion({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-blue-800",
        className,
      )}
    >
      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {ETIQUETA_POR_INVITACION}
    </span>
  );
}
