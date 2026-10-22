import { ExternalLink, FileText } from "lucide-react";
import type { CvVista } from "@/lib/cvs";
import type { CvDePostulacion } from "@/lib/admin/candidato";
import { CV_MAXIMOS, textoTamanoArchivo } from "@/lib/archivos";
import { formatFecha } from "@/lib/fechas";

function FilaCv({ cv, nota }: { cv: CvVista; nota?: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border bg-surface-tinted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="break-all text-sm font-medium text-foreground">{cv.nombreOriginal}</p>
          <p className="text-xs text-muted-foreground">
            {cv.tamano > 0 ? `${textoTamanoArchivo(cv.tamano)} · ` : ""}
            Subido el {formatFecha(cv.subidoEn)}
          </p>
          {nota && <p className="mt-0.5 text-xs text-muted-foreground">{nota}</p>}
        </div>
      </div>
      {cv.url ? (
        <a
          href={cv.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primario h-11 shrink-0 sm:h-9"
        >
          Ver CV
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      ) : (
        <span className="text-xs text-muted-foreground">El archivo ya no está disponible.</span>
      )}
    </div>
  );
}

/** CV de una postulación en la ficha de la oficina: el elegido o el respaldo. */
export function CvDePostulacionCard({ cvPostulacion }: { cvPostulacion: CvDePostulacion | null }) {
  const nota = !cvPostulacion
    ? undefined
    : !cvPostulacion.elegido
      ? "Esta postulación es anterior a la elección de CV: se muestra el más reciente del perfil."
      : cvPostulacion.eliminado
        ? "Elegido al postularse. El postulante lo eliminó después de su perfil."
        : "Elegido al postularse.";

  return (
    <div className="tarjeta p-5">
      <h2 className="font-semibold text-foreground">Currículum vitae</h2>
      <div className="mt-3">
        {cvPostulacion ? (
          <FilaCv cv={cvPostulacion.cv} nota={nota} />
        ) : (
          <p className="text-sm text-muted-foreground">El candidato retiró o eliminó su CV.</p>
        )}
      </div>
    </div>
  );
}

/** CVs disponibles del postulante en su ficha de la oficina. */
export function CvsDelPostulante({ cvs }: { cvs: CvVista[] }) {
  return (
    <div className="tarjeta p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-foreground">Currículum vitae</h2>
        {cvs.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {cvs.length} de {CV_MAXIMOS} CVs
          </span>
        )}
      </div>
      {cvs.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No tiene CVs cargados.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {cvs.map((cv) => (
            <li key={cv.id}>
              <FilaCv cv={cv} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
