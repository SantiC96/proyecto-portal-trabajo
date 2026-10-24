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
import { aprobarOferta, rechazarOferta } from "../actions";
import { BotonesDialogo } from "@/components/ui/dialogo-confirmacion";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import type { Enum } from "@/types/db";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { LARGO_MAXIMO } from "@/lib/validaciones";
import {
  ErrorCampo,
  Obligatorio,
  ariaErrorCampo,
} from "@/components/ui/obligatorio";
import { useErroresCampo } from "@/lib/use-errores-campo";

type Props = {
  ofertaId: string;
  estado: Enum<"estado_oferta">;
};

export function OfertaAcciones({ ofertaId, estado }: Props) {
  const router = useRouter();
  const [abrirAprobar, setAbrirAprobar] = useState(false);
  const [abrirRechazar, setAbrirRechazar] = useState(false);
  const [motivo, setMotivo] = useState("");
  const campos = useErroresCampo<"motivo">();
  const { pendiente: isPending, ejecutar } = useAccion();

  function cerrarTodo() {
    setAbrirAprobar(false);
    setAbrirRechazar(false);
    setMotivo("");
    campos.limpiarTodos();
  }

  function handleAprobar() {
    ejecutar(async () => {
      const res = await aprobarOferta(ofertaId);
      mostrarAviso(res);
      if (res.ok) {
        cerrarTodo();
        router.push("/admin/ofertas");
      }
    });
  }

  function handleRechazar() {
    if (!campos.validar({ motivo })) return;
    ejecutar(async () => {
      const res = await rechazarOferta(ofertaId, motivo);
      if (!campos.tomarDelServidor(res, ["motivo"])) mostrarAviso(res);
      if (res.ok) {
        cerrarTodo();
        router.push("/admin/ofertas");
      }
    });
  }

  if (estado !== "pendiente_aprobacion") {
    return (
      <p className="text-[15px] text-muted-foreground-strong">
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
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setAbrirAprobar(true)}
          disabled={isPending}
          className="btn-primario w-full"
        >
          Publicar oferta
        </button>
        <button
          type="button"
          onClick={() => setAbrirRechazar(true)}
          disabled={isPending}
          className="btn-peligro-borde w-full"
        >
          Rechazar
        </button>
      </div>

      {/* Dialog: Aprobar */}
      <Dialog
        open={abrirAprobar}
        onOpenChange={(open) => {
          if (!isPending) setAbrirAprobar(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publicar oferta</DialogTitle>
            <DialogDescription>
              La oferta pasará a{" "}
              <span className="font-semibold text-foreground">activa</span> y
              será visible para los postulantes.
            </DialogDescription>
          </DialogHeader>
          <BotonesDialogo
            pendiente={isPending}
            onCancelar={() => setAbrirAprobar(false)}
            onConfirmar={handleAprobar}
            textoConfirmar="Publicar oferta"
            textoPendiente="Publicando…"
          />
        </DialogContent>
      </Dialog>

      {/* Dialog: Rechazar */}
      <Dialog
        open={abrirRechazar}
        onOpenChange={(open) => {
          if (isPending) return;
          setAbrirRechazar(open);
          if (!open) {
            setMotivo("");
            campos.limpiarTodos();
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
            <label htmlFor="motivo-rechazo" className="etiqueta-campo">
              Motivo del rechazo{" "}
              <Obligatorio />
            </label>
            <Textarea
              id="motivo-rechazo"
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                campos.limpiar("motivo");
              }}
              placeholder="Explicá brevemente por qué no se aprueba la oferta…"
              maxLength={LARGO_MAXIMO.motivo}
              className="min-h-24"
              disabled={isPending}
              {...ariaErrorCampo("motivo-rechazo", campos.errores.motivo)}
            />
            <ErrorCampo idCampo="motivo-rechazo" mensaje={campos.errores.motivo} />
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                La empresa ve este motivo y puede corregir la oferta.
              </p>
              <ContadorCaracteres
                className="shrink-0"
                actual={motivo.length}
                maximo={LARGO_MAXIMO.motivo}
              />
            </div>
          </div>
          <BotonesDialogo
            pendiente={isPending}
            onCancelar={() => {
              setAbrirRechazar(false);
              setMotivo("");
              campos.limpiarTodos();
            }}
            onConfirmar={handleRechazar}
            textoConfirmar="Rechazar oferta"
            textoPendiente="Rechazando…"
            destructivo
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
