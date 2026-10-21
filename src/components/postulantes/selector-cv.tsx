"use client";

import { ExternalLink, FileText } from "lucide-react";
import { formatFecha } from "@/lib/fechas";
import type { CvVista } from "@/lib/cvs";
import { cn } from "@/lib/utils";

type Props = {
  /** CVs disponibles, del más nuevo al más viejo. */
  cvs: CvVista[];
  /** El CV elegido (el más reciente por defecto, lo decide quien lo usa). */
  elegido: CvVista | null;
  onElegir: (cvId: string) => void;
  deshabilitado?: boolean;
  leyenda?: string;
};

/**
 * Elección del CV con el que se postula (migration_054). Con un solo CV lo
 * muestra; con varios, una opción por CV. Lo usan "Postularme" y "Me
 * interesa" de una invitación.
 */
export function SelectorCv({
  cvs,
  elegido,
  onElegir,
  deshabilitado = false,
  leyenda = "¿Con qué CV te postulás?",
}: Props) {
  if (cvs.length === 1 && elegido) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-tinted px-4 py-3">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <DatosCv cv={elegido} />
      </div>
    );
  }

  return (
    <fieldset disabled={deshabilitado} className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium text-foreground">{leyenda}</legend>
      {cvs.map((cv) => {
        const esElegido = cv.id === elegido?.id;
        return (
          <label
            key={cv.id}
            className={cn(
              "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition",
              esElegido
                ? "border-primary bg-surface-tinted"
                : "border-border bg-surface hover:bg-surface-tinted",
            )}
          >
            <input
              type="radio"
              name="cv-postulacion"
              value={cv.id}
              checked={esElegido}
              onChange={() => onElegir(cv.id)}
              className="mt-1 h-4 w-4 shrink-0 accent-primary"
            />
            <DatosCv cv={cv} />
          </label>
        );
      })}
    </fieldset>
  );
}

function DatosCv({ cv }: { cv: CvVista }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="break-all text-sm font-medium text-foreground">{cv.nombreOriginal}</p>
      <p className="text-xs text-muted-foreground">Subido el {formatFecha(cv.subidoEn)}</p>
      {cv.url && (
        <a
          href={cv.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline sm:min-h-0"
        >
          Ver CV
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
