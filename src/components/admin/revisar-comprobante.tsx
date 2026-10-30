"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleCheck, XCircle } from "lucide-react";
import { revisarComprobante } from "@/app/admin/postulantes/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogResumen,
  DialogTitle,
} from "@/components/ui/dialog";
import { BotonesDialogo, DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { Textarea } from "@/components/ui/textarea";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { ErrorCampo, Obligatorio, ariaErrorCampo } from "@/components/ui/obligatorio";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { MOTIVO_RECHAZO_COMPROBANTE_MAXIMO } from "@/lib/procedencia";
import { cn } from "@/lib/utils";

/** Datos del postulante para el resumen de los diálogos y el nombre accesible de los botones. */
export type PostulanteComprobante = {
  nombre: string;
  iniciales?: string;
  dni: string | null;
  /** Fecha de carga ya formateada. */
  cargadoEl: string;
};

/** Botones "Aprobar" y "Rechazar" de un comprobante pendiente (solo la oficina). */
export function RevisarComprobante({
  archivoId,
  postulante,
  className,
  claseBoton,
  rechazarConBorde = false,
}: {
  archivoId: string;
  /** En un listado (varios comprobantes en pantalla): resumen en los diálogos y aria-label con el nombre. */
  postulante?: PostulanteComprobante;
  /** Contenedor de los dos botones; por defecto, uno al lado del otro con wrap. */
  className?: string;
  claseBoton?: string;
  /** "Rechazar" blanco con borde rojo en lugar del rojo lleno (listado de comprobantes). */
  rechazarConBorde?: boolean;
}) {
  const router = useRouter();
  const [abrirRechazar, setAbrirRechazar] = useState(false);
  const [motivo, setMotivo] = useState("");
  const campos = useErroresCampo<"motivo">();
  const { pendiente, ejecutar } = useAccion();

  function cambiarRechazar(abierto: boolean) {
    if (pendiente) return;
    setAbrirRechazar(abierto);
    if (!abierto) {
      setMotivo("");
      campos.limpiarTodos();
    }
  }

  function rechazar() {
    if (!campos.validar({ motivo })) return;
    ejecutar(async () => {
      const resultado = await revisarComprobante(archivoId, false, motivo.trim());
      if (!campos.tomarDelServidor(resultado, ["motivo"])) mostrarAviso(resultado);
      if (!resultado.ok) return;
      setAbrirRechazar(false);
      setMotivo("");
      router.refresh();
    });
  }

  const resumen = postulante && (
    <div className="flex items-center gap-3">
      <AvatarAjustado iniciales={postulante.iniciales} alt="" size="lista" />
      <div className="min-w-0">
        <p className="font-bold break-words text-heading">{postulante.nombre}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          <span className="tabular-nums">DNI {postulante.dni ?? "—"}</span> · Cargado el{" "}
          {postulante.cargadoEl}
        </p>
      </div>
    </div>
  );

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <DialogoConfirmacion
        textoBoton={
          <>
            <Check className="h-4 w-4" aria-hidden="true" />
            Aprobar
          </>
        }
        estiloBoton="primario"
        claseBoton={claseBoton}
        etiquetaBoton={postulante ? `Aprobar el comprobante de ${postulante.nombre}` : undefined}
        deshabilitado={pendiente}
        titulo="¿Aprobar el comprobante?"
        descripcion="El domicilio en Funes queda verificado y el postulante pasa a la máxima prioridad. Le avisamos por el portal y por email."
        icono={CircleCheck}
        tonoIcono="primario"
        resumen={resumen}
        textoConfirmar="Sí, aprobar"
        textoPendiente="Aprobando…"
        accion={() => revisarComprobante(archivoId, true)}
        onExito={() => router.refresh()}
      />

      <button
        type="button"
        onClick={() => cambiarRechazar(true)}
        disabled={pendiente}
        aria-label={postulante ? `Rechazar el comprobante de ${postulante.nombre}` : undefined}
        className={cn(
          rechazarConBorde
            ? "btn-peligro-borde"
            : "btn-peligro inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-medium",
          claseBoton,
        )}
      >
        <XCircle className="h-4 w-4" aria-hidden="true" />
        Rechazar
      </button>

      <Dialog open={abrirRechazar} onOpenChange={cambiarRechazar}>
        <DialogContent>
          <DialogHeader icono={XCircle} tonoIcono="peligro">
            <DialogTitle>Rechazar el comprobante</DialogTitle>
            <DialogDescription>
              El postulante ve el motivo en su perfil y lo recibe por email, para que pueda subir
              otro comprobante.
            </DialogDescription>
          </DialogHeader>
          {resumen && <DialogResumen>{resumen}</DialogResumen>}
          <div className="flex flex-col gap-2">
            <label htmlFor={`motivo-comprobante-${archivoId}`} className="etiqueta-campo">
              Motivo <Obligatorio />
            </label>
            <Textarea
              id={`motivo-comprobante-${archivoId}`}
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                campos.limpiar("motivo");
              }}
              placeholder="Por ejemplo: no se ve la dirección completa."
              maxLength={MOTIVO_RECHAZO_COMPROBANTE_MAXIMO}
              className="min-h-24"
              disabled={pendiente}
              {...ariaErrorCampo(`motivo-comprobante-${archivoId}`, campos.errores.motivo)}
            />
            <div className="flex items-start justify-between gap-3">
              <ErrorCampo idCampo={`motivo-comprobante-${archivoId}`} mensaje={campos.errores.motivo} />
              <ContadorCaracteres
                className="ml-auto shrink-0"
                actual={motivo.length}
                maximo={MOTIVO_RECHAZO_COMPROBANTE_MAXIMO}
              />
            </div>
          </div>
          <BotonesDialogo
            pendiente={pendiente}
            onCancelar={() => cambiarRechazar(false)}
            onConfirmar={rechazar}
            textoConfirmar="Rechazar comprobante"
            textoPendiente="Guardando…"
            destructivo
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
