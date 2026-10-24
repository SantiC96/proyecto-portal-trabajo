"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
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
  estadoActual: EstadoAprobacion;
};

/**
 * Botones de la decisión sobre una empresa, con sus diálogos de
 * confirmación. Como hasta ahora, una empresa rechazada se puede aprobar y una
 * aprobada se puede rechazar.
 */
export function EmpresaAcciones({ empresaId, razonSocial, estadoActual }: Props) {
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
          <DialogHeader>
            <DialogTitle>Aprobar empresa</DialogTitle>
            <DialogDescription>
              ¿Confirmás la aprobación de{" "}
              <span className="font-semibold text-foreground">{razonSocial}</span>?
              La empresa va a poder acceder al portal y publicar ofertas.
            </DialogDescription>
          </DialogHeader>
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
          <DialogHeader>
            <DialogTitle>Rechazar empresa</DialogTitle>
            <DialogDescription>
              Estás por rechazar la solicitud de{" "}
              <span className="font-semibold text-foreground">{razonSocial}</span>.
              El motivo va a ser visible para la empresa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
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
            <ErrorCampo idCampo={`motivo-${empresaId}`} mensaje={campos.errores.motivo} />
            <ContadorCaracteres actual={motivo.length} maximo={LARGO_MAXIMO.motivo} />
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
