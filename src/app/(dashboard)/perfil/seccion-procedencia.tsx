"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Pencil,
  Upload,
  XCircle,
} from "lucide-react";
import { actualizarLocalidad, subirComprobanteDomicilio } from "./actions";
import type { ErrorAccion } from "@/lib/resultado";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BotonesDialogo } from "@/components/ui/dialogo-confirmacion";
import { CampoLectura, MensajeError, SectionTitle } from "@/components/perfil/piezas";
import { CampoLocalidad } from "@/components/postulantes/campo-localidad";
import { formatFecha } from "@/lib/fechas";
import {
  COMPROBANTE_ACCEPT,
  COMPROBANTE_HELP_TEXT,
  COMPROBANTE_MAX_SIZE,
  ERRORES_ARCHIVO,
  textoTamanoArchivo,
  validarTipoComprobante,
} from "@/lib/archivos";
import {
  OTRA_LOCALIDAD,
  esLocalidadFunes,
  opcionDeLocalidad,
  resolverLocalidad,
} from "@/lib/localidades";
import type { EstadoComprobante } from "@/lib/procedencia";
import { cn } from "@/lib/utils";

/** Comprobante vigente tal como lo recibe el cliente (sin la ruta). */
export type ComprobantePerfil = {
  nombreOriginal: string;
  subidoEn: string;
  tamano: number;
  estado: EstadoComprobante;
  motivo: string | null;
  url: string | null;
};

type CampoProcedencia = "localidad" | "otraLocalidad";
const CAMPOS: readonly CampoProcedencia[] = ["localidad", "otraLocalidad"];

const ESTADO_COMPROBANTE: Record<
  EstadoComprobante,
  { texto: string; Icono: typeof Clock; clase: string }
> = {
  pendiente: { texto: "En revisión", Icono: Clock, clase: "bg-amber-100 text-amber-900" },
  aprobado: { texto: "Verificado", Icono: CheckCircle2, clase: "bg-emerald-100 text-emerald-800" },
  rechazado: { texto: "Rechazado", Icono: XCircle, clase: "bg-red-100 text-red-700" },
};

/** Qué pasa con la verificación al cambiar de localidad (BLOQUE 5 de migration_055). */
function avisoCambioLocalidad(
  actual: string | null,
  nueva: string,
  comprobante: ComprobantePerfil | null,
): string {
  const eraFunes = esLocalidadFunes(actual);
  const esFunes = esLocalidadFunes(nueva);
  if (eraFunes && comprobante && !esFunes) {
    return "Tu comprobante de domicilio se va a eliminar: solo se usa para verificar domicilios en Funes.";
  }
  if (eraFunes && comprobante) {
    return "Tu comprobante de domicilio vuelve a quedar en revisión de la Oficina de Empleo.";
  }
  return "La verificación de tu domicilio se reinicia con la nueva localidad.";
}

/**
 * Sección "Procedencia" del perfil del postulante (migration_055): la
 * localidad editable y, si es Funes, el comprobante de domicilio con su
 * estado de verificación.
 */
export function SeccionProcedencia({
  localidad,
  comprobante,
}: {
  localidad: string | null;
  comprobante: ComprobantePerfil | null;
}) {
  const router = useRouter();
  const inicial = opcionDeLocalidad(localidad);

  const [editando, setEditando] = useState(localidad === null);
  const [elegida, setElegida] = useState(inicial.elegida);
  const [escrita, setEscrita] = useState(inicial.escrita);
  const [confirmarCambio, setConfirmarCambio] = useState<string | null>(null);
  const campos = useErroresCampo<CampoProcedencia>();
  const { pendiente: guardando, ejecutar: ejecutarGuardar } = useAccion();

  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<ErrorAccion | null>(null);
  const [confirmarReemplazo, setConfirmarReemplazo] = useState(false);
  const { pendiente: subiendo, ejecutar: ejecutarSubida } = useAccion();

  const esFunes = esLocalidadFunes(localidad);

  function cancelar() {
    setElegida(inicial.elegida);
    setEscrita(inicial.escrita);
    campos.limpiarTodos();
    setEditando(false);
  }

  function guardar(nueva: string) {
    ejecutarGuardar(async () => {
      const result = await actualizarLocalidad({ localidad: elegida, otraLocalidad: escrita });
      if (!campos.tomarDelServidor(result, CAMPOS)) mostrarAviso(result);
      if (!result.ok) return;
      setConfirmarCambio(null);
      // Lo escrito a mano puede coincidir con una de la lista ("perez" → "Pérez").
      const guardada = opcionDeLocalidad(result.data?.localidad ?? nueva);
      setElegida(guardada.elegida);
      setEscrita(guardada.escrita);
      setEditando(false);
      router.refresh();
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const obligatorios =
      elegida === OTRA_LOCALIDAD ? { localidad: elegida, otraLocalidad: escrita } : { localidad: elegida };
    if (!campos.validar(obligatorios, form)) return;

    const resuelta = resolverLocalidad(elegida, escrita);
    if (!resuelta.ok) {
      campos.marcar(resuelta.campo, resuelta.mensaje, form);
      return;
    }
    if (resuelta.localidad === localidad) {
      setEditando(false);
      return;
    }
    // Sin localidad previa no hay verificación que reiniciar.
    if (localidad === null) {
      guardar(resuelta.localidad);
      return;
    }
    setConfirmarCambio(resuelta.localidad);
  }

  function abrirSelector() {
    setErrorArchivo(null);
    if (comprobante?.estado === "aprobado") {
      setConfirmarReemplazo(true);
      return;
    }
    inputRef.current?.click();
  }

  function subir(file: File) {
    setErrorArchivo(null);
    if (!validarTipoComprobante(file.type)) {
      setErrorArchivo({ mensaje: ERRORES_ARCHIVO.comprobanteTipo });
      return;
    }
    if (file.size > COMPROBANTE_MAX_SIZE) {
      setErrorArchivo({ mensaje: ERRORES_ARCHIVO.comprobanteTamano });
      return;
    }
    setArchivo(file);
    const fd = new FormData();
    fd.append("comprobante", file);
    ejecutarSubida(async () => {
      try {
        const result = await subirComprobanteDomicilio(fd);
        mostrarAviso(result);
        if (result.ok) router.refresh();
      } finally {
        setArchivo(null);
      }
    });
  }

  const estado = comprobante ? ESTADO_COMPROBANTE[comprobante.estado] : null;

  return (
    <div
      id="procedencia"
      className="scroll-mt-20 rounded-2xl border border-border bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <SectionTitle>Procedencia</SectionTitle>
        {!editando && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="btn-secundario inline-flex min-h-11 items-center gap-1.5 px-3 text-xs font-medium sm:min-h-9"
          >
            <Pencil className="h-3.5 w-3.5" />
            Cambiar localidad
          </button>
        )}
      </div>

      {!editando ? (
        <CampoLectura label="Localidad" valor={localidad ?? ""} vacio="Sin informar" />
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <CampoLocalidad
            id="p-localidad"
            elegida={elegida}
            escrita={escrita}
            onElegida={(valor) => {
              setElegida(valor);
              campos.limpiar("localidad");
              campos.limpiar("otraLocalidad");
            }}
            onEscrita={(valor) => {
              setEscrita(valor);
              campos.limpiar("otraLocalidad");
            }}
            errorLocalidad={campos.errores.localidad}
            errorOtra={campos.errores.otraLocalidad}
            deshabilitado={guardando}
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={guardando}
              aria-busy={guardando}
              className="btn-primario min-h-11 justify-center px-6"
            >
              {guardando ? <Spinner /> : <CheckCircle2 className="h-4 w-4" />}
              {guardando ? "Guardando…" : "Guardar localidad"}
            </button>
            {localidad !== null && (
              <button
                type="button"
                onClick={cancelar}
                disabled={guardando}
                className="btn-secundario inline-flex min-h-11 items-center justify-center px-6 text-sm font-medium"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      {esFunes && (
        <div className="mt-6 border-t border-border pt-5">
          <h3 className="text-sm font-semibold text-foreground">Comprobante de domicilio</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Cualquier documento donde figure tu dirección en Funes (por ejemplo, una factura de
            un servicio). Lo revisa la Oficina de Empleo.
          </p>

          {comprobante && estado ? (
            <div className="mt-3 flex flex-col gap-3 rounded-xl border border-border bg-surface-tinted px-4 py-3">
              <div className="flex min-w-0 items-start gap-3">
                <FileText className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="break-all text-sm font-medium text-foreground">
                    {comprobante.nombreOriginal}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {comprobante.tamano > 0 ? `${textoTamanoArchivo(comprobante.tamano)} · ` : ""}
                    Subido el {formatFecha(comprobante.subidoEn)}
                  </p>
                  {comprobante.estado === "rechazado" ? (
                    <p className="mt-2 flex items-start gap-1.5 whitespace-pre-line break-words text-sm font-medium text-red-700">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>
                        Rechazado{comprobante.motivo ? `: ${comprobante.motivo}` : ""}
                      </span>
                    </p>
                  ) : (
                    <p
                      className={cn(
                        "mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                        estado.clase,
                      )}
                    >
                      <estado.Icono className="h-3.5 w-3.5" aria-hidden="true" />
                      {estado.texto}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {comprobante.url && (
                  <a
                    href={subiendo ? undefined : comprobante.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={subiendo}
                    tabIndex={subiendo ? -1 : undefined}
                    className={cn(
                      "btn-secundario inline-flex min-h-11 items-center gap-1.5 px-3 text-sm font-medium sm:min-h-9",
                      subiendo && "pointer-events-none opacity-60",
                    )}
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    Ver
                  </a>
                )}
                <button
                  type="button"
                  onClick={abrirSelector}
                  disabled={subiendo}
                  aria-busy={subiendo}
                  className="btn-secundario inline-flex min-h-11 items-center gap-1.5 px-3 text-sm font-medium sm:min-h-9"
                >
                  {subiendo ? <Spinner /> : <Upload className="h-4 w-4" aria-hidden="true" />}
                  {subiendo ? "Subiendo…" : "Reemplazar"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">Todavía no subiste un comprobante.</p>
              <button
                type="button"
                onClick={abrirSelector}
                disabled={subiendo}
                aria-busy={subiendo}
                className="btn-secundario mt-2 inline-flex min-h-11 w-fit items-center gap-1.5 px-4 text-sm font-medium sm:min-h-9"
              >
                {subiendo ? <Spinner /> : <Upload className="h-4 w-4" aria-hidden="true" />}
                {subiendo ? "Subiendo…" : "Subir comprobante"}
              </button>
            </div>
          )}

          {subiendo && archivo && (
            <p className="mt-2 break-all text-xs text-muted-foreground" aria-live="polite">
              Subiendo {archivo.name} ({textoTamanoArchivo(archivo.size)})…
            </p>
          )}
          <p className="mt-2 text-xs text-muted-icon">{COMPROBANTE_HELP_TEXT}</p>
          <div aria-live="polite" className="mt-3 empty:hidden">
            {errorArchivo && <MensajeError error={errorArchivo} />}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={COMPROBANTE_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) subir(file);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {/* Confirmación: cambiar la localidad reinicia la verificación */}
      <Dialog
        open={confirmarCambio !== null}
        onOpenChange={(abierto) => {
          if (guardando) return;
          if (!abierto) setConfirmarCambio(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cambiar tu localidad a {confirmarCambio}?</DialogTitle>
            <DialogDescription>
              {confirmarCambio !== null &&
                avisoCambioLocalidad(localidad, confirmarCambio, comprobante)}
            </DialogDescription>
          </DialogHeader>
          <BotonesDialogo
            pendiente={guardando}
            onCancelar={() => setConfirmarCambio(null)}
            onConfirmar={() => confirmarCambio !== null && guardar(confirmarCambio)}
            textoConfirmar="Sí, cambiar"
            textoPendiente="Guardando…"
          />
        </DialogContent>
      </Dialog>

      {/* Confirmación: reemplazar un comprobante ya verificado */}
      <Dialog
        open={confirmarReemplazo}
        onOpenChange={(abierto) => setConfirmarReemplazo(abierto)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Reemplazar tu comprobante verificado?</DialogTitle>
            <DialogDescription>
              Tu domicilio deja de figurar como verificado hasta que la Oficina de Empleo revise
              el comprobante nuevo.
            </DialogDescription>
          </DialogHeader>
          <BotonesDialogo
            pendiente={false}
            onCancelar={() => setConfirmarReemplazo(false)}
            onConfirmar={() => {
              setConfirmarReemplazo(false);
              inputRef.current?.click();
            }}
            textoConfirmar="Elegir archivo"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
