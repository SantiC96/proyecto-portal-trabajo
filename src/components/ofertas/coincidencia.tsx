import { FileText, Tag } from "lucide-react";
import {
  COINCIDENCIA,
  motivosCoincidencia,
  nivelCoincidencia,
  type DatosCoincidencia,
} from "@/lib/invitaciones";
import { Badge } from "@/components/ui/badge";
import { EtiquetaRubro } from "@/components/ui/etiqueta-rubro";
import { cn } from "@/lib/utils";

// Coincidencia entre una oferta y un postulante (puntaje_coincidencia,
// migration_058): la búsqueda de la oficina y las ofertas recomendadas del
// postulante muestran el mismo badge y los mismos motivos.

export function BadgeCoincidencia({ nivel, puntaje }: { nivel: string; puntaje: number }) {
  const coincidencia = COINCIDENCIA[nivelCoincidencia(nivel)];
  return (
    <Badge tono={coincidencia.tono}>
      {coincidencia.label}
      <span className="sr-only">, puntaje {puntaje} de 100</span>
    </Badge>
  );
}

export function MotivosCoincidencia({
  datos,
  className,
}: {
  datos: DatosCoincidencia;
  className?: string;
}) {
  const motivos = motivosCoincidencia(datos);
  if (motivos.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label="Por qué coincide">
      {motivos.map((motivo) => (
        <li key={motivo} className="max-w-full">
          <EtiquetaRubro verde>
            {motivo.startsWith("Tiene CV") ? (
              <FileText className="size-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <Tag className="size-3.5 shrink-0" aria-hidden="true" />
            )}
            <span className="break-words">{motivo}</span>
          </EtiquetaRubro>
        </li>
      ))}
    </ul>
  );
}
