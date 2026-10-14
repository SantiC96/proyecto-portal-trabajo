"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { es } from "react-day-picker/locale";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
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
import { toErrorAccion, type ErrorAccion } from "@/lib/resultado";
import { mostrarAviso } from "@/lib/avisos";
import { BookmarkBtn } from "./bookmark-btn";

// Genera intervalos de 15 min de 08:00 a 20:00
function generarHorarios(): string[] {
  const slots: string[] = [];
  for (let h = 8; h <= 20; h++) {
    for (const m of [0, 15, 30, 45]) {
      if (h === 20 && m > 0) break;
      slots.push(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
      );
    }
  }
  return slots;
}
const HORARIOS = generarHorarios();

function getNowArgentina(): Date {
  return new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
    })
  );
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildFechaISO(day: Date, time: string): string {
  const [h, m] = time.split(":");
  const yyyy = day.getFullYear();
  const mm = String(day.getMonth() + 1).padStart(2, "0");
  const dd = String(day.getDate()).padStart(2, "0");
  // Argentina is UTC-3 (no DST)
  return `${yyyy}-${mm}-${dd}T${h}:${m}:00-03:00`;
}

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
  const [isPending, startTransition] = useTransition();
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [lugar, setLugar] = useState(lugarActual ?? "");
  const [error, setError] = useState<ErrorAccion | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nowArg = getNowArgentina();
  const selectedIsToday = selectedDay ? isSameDay(selectedDay, nowArg) : false;

  function isHoraDisabled(slot: string): boolean {
    if (!selectedIsToday) return false;
    const [h, m] = slot.split(":").map(Number);
    const argH = nowArg.getHours();
    const argM = nowArg.getMinutes();
    return h < argH || (h === argH && m <= argM);
  }

  function handleReset() {
    setSelectedDay(undefined);
    setSelectedTime("");
    setLugar(lugarActual ?? "");
    setError(null);
  }

  function handleClose() {
    handleReset();
    onClose();
  }

  function handleSubmit() {
    if (!selectedDay) { setError({ mensaje: "Seleccioná un día." }); return; }
    if (!selectedTime) { setError({ mensaje: "Seleccioná un horario." }); return; }
    if (isHoraDisabled(selectedTime)) {
      setError({ mensaje: "El horario elegido ya pasó. Seleccioná uno futuro." });
      return;
    }
    if (!lugar.trim()) {
      setError({ mensaje: "El lugar o indicaciones es obligatorio." });
      return;
    }
    setError(null);
    const fechaISO = buildFechaISO(selectedDay, selectedTime);
    const action = modo === "coordinar" ? coordinarEntrevista : reprogramarEntrevista;
    startTransition(async () => {
      const result = await action(derivacionId, ofertaId, fechaISO, lugar.trim());
      mostrarAviso(result);
      if (!result.ok) {
        setError(toErrorAccion(result));
      } else {
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
              Entrevista actual: {new Date(fechaActual).toLocaleString("es-AR", {
                timeZone: "America/Argentina/Buenos_Aires",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Calendario */}
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              Seleccioná el día
            </p>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDay}
                onSelect={setSelectedDay}
                disabled={{ before: today }}
                locale={es}
                captionLayout="label"
              />
            </div>
          </div>

          {/* Selector de hora */}
          <div>
            <label
              htmlFor="horario-select"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Horario
            </label>
            <select
              id="horario-select"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              disabled={!selectedDay}
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-surface-tinted disabled:text-muted-foreground"
            >
              <option value="">Elegí un horario…</option>
              {HORARIOS.map((slot) => (
                <option
                  key={slot}
                  value={slot}
                  disabled={isHoraDisabled(slot)}
                >
                  {slot}
                </option>
              ))}
            </select>
          </div>

          {/* Lugar (obligatorio) */}
          <div>
            <label
              htmlFor="lugar-input"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Lugar o indicaciones <span className="text-red-500">*</span>
            </label>
            <input
              id="lugar-input"
              type="text"
              value={lugar}
              onChange={(e) => setLugar(e.target.value)}
              placeholder="Dirección, piso, o link de videollamada"
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              <p>{error.mensaje}</p>
              {error.ref && (
                <p className="mt-0.5 text-xs text-gray-500">
                  Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código: {error.ref}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="btn-secundario inline-flex h-9 items-center justify-center px-4 text-sm font-medium disabled:opacity-40"
          >
            Cancelar
          </button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Guardando…" : "Confirmar"}
          </Button>
        </DialogFooter>
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
};

export function AccionesDerivacion({
  derivacionId,
  ofertaId,
  estado,
  fechaEntrevista,
  lugarEntrevista,
  postulanteId,
  guardadoId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openEntrevista, setOpenEntrevista] = useState<"coordinar" | "reprogramar" | null>(null);
  const [openRechazo, setOpenRechazo] = useState(false);
  const [openSeleccion, setOpenSeleccion] = useState(false);
  const [openOfertaCerrada, setOpenOfertaCerrada] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<ErrorAccion | null>(null);

  // Entrevista ya pasada → empresa puede seleccionar
  const entrevistaYaPaso =
    estado === "en_proceso" &&
    fechaEntrevista !== null &&
    new Date(fechaEntrevista) <= new Date();

  function handleSeleccionar() {
    setError(null);
    startTransition(async () => {
      const result = await seleccionarCandidato(derivacionId, ofertaId);
      mostrarAviso(result);
      if (!result.ok) {
        setError(toErrorAccion(result));
      } else {
        setOpenSeleccion(false);
        if (result.data?.ofertaCerrada) {
          setOpenOfertaCerrada(true);
        }
        router.refresh();
      }
    });
  }

  function handleRechazar() {
    if (!motivo.trim()) { setError({ mensaje: "El motivo es obligatorio." }); return; }
    setError(null);
    startTransition(async () => {
      const result = await rechazarCandidato(derivacionId, ofertaId, motivo);
      mostrarAviso(result);
      if (!result.ok) {
        setError(toErrorAccion(result));
      } else {
        setOpenRechazo(false);
        setMotivo("");
        router.refresh();
      }
    });
  }

  if (estado === "contratado") {
    return (
      <div className="rounded-[var(--radius-lg)] border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-800">Seleccionado</p>
        <p className="mt-1 text-xs text-emerald-700">
          Marcaste a este candidato como seleccionado para el puesto.
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
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          <p>{error.mensaje}</p>
          {error.ref && (
            <p className="mt-0.5 text-xs text-gray-500">
              Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código: {error.ref}
            </p>
          )}
        </div>
      )}

      {/* Acciones según estado */}
      <div className="flex flex-col gap-2">
        {estado === "pendiente" && (
          <button
            type="button"
            onClick={() => { setError(null); setOpenEntrevista("coordinar"); }}
            disabled={isPending}
            className="btn-primario inline-flex h-9 items-center justify-center px-4 text-sm font-medium disabled:opacity-60"
          >
            Coordinar entrevista
          </button>
        )}

        {estado === "en_proceso" && (
          <button
            type="button"
            onClick={() => { setError(null); setOpenEntrevista("reprogramar"); }}
            disabled={isPending}
            className="btn-secundario inline-flex h-9 items-center justify-center px-4 text-sm font-medium disabled:opacity-60"
          >
            Reprogramar
          </button>
        )}

        {/* Seleccionar: solo en en_proceso. Deshabilitado hasta que pase la fecha */}
        {estado === "en_proceso" && (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => { setError(null); setOpenSeleccion(true); }}
              disabled={isPending || !entrevistaYaPaso}
              title={!entrevistaYaPaso ? "Disponible después de la entrevista" : undefined}
              className="btn-secundario inline-flex h-9 items-center justify-center px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              Seleccionar
            </button>
            {!entrevistaYaPaso && (
              <p className="text-xs text-muted-foreground">
                Disponible después de la entrevista
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => { setError(null); setOpenRechazo(true); }}
          disabled={isPending}
          className="btn-secundario inline-flex h-9 items-center justify-center px-4 text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-200 disabled:opacity-60"
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
        onOpenChange={(v) => { if (!v && !isPending) { setOpenSeleccion(false); setError(null); } }}
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
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              <p>{error.mensaje}</p>
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
              onClick={() => { setOpenSeleccion(false); setError(null); }}
              disabled={isPending}
              className="btn-secundario inline-flex h-9 items-center justify-center px-4 text-sm font-medium disabled:opacity-40"
            >
              Cancelar
            </button>
            <Button onClick={handleSeleccionar} disabled={isPending}>
              {isPending ? "Guardando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: No seleccionar */}
      <Dialog
        open={openRechazo}
        onOpenChange={(v) => {
          if (!v && !isPending) { setOpenRechazo(false); setMotivo(""); setError(null); }
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
              Motivo <span className="font-normal text-muted-foreground">(requerido)</span>
            </label>
            <Textarea
              id="motivo-rechazo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="¿Por qué no encaja este candidato?"
              className="min-h-24"
              disabled={isPending}
            />
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              <p>{error.mensaje}</p>
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
              onClick={() => { setOpenRechazo(false); setMotivo(""); setError(null); }}
              disabled={isPending}
              className="btn-secundario inline-flex h-9 items-center justify-center px-4 text-sm font-medium disabled:opacity-40"
            >
              Cancelar
            </button>
            <Button onClick={handleRechazar} disabled={isPending}>
              {isPending ? "Guardando…" : "Confirmar"}
            </Button>
          </DialogFooter>
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
