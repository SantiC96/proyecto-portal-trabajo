"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Upload, X } from "lucide-react";
import { subirCV, eliminarCV } from "./actions";
import type { CvVista } from "@/lib/cvs";
import type { ErrorAccion } from "@/lib/resultado";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { Spinner } from "@/components/ui/spinner";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";
import { MensajeError, SeccionPerfil } from "@/components/perfil/piezas";
import { Franja } from "@/components/ui/franja";
import { cn } from "@/lib/utils";
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
 * Sección "CVs" del perfil del postulante: hasta CV_MAXIMOS CVs
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
    <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-primary bg-opcion-elegida px-4 py-3">
      <Spinner className="text-primary" />
      <div className="min-w-0 flex-1">
        <p className="break-all text-[15px] font-bold text-heading">{archivo?.name}</p>
        <p className="text-[13px] text-muted-foreground">
          {archivo ? `${textoTamanoArchivo(archivo.size)} · PDF` : ""}
        </p>
      </div>
      <span className="shrink-0 text-sm font-semibold text-primary">Subiendo CV…</span>
    </div>
  );

  return (
    <SeccionPerfil
      id={SECCION_PERFIL.cvs}
      titulo="CVs"
      ayuda={`Podés tener hasta ${CV_MAXIMOS} CVs y elegir cuál usar en cada postulación.`}
    >
      {cvs.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface-tinted px-4 py-4">
          <p className="text-[15px] font-bold text-heading">Todavía no subiste tu CV</p>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Subí tu currículum en PDF para que las empresas y la oficina de empleo puedan conocer tu experiencia. Es un paso clave para postularte a las ofertas disponibles.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {cvs.map((cv) => (
            <li
              key={cv.id}
              className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <FileText className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="break-all text-[15px] font-bold text-heading">
                    {cv.nombreOriginal}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {cv.tamano > 0 ? `${textoTamanoArchivo(cv.tamano)} · ` : ""}
                    PDF · Cargado el {formatFecha(cv.subidoEn)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                {cv.url && (
                  <a
                    href={subiendo ? undefined : cv.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={subiendo}
                    tabIndex={subiendo ? -1 : undefined}
                    className={cn("btn-neutro sm:min-h-10!", subiendo && "pointer-events-none")}
                  >
                    <ExternalLink aria-hidden="true" />
                    Ver
                  </a>
                )}
                <DialogoConfirmacion
                  textoBoton={
                    <>
                      <X aria-hidden="true" />
                      Eliminar
                    </>
                  }
                  estiloBoton="peligroBorde"
                  claseBoton="sm:min-h-10!"
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
      )}

      {indicadorSubida}

      <div aria-live="polite" className="flex flex-col gap-3 empty:hidden">
        {avisoLimite && enLimite && (
          <Franja id="aviso-limite-cvs" tono="aviso">
            {ERRORES_ARCHIVO.cvLimite}
          </Franja>
        )}
        {error && <MensajeError error={error} />}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[15px] text-muted-foreground-strong" aria-live="polite">
          Tenés {cvs.length} de {CV_MAXIMOS} CVs cargados.
          <span className="block text-[13px] text-muted-foreground">{CV_HELP_TEXT}</span>
        </p>
        <button
          type="button"
          onClick={abrirSelector}
          disabled={subiendo}
          aria-busy={subiendo}
          aria-describedby={avisoLimite ? "aviso-limite-cvs" : undefined}
          className="btn-secundario"
        >
          {subiendo ? <Spinner /> : <Upload aria-hidden="true" />}
          {subiendo ? "Subiendo…" : "Subir CV"}
        </button>
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
    </SeccionPerfil>
  );
}
