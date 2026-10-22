import { ExternalLink, FileText } from "lucide-react";
import type { ComprobanteVista } from "@/lib/comprobantes";
import type { NivelPrioridad } from "@/lib/procedencia";
import { esLocalidadFunes } from "@/lib/localidades";
import { textoTamanoArchivo } from "@/lib/archivos";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import { BadgeProcedencia } from "@/components/postulantes/badge-procedencia";
import { RevisarComprobante } from "@/components/admin/revisar-comprobante";

const ESTADO_TEXTO = {
  pendiente: "Pendiente de revisión",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
} as const;

/**
 * Sección "Procedencia" de las fichas de la oficina (migration_055): la
 * localidad, el nivel de prioridad y el comprobante de domicilio con su URL
 * firmada, y los botones para revisarlo cuando está pendiente.
 */
export function ProcedenciaCandidato({
  localidad,
  nivel,
  comprobante,
}: {
  localidad: string | null;
  nivel: NivelPrioridad;
  comprobante: ComprobanteVista | null;
}) {
  const esFunes = esLocalidadFunes(localidad);

  return (
    <div className="tarjeta p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-foreground">Procedencia</h2>
        <BadgeProcedencia
          nivel={nivel}
          localidad={localidad}
          comprobante={comprobante?.estado ?? null}
        />
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Localidad</dt>
          <dd className="mt-0.5 break-words text-foreground">{localidad ?? "Sin informar"}</dd>
        </div>
        {esFunes && (
          <div>
            <dt className="text-muted-foreground">Comprobante de domicilio</dt>
            <dd className="mt-0.5 text-foreground">
              {comprobante ? ESTADO_TEXTO[comprobante.estado] : "No subió ninguno"}
            </dd>
          </div>
        )}
      </dl>

      {esFunes && comprobante && (
        <div className="mt-4 flex flex-col gap-3 rounded-[var(--radius-md)] border border-border bg-surface-tinted px-4 py-3">
          <div className="flex min-w-0 items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0">
              <p className="break-all text-sm font-medium text-foreground">
                {comprobante.nombreOriginal}
              </p>
              <p className="text-xs text-muted-foreground">
                {comprobante.tamano > 0 ? `${textoTamanoArchivo(comprobante.tamano)} · ` : ""}
                {comprobante.esImagen ? "Imagen" : "PDF"} · Subido el{" "}
                {formatFecha(comprobante.subidoEn)}
              </p>
              {comprobante.revisadoEn && (
                <p className="text-xs text-muted-foreground">
                  Revisado el {formatFechaHora(comprobante.revisadoEn)}
                </p>
              )}
              {comprobante.estado === "rechazado" && comprobante.motivo && (
                <p className="mt-1 whitespace-pre-line break-words text-xs text-danger">
                  Motivo: {comprobante.motivo}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {comprobante.url ? (
              <a
                href={comprobante.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secundario inline-flex min-h-11 items-center gap-1.5 px-4 text-sm font-medium"
              >
                Ver comprobante
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">El archivo no está disponible.</span>
            )}
            {comprobante.estado === "pendiente" && <RevisarComprobante archivoId={comprobante.id} />}
          </div>
        </div>
      )}
    </div>
  );
}
