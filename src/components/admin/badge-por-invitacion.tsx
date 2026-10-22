import { Mail } from "lucide-react";
import { ETIQUETA_POR_INVITACION } from "@/lib/invitaciones";
import { Badge } from "@/components/ui/badge";

/**
 * Postulación que vino de una invitación de la oficina (postulaciones.origen,
 * migration_056). Solo la oficina la ve: para la empresa es una derivación
 * más.
 */
export function BadgePorInvitacion({ className }: { className?: string }) {
  return (
    <Badge tono="warning" icono={Mail} className={className}>
      {ETIQUETA_POR_INVITACION}
    </Badge>
  );
}
