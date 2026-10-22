"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BotonesDialogo, DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";
import { CampoFechaHora, fechaHoraISO, horarioYaPaso } from "@/components/ui/campo-fecha-hora";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import {
  ErrorCampo,
  Obligatorio,
  ariaErrorCampo,
} from "@/components/ui/obligatorio";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { mostrarAviso } from "@/lib/avisos";
import { formatFechaHora } from "@/lib/fechas";
import { useAccion } from "@/lib/use-accion";
import { LARGO_MAXIMO } from "@/lib/validaciones";
import { badgePreEntrevista, type PreEntrevista } from "@/lib/pre-entrevistas";
import { Badge } from "@/components/ui/badge";
import {
  coordinarPreEntrevista,
  registrarResultadoPreEntrevista,
  reprogramarPreEntrevista,
} from "../actions";

function CampoNota({
  id,
  valor,
  onChange,
  deshabilitado,
  error,
}: {
  id: string;
  valor: string;
  onChange: (valor: string) => void;
  deshabilitado?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        Nota interna{" "}
        <span className="font-normal text-muted-foreground">(opcional, no la ve el postulante)</span>
      </label>
      <Textarea
        id={id}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        maxLength={LARGO_MAXIMO.nota}
        className="min-h-20"
        disabled={deshabilitado}
        {...ariaErrorCampo(id, error)}
      />
      <ErrorCampo idCampo={id} mensaje={error} />
      <ContadorCaracteres actual={valor.length} maximo={LARGO_MAXIMO.nota} />
    </div>
  );
}

type ModoDialogo = "coordinar" | "reprogramar";

/** Campos que puede marcar el servidor; "fechaHora" se muestra debajo del horario. */
const CAMPOS_SERVIDOR = ["fechaHora", "lugar", "nota"] as const;
type CampoDialogo = "dia" | "hora" | (typeof CAMPOS_SERVIDOR)[number];

function DialogoFechaPreEntrevista({
  modo,
  postulacionId,
  preEntrevista,
  onCerrar,
}: {
  modo: ModoDialogo;
  postulacionId: string;
  preEntrevista: PreEntrevista | null;
  onCerrar: () => void;
}) {
  const { pendiente, ejecutar } = useAccion();
  const [dia, setDia] = useState<Date | undefined>(undefined);
  const [hora, setHora] = useState("");
  const [lugar, setLugar] = useState(preEntrevista?.lugar ?? "");
  const [nota, setNota] = useState(preEntrevista?.nota_oficina ?? "");
  const campos = useErroresCampo<CampoDialogo>();

  function confirmar() {
    if (!campos.validar({ dia, hora, lugar }) || !dia) return;
    if (horarioYaPaso(dia, hora)) {
      campos.marcar("hora", "El horario elegido ya pasó. Elegí uno posterior.", null);
      return;
    }

    const iso = fechaHoraISO(dia, hora);
    ejecutar(async () => {
      const res =
        modo === "coordinar" || !preEntrevista
          ? await coordinarPreEntrevista(postulacionId, iso, lugar, nota)
          : await reprogramarPreEntrevista(postulacionId, preEntrevista.id, iso, lugar, nota);
      if (!campos.tomarDelServidor(res, CAMPOS_SERVIDOR)) mostrarAviso(res);
      if (res.ok) onCerrar();
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto && !pendiente) onCerrar();
      }}
    >
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {modo === "coordinar" ? "Coordinar pre-entrevista" : "Reprogramar pre-entrevista"}
          </DialogTitle>
          <DialogDescription>
            {modo === "reprogramar" && preEntrevista
              ? `Fecha actual: ${formatFechaHora(preEntrevista.fecha_hora)}. `
              : ""}
            Le avisamos al postulante con la fecha, la hora y el lugar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <CampoFechaHora
            idHorario="pre-entrevista-horario"
            dia={dia}
            hora={hora}
            onDiaChange={(valor) => {
              setDia(valor);
              campos.limpiar("dia");
              campos.limpiar("fechaHora");
            }}
            onHoraChange={(valor) => {
              setHora(valor);
              campos.limpiar("hora");
              campos.limpiar("fechaHora");
            }}
            deshabilitado={pendiente}
            errorDia={campos.errores.dia}
            errorHora={campos.errores.hora ?? campos.errores.fechaHora}
          />

          <div>
            <label
              htmlFor="pre-entrevista-lugar"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Lugar <Obligatorio />
            </label>
            <Input
              id="pre-entrevista-lugar"
              value={lugar}
              onChange={(e) => {
                setLugar(e.target.value);
                campos.limpiar("lugar");
              }}
              placeholder="Dirección de la oficina, box o link de videollamada"
              maxLength={LARGO_MAXIMO.lugarEntrevista}
              disabled={pendiente}
              className="h-11 bg-white"
              {...ariaErrorCampo("pre-entrevista-lugar", campos.errores.lugar)}
            />
            <ErrorCampo
              idCampo="pre-entrevista-lugar"
              mensaje={campos.errores.lugar}
              className="mt-1.5"
            />
          </div>

          <CampoNota
            id="pre-entrevista-nota"
            valor={nota}
            onChange={(valor) => {
              setNota(valor);
              campos.limpiar("nota");
            }}
            error={campos.errores.nota}
            deshabilitado={pendiente}
          />

        </div>

        <BotonesDialogo
          pendiente={pendiente}
          onCancelar={onCerrar}
          onConfirmar={confirmar}
          textoConfirmar={modo === "coordinar" ? "Coordinar" : "Reprogramar"}
          textoPendiente="Guardando…"
        />
      </DialogContent>
    </Dialog>
  );
}

type Props = {
  postulacionId: string;
  preEntrevista: PreEntrevista | null;
  /** La postulación está en recibida o en revisión: se puede coordinar y registrar el resultado. */
  gestionable: boolean;
  /** La fecha de la pre-entrevista ya pasó (calculado en el servidor). */
  fechaPasada: boolean;
};

export function PreEntrevistaSeccion({
  postulacionId,
  preEntrevista,
  gestionable,
  fechaPasada,
}: Props) {
  const [dialogo, setDialogo] = useState<ModoDialogo | null>(null);
  const [notaResultado, setNotaResultado] = useState(preEntrevista?.nota_oficina ?? "");
  const badge = badgePreEntrevista(preEntrevista);
  const estado = preEntrevista?.estado;

  const motivoSinResultado = fechaPasada
    ? undefined
    : "Podés registrar el resultado después de la fecha de la pre-entrevista.";

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-foreground">
          <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
          Pre-entrevista
        </h2>
        <Badge tono={badge.tono} estado>
          {badge.label}
        </Badge>
      </div>

      {preEntrevista ? (
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Fecha y hora</dt>
            <dd className="mt-0.5 text-foreground">{formatFechaHora(preEntrevista.fecha_hora)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Lugar</dt>
            <dd className="mt-0.5 break-words text-foreground">{preEntrevista.lugar}</dd>
          </div>
          {preEntrevista.nota_oficina && (
            <div>
              <dt className="text-muted-foreground">Nota interna (no la ve el postulante)</dt>
              <dd className="mt-0.5 whitespace-pre-line break-words text-foreground">
                {preEntrevista.nota_oficina}
              </dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          {gestionable
            ? "Si querés conocer al postulante antes de derivarlo, coordiná una pre-entrevista. Es opcional."
            : "Esta postulación no tuvo pre-entrevista."}
        </p>
      )}

      {gestionable && (
        <div className="mt-4 space-y-2">
          {!preEntrevista && (
            <button
              type="button"
              onClick={() => setDialogo("coordinar")}
              className="btn-primario min-h-11 w-full justify-center"
            >
              Coordinar pre-entrevista
            </button>
          )}

          {estado === "coordinada" && preEntrevista && (
            <>
              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                <DialogoConfirmacion
                  textoBoton="Marcar como realizada"
                  estiloBoton="primario"
                  claseBoton="w-full sm:flex-1 lg:flex-none"
                  deshabilitado={!fechaPasada}
                  titulo="Marcar la pre-entrevista como realizada"
                  descripcion="Una pre-entrevista realizada no se puede cambiar."
                  textoConfirmar="Marcar como realizada"
                  textoPendiente="Guardando…"
                  accion={() =>
                    registrarResultadoPreEntrevista(
                      postulacionId,
                      preEntrevista.id,
                      "realizada",
                      notaResultado
                    )
                  }
                >
                  <CampoNota
                    id="pre-entrevista-nota-realizada"
                    valor={notaResultado}
                    onChange={setNotaResultado}
                  />
                </DialogoConfirmacion>
                <DialogoConfirmacion
                  textoBoton="No asistió"
                  claseBoton="w-full sm:flex-1 lg:flex-none"
                  deshabilitado={!fechaPasada}
                  titulo="El postulante no asistió"
                  descripcion="Después vas a poder reprogramar la pre-entrevista con una fecha nueva."
                  textoConfirmar="Confirmar"
                  textoPendiente="Guardando…"
                  accion={() =>
                    registrarResultadoPreEntrevista(
                      postulacionId,
                      preEntrevista.id,
                      "no_asistio",
                      notaResultado
                    )
                  }
                >
                  <CampoNota
                    id="pre-entrevista-nota-no-asistio"
                    valor={notaResultado}
                    onChange={setNotaResultado}
                  />
                </DialogoConfirmacion>
              </div>
              {motivoSinResultado && (
                <p className="text-xs text-muted-foreground">{motivoSinResultado}</p>
              )}
            </>
          )}

          {(estado === "coordinada" || estado === "no_asistio") && (
            <button
              type="button"
              onClick={() => setDialogo("reprogramar")}
              className="btn-secundario inline-flex min-h-11 w-full items-center justify-center whitespace-nowrap px-4 text-sm font-medium"
            >
              Reprogramar
            </button>
          )}
        </div>
      )}

      {dialogo && (
        <DialogoFechaPreEntrevista
          modo={dialogo}
          postulacionId={postulacionId}
          preEntrevista={preEntrevista}
          onCerrar={() => setDialogo(null)}
        />
      )}
    </div>
  );
}
