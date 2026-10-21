"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Info, Upload, X } from "lucide-react";
import { subirCV, eliminarCV } from "./actions";
import type { CvVista } from "@/lib/cvs";
import type { ErrorAccion } from "@/lib/resultado";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { Spinner } from "@/components/ui/spinner";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";
import { MensajeError, SectionTitle } from "@/components/perfil/piezas";
import { formatFecha } from "@/lib/fechas";
import { SECCION_PERFIL } from "@/lib/perfil-secciones";
import {
  CV_ACCEPT,
  CV_HELP_TEXT,
  CV_MAXIMOS,
  CV_MAX_SIZE,
  ERRORES_ARCHIVO,
  textoTamanoArchivo,
  validarTipoCV,
} from "@/lib/archivos";

/**
 * Sección "Curriculum Vitae" del perfil del postulante: hasta CV_MAXIMOS CVs
 * disponibles (migration_054), del más nuevo al más viejo.
 */
export function SeccionCvs({ cvs }: { cvs: CvVista[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const { pendiente: subiendo, ejecutar } = useAccion();
  // Solo errores de la validación del archivo en el navegador: los del servidor van en el toast.
  const [error, setError] = useState<ErrorAccion | null>(null);
  const [avisoLimite, setAvisoLimite] = useState(false);

  const enLimite = cvs.length >= CV_MAXIMOS;

  function abrirSelector() {
    setError(null);
    if (enLimite) {
      setAvisoLimite(true);
      return;
    }
    setAvisoLimite(false);
    inputRef.current?.click();
  }

  function subir(file: File) {
    setError(null);
    if (!validarTipoCV(file.type)) {
      setError({ mensaje: ERRORES_ARCHIVO.cvTipo });
      return;
    }
    if (file.size > CV_MAX_SIZE) {
      setError({ mensaje: ERRORES_ARCHIVO.cvTamano });
      return;
    }
    setArchivo(file);
    const fd = new FormData();
    fd.append("cv", file);
    ejecutar(async () => {
      try {
        const result = await subirCV(fd);
        mostrarAviso(result);
        if (result.ok) router.refresh();
      } finally {
        setArchivo(null);
      }
    });
  }

  const indicadorSubida = subiendo && (
    <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-surface-tinted px-4 py-3">
      <Spinner className="text-primary" />
      <div className="min-w-0 flex-1">
        <p className="break-all text-sm font-medium text-foreground">{archivo?.name}</p>
        <p className="text-xs text-muted-foreground">
          {archivo ? `${textoTamanoArchivo(archivo.size)} · PDF` : ""}
        </p>
      </div>
      <span className="shrink-0 text-sm text-primary">Subiendo CV…</span>
    </div>
  );

  return (
    <div
      id={SECCION_PERFIL.cvs}
      className="scroll-mt-20 rounded-2xl border border-border bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <SectionTitle>Curriculum Vitae</SectionTitle>
        {cvs.length > 0 && (
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {cvs.length} de {CV_MAXIMOS} CVs
          </span>
        )}
      </div>

      {cvs.length === 0 ? (
        <div className="mt-4 flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-secondary px-4 py-4">
            <p className="text-sm font-semibold text-foreground">Todavía no subiste tu CV</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Subí tu currículum en PDF para que las empresas y la oficina de empleo puedan conocer tu experiencia. Es un paso clave para postularte a las ofertas disponibles. Podés tener hasta {CV_MAXIMOS} CVs y elegir cuál usar en cada postulación.
            </p>
          </div>

          {indicadorSubida || (
            <button
              type="button"
              onClick={abrirSelector}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-background px-6 py-8 text-center transition hover:border-primary/50 hover:bg-surface-tinted"
            >
              <Upload className="h-8 w-8 text-muted-icon" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Hacé clic para seleccionar tu CV. Se sube automáticamente.
                </p>
                <p className="mt-1 text-xs text-muted-icon">{CV_HELP_TEXT}</p>
              </div>
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <ul className="flex flex-col gap-3">
            {cvs.map((cv) => (
              <li
                key={cv.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-surface-tinted px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="break-all text-sm font-medium text-foreground">
                      {cv.nombreOriginal}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cv.tamano > 0 ? `${textoTamanoArchivo(cv.tamano)} · ` : ""}
                      PDF · Subido el {formatFecha(cv.subidoEn)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {cv.url && (
                    <a
                      href={subiendo ? undefined : cv.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-disabled={subiendo}
                      tabIndex={subiendo ? -1 : undefined}
                      className={`btn-secundario inline-flex min-h-11 items-center gap-1.5 px-3 text-sm font-medium sm:min-h-9${subiendo ? " pointer-events-none opacity-60" : ""}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver
                    </a>
                  )}
                  <DialogoConfirmacion
                    textoBoton={
                      <>
                        <X className="h-4 w-4" />
                        Eliminar
                      </>
                    }
                    estiloBoton="peligro"
                    claseBoton="px-3 sm:min-h-9"
                    deshabilitado={subiendo}
                    titulo="¿Eliminar este CV?"
                    descripcion="Las postulaciones que ya hiciste con este CV no cambian."
                    textoConfirmar="Sí, eliminar"
                    textoPendiente="Eliminando…"
                    destructivo
                    accion={() => eliminarCV(cv.id)}
                    onExito={() => {
                      setAvisoLimite(false);
                      router.refresh();
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>

          {indicadorSubida}

          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={abrirSelector}
              disabled={subiendo}
              aria-busy={subiendo}
              aria-describedby={avisoLimite ? "aviso-limite-cvs" : undefined}
              className="btn-secundario inline-flex min-h-11 w-fit items-center gap-1.5 px-4 text-sm font-medium sm:min-h-9"
            >
              {subiendo ? <Spinner /> : <Upload className="h-4 w-4" />}
              {subiendo ? "Subiendo…" : "Subir CV"}
            </button>
            <p className="text-xs text-muted-icon">{CV_HELP_TEXT}</p>
          </div>
        </div>
      )}

      <div aria-live="polite" className="mt-4 empty:hidden">
        {avisoLimite && enLimite && (
          <div
            id="aviso-limite-cvs"
            className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{ERRORES_ARCHIVO.cvLimite}</span>
          </div>
        )}
        {error && <MensajeError error={error} />}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={CV_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) subir(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
