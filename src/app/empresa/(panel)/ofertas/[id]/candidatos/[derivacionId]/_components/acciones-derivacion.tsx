"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { CampoFechaHora, fechaHoraISO, horarioYaPaso } from "@/components/ui/campo-fecha-hora";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  coordinarEntrevista,
  reprogramarEntrevista,
  seleccionarCandidato,
  rechazarCandidato,
} from "@/app/empresa/(panel)/ofertas/[id]/actions";
import type { EstadoDerivacionEmpresa } from "@/lib/derivacion-estados";
import { BotonesDialogo } from "@/components/ui/dialogo-confirmacion";
import { mostrarAviso } from "@/lib/avisos";
import { BookmarkBtn } from "./bookmark-btn";
import { useAccion } from "@/lib/use-accion";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { LARGO_MAXIMO } from "@/lib/validaciones";
import {
  CLASE_CONTROL_INVALIDO,
  ErrorCampo,
  Obligatorio,
  ariaErrorCampo,
} from "@/components/ui/obligatorio";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { formatFechaHora } from "@/lib/fechas";
import { cn } from "@/lib/utils";
import { Aviso } from "@/components/ui/aviso";

/** "fecha" es el error de fecha y hora que devuelve el servidor; va debajo del horario. */
type CampoEntrevista = "dia" | "hora" | "fecha" | "lugar";

type EntrevistaDialogProps = {
  open: boolean;
  onClose: () => void;
  derivacionId: string;
  ofertaId: string;
  modo: "coordinar" | "reprogramar";
  fechaActual?: string | null;
  lugarActual?: string | null;
};

function EntrevistaDialog({
  open,
  onClose,
  derivacionId,
  ofertaId,
  modo,
  fechaActual,
  lugarActual,
}: EntrevistaDialogProps) {
  const router = useRouter();
  const { pendiente: isPending, ejecutar } = useAccion();
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [lugar, setLugar] = useState(lugarActual ?? "");
  const campos = useErroresCampo<CampoEntrevista>();

  function handleReset() {
    setSelectedDay(undefined);
    setSelectedTime("");
    setLugar(lugarActual ?? "");
    campos.limpiarTodos();
  }

  function handleClose() {
    handleReset();
    onClose();
  }

  function handleSubmit() {
    if (!campos.validar({ dia: selectedDay, hora: selectedTime, lugar }) || !selectedDay) return;
    if (horarioYaPaso(selectedDay, selectedTime)) {
      campos.marcar("hora", "El horario elegido ya pasó. Seleccioná uno futuro.", null);
      return;
    }
    const fechaISO = fechaHoraISO(selectedDay, selectedTime);
    const action = modo === "coordinar" ? coordinarEntrevista : reprogramarEntrevista;
    ejecutar(async () => {
      const result = await action(derivacionId, ofertaId, fechaISO, lugar.trim());
      if (!campos.tomarDelServidor(result, ["fecha", "lugar"])) mostrarAviso(result);
      if (result.ok) {
        handleReset();
        onClose();
        router.refresh();
      }
    });
  }

  const titulo =
    modo === "coordinar" ? "Coordinar entrevista" : "Reprogramar entrevista";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !isPending) handleClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {fechaActual && modo === "reprogramar" && (
            <DialogDescription>
              Entrevista actual: {formatFechaHora(fechaActual)}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <CampoFechaHora
            idHorario="horario-select"
            dia={selectedDay}
            hora={selectedTime}
            onDiaChange={(dia) => {
              setSelectedDay(dia);
              campos.limpiar("dia");
              campos.limpiar("fecha");
            }}
            onHoraChange={(hora) => {
              setSelectedTime(hora);
              campos.limpiar("hora");
              campos.limpiar("fecha");
            }}
            deshabilitado={isPending}
            errorDia={campos.errores.dia}
            errorHora={campos.errores.hora ?? campos.errores.fecha}
          />

          {/* Lugar (obligatorio) */}
          <div>
            <label
              htmlFor="lugar-input"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Lugar o indicaciones <Obligatorio />
            </label>
            <input
              id="lugar-input"
              type="text"
              value={lugar}
              onChange={(e) => {
                setLugar(e.target.value);
                campos.limpiar("lugar");
              }}
              placeholder="Dirección, piso, o link de videollamada"
              maxLength={LARGO_MAXIMO.lugarEntrevista}
              disabled={isPending}
              {...ariaErrorCampo("lugar-input", campos.errores.lugar)}
              className={cn(
                "h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
                CLASE_CONTROL_INVALIDO
              )}
            />
            <ErrorCampo idCampo="lugar-input" mensaje={campos.errores.lugar} className="mt-1.5" />
          </div>

        </div>

        <BotonesDialogo
          pendiente={isPending}
          onCancelar={handleClose}
          onConfirmar={handleSubmit}
          textoConfirmar={modo === "coordinar" ? "Coordinar entrevista" : "Reprogramar entrevista"}
          textoPendiente="Guardando…"
        />
      </DialogContent>
    </Dialog>
  );
}

type Props = {
  derivacionId: string;
  ofertaId: string;
  estado: EstadoDerivacionEmpresa;
  fechaEntrevista: string | null;
  lugarEntrevista: string | null;
  postulanteId: string;
  guardadoId: string | null;
  vacantesCubiertas: boolean;
};

export function AccionesDerivacion({
  derivacionId,
  ofertaId,
  estado,
  fechaEntrevista,
  lugarEntrevista,
  postulanteId,
  guardadoId,
  vacantesCubiertas,
}: Props) {
  const router = useRouter();
  const { pendiente: isPending, ejecutar } = useAccion();
  const [openEntrevista, setOpenEntrevista] = useState<"coordinar" | "reprogramar" | null>(null);
  const [openRechazo, setOpenRechazo] = useState(false);
  const [openSeleccion, setOpenSeleccion] = useState(false);
  const [openOfertaCerrada, setOpenOfertaCerrada] = useState(false);
  const [motivo, setMotivo] = useState("");
  const camposRechazo = useErroresCampo<"motivo">();

  // Entrevista ya pasada → empresa puede seleccionar
  const entrevistaYaPaso =
    estado === "en_proceso" &&
    fechaEntrevista !== null &&
    new Date(fechaEntrevista) <= new Date();

  const motivoSeleccionNoDisponible = vacantesCubiertas
    ? "Ya cubriste todas las vacantes de esta oferta."
    : !entrevistaYaPaso
      ? "Disponible después de la entrevista"
      : null;

  function handleSeleccionar() {
    ejecutar(async () => {
      const result = await seleccionarCandidato(derivacionId, ofertaId);
      mostrarAviso(result);
      if (result.ok) {
        setOpenSeleccion(false);
        if (result.data?.ofertaCerrada) {
          setOpenOfertaCerrada(true);
        }
        router.refresh();
      }
    });
  }

  function handleRechazar() {
    if (!camposRechazo.validar({ motivo })) return;
    ejecutar(async () => {
      const result = await rechazarCandidato(derivacionId, ofertaId, motivo);
      if (!camposRechazo.tomarDelServidor(result, ["motivo"])) mostrarAviso(result);
      if (result.ok) {
        setOpenRechazo(false);
        setMotivo("");
        router.refresh();
      }
    });
  }

  if (estado === "contratado") {
    return (
      <Aviso tono="success" titulo="Seleccionado">
        Marcaste a este candidato como seleccionado para el puesto.
      </Aviso>
    );
  }

  if (estado === "oferta_retirada") {
    return (
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface-tinted p-4">
        <p className="text-sm font-semibold text-foreground">Proceso cerrado</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Retiraste la oferta y el proceso con este candidato quedó cerrado.
        </p>
      </div>
    );
  }

  if (estado === "retirada_postulante") {
    return (
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface-tinted p-4">
        <p className="text-sm font-semibold text-foreground">Se retiró</p>
        <p className="mt-1 text-xs text-muted-foreground">
          El candidato retiró su postulación y el proceso quedó cerrado.
        </p>
      </div>
    );
  }

  if (estado === "rechazado") {
    return (
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface-tinted p-4">
        <p className="text-sm font-semibold text-foreground">No seleccionado</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Este candidato no fue seleccionado para el puesto.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* Acciones según estado */}
      <div className="flex flex-col gap-2">
        {estado === "pendiente" && (
          <button
            type="button"
            onClick={() => setOpenEntrevista("coordinar")}
            disabled={isPending}
            className="btn-primario min-h-11 justify-center"
          >
            Coordinar entrevista
          </button>
        )}

        {estado === "en_proceso" && (
          <button
            type="button"
            onClick={() => setOpenEntrevista("reprogramar")}
            disabled={isPending}
            className="btn-secundario inline-flex min-h-11 items-center justify-center px-4 text-sm font-medium"
          >
            Reprogramar
          </button>
        )}

        {/* Seleccionar: solo en en_proceso. Deshabilitado hasta que pase la fecha
            o si ya se cubrieron las vacantes */}
        {estado === "en_proceso" && (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setOpenSeleccion(true)}
              disabled={isPending || motivoSeleccionNoDisponible !== null}
              title={motivoSeleccionNoDisponible ?? undefined}
              className="btn-secundario inline-flex min-h-11 items-center justify-center px-4 text-sm font-medium"
            >
              Seleccionar
            </button>
            {motivoSeleccionNoDisponible && (
              <p className="text-xs text-muted-foreground">
                {motivoSeleccionNoDisponible}
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpenRechazo(true)}
          disabled={isPending}
          className="btn-peligro inline-flex min-h-11 items-center justify-center px-4 text-sm font-medium"
        >
          No seleccionar
        </button>

        <hr className="border-border" />

        {/* Guardar perfil */}
        <BookmarkBtn
          postulanteId={postulanteId}
          ofertaOrigenId={ofertaId}
          guardadoId={guardadoId}
        />
      </div>

      {/* Dialog: Coordinar / Reprogramar entrevista */}
      {openEntrevista && (
        <EntrevistaDialog
          open={true}
          onClose={() => setOpenEntrevista(null)}
          derivacionId={derivacionId}
          ofertaId={ofertaId}
          modo={openEntrevista}
          fechaActual={fechaEntrevista}
          lugarActual={lugarEntrevista}
        />
      )}

      {/* Dialog: Seleccionar */}
      <Dialog
        open={openSeleccion}
        onOpenChange={(v) => { if (!v && !isPending) setOpenSeleccion(false); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Seleccionar a este candidato?</DialogTitle>
            <DialogDescription>
              Vas a marcar a este candidato como{" "}
              <span className="font-semibold text-foreground">Seleccionado</span>{" "}
              para el puesto. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <BotonesDialogo
            pendiente={isPending}
            onCancelar={() => setOpenSeleccion(false)}
            onConfirmar={handleSeleccionar}
            textoConfirmar="Seleccionar"
            textoPendiente="Guardando…"
          />
        </DialogContent>
      </Dialog>

      {/* Dialog: No seleccionar */}
      <Dialog
        open={openRechazo}
        onOpenChange={(v) => {
          if (!v && !isPending) { setOpenRechazo(false); setMotivo(""); camposRechazo.limpiarTodos(); }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No seleccionar candidato</DialogTitle>
            <DialogDescription>
              Indicá el motivo (no lo verá el postulante). Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label
              htmlFor="motivo-rechazo"
              className="text-sm font-medium text-foreground"
            >
              Motivo <Obligatorio />
            </label>
            <Textarea
              id="motivo-rechazo"
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                camposRechazo.limpiar("motivo");
              }}
              placeholder="¿Por qué no encaja este candidato?"
              maxLength={LARGO_MAXIMO.motivo}
              className="min-h-24"
              disabled={isPending}
              {...ariaErrorCampo("motivo-rechazo", camposRechazo.errores.motivo)}
            />
            <ErrorCampo idCampo="motivo-rechazo" mensaje={camposRechazo.errores.motivo} />
            <ContadorCaracteres actual={motivo.length} maximo={LARGO_MAXIMO.motivo} />
          </div>
          <BotonesDialogo
            pendiente={isPending}
            onCancelar={() => { setOpenRechazo(false); setMotivo(""); camposRechazo.limpiarTodos(); }}
            onConfirmar={handleRechazar}
            textoConfirmar="No seleccionar"
            textoPendiente="Guardando…"
            destructivo
          />
        </DialogContent>
      </Dialog>

      {/* Dialog: Oferta cerrada automáticamente */}
      <Dialog
        open={openOfertaCerrada}
        onOpenChange={(v) => { if (!v) setOpenOfertaCerrada(false); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Oferta cerrada</DialogTitle>
            <DialogDescription>
              La oferta se cerró porque completaste las vacantes. Los candidatos
              restantes siguen disponibles para que los marques como{" "}
              <span className="font-semibold text-foreground">No seleccionado</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setOpenOfertaCerrada(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
