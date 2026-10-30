import { ExternalLink } from "lucide-react";

/**
 * "Ver CV" o "Ver comprobante" de una FilaArchivoPerfil en las fichas de la
 * oficina: abre la URL firmada en otra pestaña. Sin URL, el aviso de que el
 * archivo ya no está disponible.
 */
export function BotonVerArchivo({
  url,
  texto,
  etiqueta,
}: {
  url: string | null;
  texto: string;
  /** Nombre accesible, si en la pantalla hay varios botones iguales ("Ver CV curriculum.pdf"). */
  etiqueta?: string;
}) {
  if (!url) {
    return <span className="text-sm text-muted-foreground">El archivo ya no está disponible.</span>;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={etiqueta ? `${etiqueta} (se abre en otra pestaña)` : undefined}
      className="btn-neutro w-full sm:w-auto"
    >
      {texto}
      <ExternalLink aria-hidden="true" />
      {!etiqueta && <span className="sr-only">(se abre en otra pestaña)</span>}
    </a>
  );
}
