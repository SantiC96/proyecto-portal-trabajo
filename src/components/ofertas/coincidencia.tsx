import { FileText, Tag } from "lucide-react";
import {
  COINCIDENCIA,
  motivosCoincidencia,
  nivelCoincidencia,
  type DatosCoincidencia,
} from "@/lib/invitaciones";
import { cn } from "@/lib/utils";

// Coincidencia entre una oferta y un postulante (puntaje_coincidencia,
// migration_058): la búsqueda de la oficina y las ofertas recomendadas del
// postulante muestran el mismo badge y los mismos motivos.

export function BadgeCoincidencia({ nivel, puntaje }: { nivel: string; puntaje: number }) {
  const coincidencia = COINCIDENCIA[nivelCoincidencia(nivel)];
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        coincidencia.className,
      )}
    >
      {coincidencia.label}
      <span className="sr-only">, puntaje {puntaje} de 100</span>
    </span>
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
        <li
          key={motivo}
          className="inline-flex max-w-full items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground-strong"
        >
          {motivo.startsWith("Tiene CV") ? (
            <FileText className="h-3 w-3 shrink-0" aria-hidden="true" />
          ) : (
            <Tag className="h-3 w-3 shrink-0" aria-hidden="true" />
          )}
          <span className="break-words">{motivo}</span>
        </li>
      ))}
    </ul>
  );
}
