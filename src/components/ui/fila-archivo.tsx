import type { ReactNode } from "react";
import { ExternalLink, FileText } from "lucide-react";

/**
 * Un archivo dentro de una tarjeta (el CV de una postulación): ícono, nombre,
 * detalle ("Cargado el …") y el botón para abrirlo en otra pestaña. Sin URL,
 * en lugar del botón va un aviso de que el archivo no está disponible.
 */
export function FilaArchivo({
  nombre,
  detalle,
  nota,
  url,
  textoBoton,
}: {
  nombre: string;
  detalle: ReactNode;
  /** Aclaración debajo del detalle. */
  nota?: ReactNode;
  url: string | null;
  textoBoton: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-secondary text-primary"
        >
          <FileText className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-bold break-all text-heading">{nombre}</p>
          <p className="text-sm text-muted-foreground">{detalle}</p>
          {nota && <p className="mt-0.5 text-[13px] text-muted-foreground">{nota}</p>}
        </div>
      </div>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-neutro w-full shrink-0 sm:w-auto"
        >
          {textoBoton}
          <ExternalLink aria-hidden="true" />
          <span className="sr-only">(se abre en otra pestaña)</span>
        </a>
      ) : (
        <span className="text-sm text-muted-foreground">El archivo ya no está disponible.</span>
      )}
    </div>
  );
}
