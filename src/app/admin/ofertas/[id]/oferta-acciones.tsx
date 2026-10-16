"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { aprobarOferta, rechazarOferta } from "../actions";
import { toErrorAccion, type ErrorAccion } from "@/lib/resultado";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { Spinner } from "@/components/ui/spinner";
import type { Enum } from "@/types/db";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { LARGO_MAXIMO } from "@/lib/validaciones";
import { Obligatorio } from "@/components/ui/obligatorio";

type Props = {
  ofertaId: string;
  estado: Enum<"estado_oferta">;
};

export function OfertaAcciones({ ofertaId, estado }: Props) {
  const router = useRouter();
  const [abrirAprobar, setAbrirAprobar] = useState(false);
  const [abrirRechazar, setAbrirRechazar] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<ErrorAccion | null>(null);
  const { pendiente: isPending, ejecutar } = useAccion();

  function cerrarTodo() {
    setAbrirAprobar(false);
    setAbrirRechazar(false);
    setError(null);
    setMotivo("");
  }

  function handleAprobar() {
    setError(null);
    ejecutar(async () => {
      const res = await aprobarOferta(ofertaId);
      mostrarAviso(res);
      if (!res.ok) {
        setError(toErrorAccion(res));
      } else {
        cerrarTodo();
        router.push("/admin/ofertas");
      }
    });
  }

  function handleRechazar() {
    if (!motivo.trim()) {
      setError({ mensaje: "El motivo del rechazo es obligatorio." });
      return;
    }
    setError(null);
    ejecutar(async () => {
      const res = await rechazarOferta(ofertaId, motivo);
      mostrarAviso(res);
      if (!res.ok) {
        setError(toErrorAccion(res));
      } else {
        cerrarTodo();
        router.push("/admin/ofertas");
      }
    });
  }

  if (estado !== "pendiente_aprobacion") {
    return (
      <p className="text-sm text-muted-foreground">
        {estado === "activa"
          ? "Esta oferta ya fue aprobada y está publicada."
          : estado === "rechazada"
            ? "Esta oferta fue rechazada."
            : "Esta oferta no puede ser revisada."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div>
          <p className="text-sm text-red-600">{error.mensaje}</p>
          {error.ref && (
            <p className="mt-0.5 text-xs text-gray-500">
              Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código: {error.ref}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button
          onClick={() => {
            setError(null);
            setAbrirAprobar(true);
          }}
          disabled={isPending}
          className="min-h-11"
        >
          Aprobar
        </Button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setAbrirRechazar(true);
          }}
          disabled={isPending}
          className="btn-secundario inline-flex items-center justify-center whitespace-nowrap min-h-11 px-4 text-sm font-medium disabled:opacity-60"
        >
          Rechazar
        </button>
      </div>

      {/* Dialog: Aprobar */}
      <Dialog
        open={abrirAprobar}
        onOpenChange={(open) => {
          setAbrirAprobar(open);
          if (!open) setError(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar oferta</DialogTitle>
            <DialogDescription>
              La oferta pasará a{" "}
              <span className="font-semibold text-foreground">activa</span> y
              será visible para los postulantes.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div>
              <p className="text-sm text-red-600">{error.mensaje}</p>
              {error.ref && (
                <p className="mt-0.5 text-xs text-gray-500">
                  Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código: {error.ref}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <button
              type="button"
              onClick={() => {
                setAbrirAprobar(false);
                setError(null);
              }}
              disabled={isPending}
              className="btn-secundario inline-flex items-center justify-center whitespace-nowrap h-9 px-4 text-sm font-medium"
            >
              Cancelar
            </button>
            <Button onClick={handleAprobar} disabled={isPending}>
              {isPending && <Spinner className="mr-1" />}
              {isPending ? "Aprobando..." : "Confirmar aprobación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Rechazar */}
      <Dialog
        open={abrirRechazar}
        onOpenChange={(open) => {
          setAbrirRechazar(open);
          if (!open) {
            setMotivo("");
            setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar oferta</DialogTitle>
            <DialogDescription>
              La empresa verá el motivo y podrá corregir la oferta para
              reenviarla a revisión.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label
              htmlFor="motivo-rechazo"
              className="text-sm font-medium text-foreground"
            >
              Motivo del rechazo{" "}
              <Obligatorio />
            </label>
            <Textarea
              id="motivo-rechazo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explicá brevemente por qué no se aprueba la oferta…"
              maxLength={LARGO_MAXIMO.motivo}
              className="min-h-24"
              disabled={isPending}
            />
            <ContadorCaracteres actual={motivo.length} maximo={LARGO_MAXIMO.motivo} />
          </div>
          {error && (
            <div>
              <p className="text-sm text-red-600">{error.mensaje}</p>
              {error.ref && (
                <p className="mt-0.5 text-xs text-gray-500">
                  Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código: {error.ref}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <button
              type="button"
              onClick={() => {
                setAbrirRechazar(false);
                setMotivo("");
                setError(null);
              }}
              disabled={isPending}
              className="btn-secundario inline-flex items-center justify-center whitespace-nowrap h-9 px-4 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRechazar}
              disabled={isPending || !motivo.trim()}
              className="inline-flex items-center justify-center whitespace-nowrap h-9 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {isPending && <Spinner className="mr-1" />}
              {isPending ? "Rechazando..." : "Rechazar oferta"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
