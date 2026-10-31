"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogResumen,
  DialogTitle,
} from "@/components/ui/dialog";
import { BotonesDialogo } from "@/components/ui/dialogo-confirmacion";
import { aprobarEmpresa, rechazarEmpresa } from "../actions";
import { mostrarAviso } from "@/lib/avisos";
import type { EstadoAprobacion } from "@/lib/admin/historial-empresa";
import { useAccion } from "@/lib/use-accion";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { LARGO_MAXIMO } from "@/lib/validaciones";
import {
  ErrorCampo,
  Obligatorio,
  ariaErrorCampo,
} from "@/components/ui/obligatorio";
import { useErroresCampo } from "@/lib/use-errores-campo";

type Props = {
  empresaId: string;
  razonSocial: string;
  /** CUIT ya formateado, para el resumen de los diálogos. */
  cuit: string;
  estadoActual: EstadoAprobacion;
};

/**
 * Botones de la decisión sobre una empresa, con sus diálogos de
 * confirmación. Como hasta ahora, una empresa rechazada se puede aprobar y una
 * aprobada se puede rechazar.
 */
export function EmpresaAcciones({ empresaId, razonSocial, cuit, estadoActual }: Props) {
  const router = useRouter();
  const [abrirAprobar, setAbrirAprobar] = useState(false);
  const [abrirRechazar, setAbrirRechazar] = useState(false);
  const [motivo, setMotivo] = useState("");
  const campos = useErroresCampo<"motivo">();
  const { pendiente: isPending, ejecutar } = useAccion();

  function handleAbrirRechazar(open: boolean) {
    if (isPending) return;
    setAbrirRechazar(open);
    if (!open) {
      setMotivo("");
      campos.limpiarTodos();
    }
  }

  function handleAbrirAprobar(open: boolean) {
    if (isPending) return;
    setAbrirAprobar(open);
  }

  function handleAprobar() {
    ejecutar(async () => {
      const resultado = await aprobarEmpresa(empresaId);
      mostrarAviso(resultado);
      if (resultado.ok) {
        setAbrirAprobar(false);
        router.refresh();
      }
    });
  }

  function handleRechazar() {
    if (!campos.validar({ motivo })) return;
    ejecutar(async () => {
      const resultado = await rechazarEmpresa(empresaId, motivo.trim());
      if (!campos.tomarDelServidor(resultado, ["motivo"])) mostrarAviso(resultado);
      if (resultado.ok) {
        setAbrirRechazar(false);
        setMotivo("");
        router.refresh();
      }
    });
  }

  const resumen = (
    <DialogResumen>
      <p className="font-bold break-words text-heading">{razonSocial}</p>
      <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">CUIT {cuit}</p>
    </DialogResumen>
  );

  return (
    <div className="flex flex-col gap-3">
      {estadoActual !== "aprobada" && (
        <button
          type="button"
          onClick={() => handleAbrirAprobar(true)}
          disabled={isPending}
          className="btn-primario w-full"
        >
          Aprobar
        </button>
      )}
      {estadoActual !== "rechazada" && (
        <button
          type="button"
          onClick={() => handleAbrirRechazar(true)}
          disabled={isPending}
          className="btn-peligro-borde w-full"
        >
          Rechazar
        </button>
      )}

      {/* Dialog: Aprobar */}
      <Dialog open={abrirAprobar} onOpenChange={handleAbrirAprobar}>
        <DialogContent>
          <DialogHeader icono={CircleCheck} tonoIcono="primario">
            <DialogTitle>Aprobar empresa</DialogTitle>
            <DialogDescription>
              ¿Confirmás la aprobación de{" "}
              <span className="font-semibold text-foreground">{razonSocial}</span>?
              La empresa va a poder acceder al portal y publicar ofertas.
            </DialogDescription>
          </DialogHeader>
          {resumen}
          <BotonesDialogo
            pendiente={isPending}
            onCancelar={() => handleAbrirAprobar(false)}
            onConfirmar={handleAprobar}
            textoConfirmar="Aprobar empresa"
            textoPendiente="Aprobando…"
          />
        </DialogContent>
      </Dialog>

      {/* Dialog: Rechazar */}
      <Dialog open={abrirRechazar} onOpenChange={handleAbrirRechazar}>
        <DialogContent>
          <DialogHeader icono={X} tonoIcono="peligro">
            <DialogTitle>Rechazar empresa</DialogTitle>
            <DialogDescription>
              Estás por rechazar la solicitud de{" "}
              <span className="font-semibold text-foreground">{razonSocial}</span>.
              El motivo va a ser visible para la empresa.
            </DialogDescription>
          </DialogHeader>
          {resumen}
          <div className="flex flex-col gap-2">
            <label htmlFor={`motivo-${empresaId}`} className="etiqueta-campo">
              Motivo del rechazo <Obligatorio />
            </label>
            <Textarea
              id={`motivo-${empresaId}`}
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                campos.limpiar("motivo");
              }}
              placeholder="Explicá por qué se rechaza esta empresa…"
              maxLength={LARGO_MAXIMO.motivo}
              className="min-h-24"
              disabled={isPending}
              {...ariaErrorCampo(`motivo-${empresaId}`, campos.errores.motivo)}
            />
            <div className="flex items-start justify-between gap-3">
              <ErrorCampo idCampo={`motivo-${empresaId}`} mensaje={campos.errores.motivo} />
              <ContadorCaracteres
                className="ml-auto shrink-0"
                actual={motivo.length}
                maximo={LARGO_MAXIMO.motivo}
              />
            </div>
          </div>
          <BotonesDialogo
            pendiente={isPending}
            onCancelar={() => handleAbrirRechazar(false)}
            onConfirmar={handleRechazar}
            textoConfirmar="Rechazar empresa"
            textoPendiente="Rechazando…"
            destructivo
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
