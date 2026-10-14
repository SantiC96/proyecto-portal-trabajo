"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { aprobarEmpresa, rechazarEmpresa } from "../actions";
import type { HistorialEntry } from "./page";

type Props = {
  empresaId: string;
  razonSocial: string;
  estadoActual: "pendiente" | "aprobada" | "rechazada";
  historial: HistorialEntry[];
  fechaReenvio?: string;
};

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAbrirRechazar(open: boolean) {
    setAbrirRechazar(open);
    if (!open) {
      setMotivo("");
      setError(null);
    }
  }

  function handleAbrirAprobar(open: boolean) {
    setAbrirAprobar(open);
    if (!open) setError(null);
  }

  function handleAprobar() {
    setError(null);
    startTransition(async () => {
      const resultado = await aprobarEmpresa(empresaId);
      if (resultado.error) {
        setError(resultado.error);
      } else {
        setAbrirAprobar(false);
      }
    });
  }

  function handleRechazar() {
    if (!motivo.trim()) {
      setError("El motivo de rechazo es obligatorio.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const resultado = await rechazarEmpresa(empresaId, motivo.trim());
      if (resultado.error) {
        setError(resultado.error);
      } else {
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
            {formatFecha(fechaReenvio)}
          </span>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex flex-wrap gap-2">
        {estadoActual !== "aprobada" && (
          <Button
            size="sm"
            onClick={() => handleAbrirAprobar(true)}
            disabled={isPending}
            className="min-h-11"
          >
            Aprobar
          </Button>
        )}
        {estadoActual !== "rechazada" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAbrirRechazar(true)}
            disabled={isPending}
            className="min-h-11"
          >
            Rechazar
          </Button>
        )}
      </div>

      {/* Historial de revisiones */}
      {historial.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setMostrarHistorial((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
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
                      {formatFecha(entry.created_at)}
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
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleAbrirAprobar(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button onClick={handleAprobar} disabled={isPending}>
              {isPending ? "Aprobando..." : "Confirmar"}
            </Button>
          </DialogFooter>
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
              Motivo del rechazo
            </label>
            <Textarea
              id={`motivo-${empresaId}`}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explicá por qué se rechaza esta empresa…"
              className="min-h-24"
              disabled={isPending}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleAbrirRechazar(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRechazar}
              disabled={isPending}
            >
              {isPending && <Loader2 className="animate-spin" />}
              {isPending ? "Rechazando..." : "Rechazar empresa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
