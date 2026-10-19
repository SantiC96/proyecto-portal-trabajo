"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BotonesDialogo } from "@/components/ui/dialogo-confirmacion";
import { Badge } from "@/components/ui/badge";
import { aprobarEmpresa, rechazarEmpresa } from "../actions";
import { mostrarAviso } from "@/lib/avisos";
import type { HistorialEntry } from "./page";
import { useAccion } from "@/lib/use-accion";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { LARGO_MAXIMO } from "@/lib/validaciones";
import {
  ErrorCampo,
  Obligatorio,
  ariaErrorCampo,
} from "@/components/ui/obligatorio";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { formatFechaCorta } from "@/lib/fechas";

type Props = {
  empresaId: string;
  razonSocial: string;
  estadoActual: "pendiente" | "aprobada" | "rechazada";
  historial: HistorialEntry[];
  fechaReenvio?: string;
};

const EVENTO_LABEL: Record<HistorialEntry["evento"], string> = {
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  reenviada: "Reenviada",
};

const EVENTO_COLOR: Record<
  HistorialEntry["evento"],
  "default" | "destructive" | "secondary"
> = {
  aprobada: "default",
  rechazada: "destructive",
  reenviada: "secondary",
};

export function EmpresaAcciones({
  empresaId,
  razonSocial,
  estadoActual,
  historial,
  fechaReenvio,
}: Props) {
  const [abrirAprobar, setAbrirAprobar] = useState(false);
  const [abrirRechazar, setAbrirRechazar] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
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
      if (resultado.ok) setAbrirAprobar(false);
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
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Etiqueta "Reenviada" con fecha (solo en pestaña pendiente) */}
      {estadoActual === "pendiente" && fechaReenvio && (
        <div className="flex items-center gap-2">
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
            Reenviada
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatFechaCorta(fechaReenvio)}
          </span>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex flex-wrap gap-2">
        {estadoActual !== "aprobada" && (
          <button
            type="button"
            onClick={() => handleAbrirAprobar(true)}
            disabled={isPending}
            className="btn-primario min-h-11 justify-center"
          >
            Aprobar
          </button>
        )}
        {estadoActual !== "rechazada" && (
          <button
            type="button"
            onClick={() => handleAbrirRechazar(true)}
            disabled={isPending}
            className="btn-peligro inline-flex min-h-11 items-center justify-center px-4 text-sm font-medium"
          >
            Rechazar
          </button>
        )}
      </div>

      {/* Historial de revisiones */}
      {historial.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setMostrarHistorial((v) => !v)}
            aria-expanded={mostrarHistorial}
            className="flex min-h-11 items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
          >
            {mostrarHistorial ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {mostrarHistorial ? "Ocultar historial" : "Ver historial"}
          </button>

          {mostrarHistorial && (
            <ol className="mt-2 space-y-2">
              {historial.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={EVENTO_COLOR[entry.evento]}
                      className={
                        entry.evento === "reenviada"
                          ? "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100"
                          : undefined
                      }
                    >
                      {EVENTO_LABEL[entry.evento]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatFechaCorta(entry.created_at)}
                    </span>
                  </div>
                  {entry.motivo && (
                    <p className="ml-1 text-xs text-muted-foreground">
                      {entry.motivo}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
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
            <label
              htmlFor={`motivo-${empresaId}`}
              className="text-sm font-medium text-foreground"
            >
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
