"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
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
import { aprobarEmpresa, rechazarEmpresa } from "../actions";

type Props = {
  empresaId: string;
  razonSocial: string;
  estadoActual: "pendiente" | "aprobada" | "rechazada";
};

export function EmpresaAcciones({ empresaId, razonSocial, estadoActual }: Props) {
  const [abrirAprobar, setAbrirAprobar] = useState(false);
  const [abrirRechazar, setAbrirRechazar] = useState(false);
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
