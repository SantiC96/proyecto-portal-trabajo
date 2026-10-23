"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { revisarComprobante } from "@/app/admin/postulantes/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BotonesDialogo, DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";
import { Textarea } from "@/components/ui/textarea";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { ErrorCampo, Obligatorio, ariaErrorCampo } from "@/components/ui/obligatorio";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { MOTIVO_RECHAZO_COMPROBANTE_MAXIMO } from "@/lib/procedencia";
import { cn } from "@/lib/utils";

/** Botones "Aprobar" y "Rechazar" de un comprobante pendiente (solo la oficina). */
export function RevisarComprobante({
  archivoId,
  className,
  claseBoton,
  rechazarConBorde = false,
}: {
  archivoId: string;
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

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <DialogoConfirmacion
        textoBoton={
          <>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Aprobar
          </>
        }
        estiloBoton="primario"
        claseBoton={claseBoton}
        deshabilitado={pendiente}
        titulo="¿Aprobar el comprobante?"
        descripcion="El domicilio en Funes queda verificado y el postulante pasa a la máxima prioridad. Le avisamos por el portal y por email."
        textoConfirmar="Sí, aprobar"
        textoPendiente="Aprobando…"
        accion={() => revisarComprobante(archivoId, true)}
        onExito={() => router.refresh()}
      />

      <button
        type="button"
        onClick={() => cambiarRechazar(true)}
        disabled={pendiente}
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
          <DialogHeader>
            <DialogTitle>Rechazar el comprobante</DialogTitle>
            <DialogDescription>
              El postulante ve el motivo en su perfil y lo recibe por email, para que pueda subir
              otro comprobante.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="motivo-comprobante" className="text-sm font-medium text-foreground">
              Motivo <Obligatorio />
            </label>
            <Textarea
              id="motivo-comprobante"
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                campos.limpiar("motivo");
              }}
              placeholder="Ej: no se ve la dirección completa."
              maxLength={MOTIVO_RECHAZO_COMPROBANTE_MAXIMO}
              className="min-h-24"
              disabled={pendiente}
              {...ariaErrorCampo("motivo-comprobante", campos.errores.motivo)}
            />
            <ErrorCampo idCampo="motivo-comprobante" mensaje={campos.errores.motivo} />
            <ContadorCaracteres actual={motivo.length} maximo={MOTIVO_RECHAZO_COMPROBANTE_MAXIMO} />
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
