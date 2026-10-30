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
import { aprobarOferta, rechazarOferta } from "../actions";
import { BotonesDialogo } from "@/components/ui/dialogo-confirmacion";
import { mostrarAviso } from "@/lib/avisos";
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
  ofertaId: string;
  ofertaTitulo: string;
  empresaNombre: string;
  /** Fecha de envío ya formateada, para el resumen de los diálogos. */
  enviadaEl: string;
};

/** Acciones de una oferta pendiente: publicarla o rechazarla con un motivo. */
export function OfertaAcciones({ ofertaId, ofertaTitulo, empresaNombre, enviadaEl }: Props) {
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

  const resumen = (
    <DialogResumen>
      <p className="font-bold break-words text-heading">{ofertaTitulo}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {empresaNombre} · Enviada el {enviadaEl}
      </p>
    </DialogResumen>
  );

  return (
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

      <Dialog
        open={abrirAprobar}
        onOpenChange={(open) => {
          if (!isPending) setAbrirAprobar(open);
        }}
      >
        <DialogContent>
          <DialogHeader icono={CircleCheck} tonoIcono="primario">
            <DialogTitle>Publicar oferta</DialogTitle>
            <DialogDescription>
              La oferta pasará a{" "}
              <span className="font-semibold text-foreground">activa</span> y
              será visible para los postulantes.
            </DialogDescription>
          </DialogHeader>
          {resumen}
          <BotonesDialogo
            pendiente={isPending}
            onCancelar={() => setAbrirAprobar(false)}
            onConfirmar={handleAprobar}
            textoConfirmar="Publicar oferta"
            textoPendiente="Publicando…"
          />
        </DialogContent>
      </Dialog>

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
          <DialogHeader icono={X} tonoIcono="peligro">
            <DialogTitle>Rechazar oferta</DialogTitle>
            <DialogDescription>
              La empresa ve el motivo y puede corregir la oferta para reenviarla a revisión.
            </DialogDescription>
          </DialogHeader>
          {resumen}
          <div className="flex flex-col gap-2">
            <label htmlFor="motivo-rechazo" className="etiqueta-campo">
              Motivo del rechazo <Obligatorio />
            </label>
            <Textarea
              id="motivo-rechazo"
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                campos.limpiar("motivo");
              }}
              placeholder="Por ejemplo: falta el horario de trabajo en la descripción."
              maxLength={LARGO_MAXIMO.motivo}
              className="min-h-24"
              disabled={isPending}
              {...ariaErrorCampo("motivo-rechazo", campos.errores.motivo)}
            />
            <div className="flex items-start justify-between gap-3">
              <ErrorCampo idCampo="motivo-rechazo" mensaje={campos.errores.motivo} />
              <ContadorCaracteres
                className="ml-auto shrink-0"
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
