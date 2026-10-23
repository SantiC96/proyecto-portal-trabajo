"use client";

import { FileText } from "lucide-react";
import { formatFecha } from "@/lib/fechas";
import type { CvVista } from "@/lib/cvs";
import { OpcionRadio } from "@/components/ui/opcion-radio";

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
 * Elección del CV con el que se postula (migration_054): una opción tipo
 * radio por CV, con su nombre, la fecha de carga y el link para verlo. Lo usan
 * "Postularme" y "Me interesa" de una invitación.
 */
export function SelectorCv({
  cvs,
  elegido,
  onElegir,
  deshabilitado = false,
  leyenda = "¿Con qué CV te postulás?",
}: Props) {
  return (
    <fieldset disabled={deshabilitado} className="flex min-w-0 flex-col gap-2">
      <legend className="sr-only">{leyenda}</legend>
      {cvs.map((cv) => (
        <OpcionRadio
          key={cv.id}
          name="cv-postulacion"
          value={cv.id}
          checked={cv.id === elegido?.id}
          onChange={() => onElegir(cv.id)}
          extra={
            cv.url && (
              <a
                href={cv.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-2 text-sm font-bold text-primary underline-offset-2 outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]"
              >
                Ver<span className="sr-only"> {cv.nombreOriginal} (se abre en otra pestaña)</span>
              </a>
            )
          }
        >
          <span className="flex min-w-0 items-start gap-2.5">
            <FileText className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block break-all text-[15px] font-bold text-heading">
                {cv.nombreOriginal}
              </span>
              <span className="block text-[13px] text-muted-foreground">
                Cargado el {formatFecha(cv.subidoEn)}
              </span>
            </span>
          </span>
        </OpcionRadio>
      ))}
    </fieldset>
  );
}
