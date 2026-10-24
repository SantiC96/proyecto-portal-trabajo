"use client";

import { useState, type FormEvent } from "react";
import { CalendarClock } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";
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
import { Franja } from "@/components/ui/franja";
import { DatosClave } from "@/components/ui/datos-clave";
import { Spinner } from "@/components/ui/spinner";
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
      <label htmlFor={id} className="etiqueta-campo block">
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

/** Campos que puede marcar el servidor; "fechaHora" se muestra debajo del horario. */
const CAMPOS_SERVIDOR = ["fechaHora", "lugar", "nota"] as const;
type CampoFormulario = "dia" | "hora" | (typeof CAMPOS_SERVIDOR)[number];

/**
 * Coordinar o reprogramar la pre-entrevista dentro de la tarjeta. Mismas
 * acciones y validaciones que el diálogo anterior.
 */
function FormularioPreEntrevista({
  postulacionId,
  preEntrevista,
}: {
  postulacionId: string;
  preEntrevista: PreEntrevista | null;
}) {
  const { pendiente, ejecutar } = useAccion();
  const [dia, setDia] = useState<Date | undefined>(undefined);
  const [hora, setHora] = useState("");
  const [lugar, setLugar] = useState(preEntrevista?.lugar ?? "");
  const [nota, setNota] = useState(preEntrevista?.nota_oficina ?? "");
  const campos = useErroresCampo<CampoFormulario>();

  function confirmar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!campos.validar({ dia, hora, lugar }, form) || !dia) return;
    if (horarioYaPaso(dia, hora)) {
      campos.marcar("hora", "El horario elegido ya pasó. Elegí uno posterior.", form);
      return;
    }

    const iso = fechaHoraISO(dia, hora);
    ejecutar(async () => {
      const res = !preEntrevista
        ? await coordinarPreEntrevista(postulacionId, iso, lugar, nota)
        : await reprogramarPreEntrevista(postulacionId, preEntrevista.id, iso, lugar, nota);
      if (!campos.tomarDelServidor(res, CAMPOS_SERVIDOR)) mostrarAviso(res);
    });
  }

  return (
    <form noValidate onSubmit={confirmar} className="flex flex-col gap-4">
      <div>
        <h3 className="text-[17px] font-extrabold text-heading">
          {preEntrevista ? "Reprogramar pre-entrevista" : "Coordinar pre-entrevista"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Le avisamos al postulante con la fecha, la hora y el lugar.
        </p>
      </div>
      <CampoFechaHora
        compacto
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
        <label htmlFor="pre-entrevista-lugar" className="etiqueta-campo mb-1.5 block">
          Lugar <Obligatorio />
        </label>
        <input
          id="pre-entrevista-lugar"
          type="text"
          value={lugar}
          onChange={(e) => {
            setLugar(e.target.value);
            campos.limpiar("lugar");
          }}
          placeholder="Dirección de la oficina, box o link de videollamada"
          maxLength={LARGO_MAXIMO.lugarEntrevista}
          disabled={pendiente}
          className="campo"
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

      <button type="submit" disabled={pendiente} aria-busy={pendiente} className="btn-secundario w-full">
        {pendiente && <Spinner />}
        {pendiente ? "Guardando…" : "Guardar pre-entrevista"}
      </button>
    </form>
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
  const [notaResultado, setNotaResultado] = useState(preEntrevista?.nota_oficina ?? "");
  const badge = badgePreEntrevista(preEntrevista);
  const estado = preEntrevista?.estado;
  const coordinada = estado === "coordinada" && preEntrevista;
  // Una realizada no se cambia; una cancelada es final (postulación retirada).
  const conFormulario = gestionable && (!preEntrevista || estado === "coordinada" || estado === "no_asistio");

  const motivoSinResultado = fechaPasada
    ? undefined
    : "Podés registrar el resultado después de la fecha de la pre-entrevista.";

  return (
    <section aria-labelledby="pre-entrevista-titulo" className="tarjeta flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="pre-entrevista-titulo" className="text-xl font-extrabold text-heading">
          Pre-entrevista
        </h2>
        {!coordinada && (
          <Badge tono={badge.tono} estado>
            {badge.label}
          </Badge>
        )}
      </div>

      {coordinada ? (
        <Franja tono="info" icono={CalendarClock} titulo="Coordinada:">
          {formatFechaHora(coordinada.fecha_hora)} · {coordinada.lugar}
        </Franja>
      ) : preEntrevista ? (
        <DatosClave
          datos={[
            { etiqueta: "Fecha y hora", valor: formatFechaHora(preEntrevista.fecha_hora) },
            { etiqueta: "Lugar", valor: preEntrevista.lugar },
          ]}
        />
      ) : (
        <p className="text-[15px] text-muted-foreground">
          {gestionable
            ? "Si querés conocer al postulante antes de derivarlo, coordiná una pre-entrevista. Es opcional."
            : "Esta postulación no tuvo pre-entrevista."}
        </p>
      )}

      {preEntrevista?.nota_oficina && (
        <DatosClave
          datos={[
            {
              etiqueta: "Nota interna",
              valor: <span className="whitespace-pre-line">{preEntrevista.nota_oficina}</span>,
            },
          ]}
        />
      )}

      {conFormulario && (
        <FormularioPreEntrevista postulacionId={postulacionId} preEntrevista={preEntrevista} />
      )}

      {gestionable && coordinada && (
        <>
          <hr className="border-border" />
          <div className="flex flex-col gap-3">
            <h3 className="text-[17px] font-extrabold text-heading">¿Cómo resultó?</h3>
            <div className="grid grid-cols-2 gap-3">
              <DialogoConfirmacion
                textoBoton="Realizada"
                estiloBoton="neutro"
                claseBoton="w-full px-3!"
                deshabilitado={!fechaPasada}
                titulo="Marcar la pre-entrevista como realizada"
                descripcion="Una pre-entrevista realizada no se puede cambiar."
                textoConfirmar="Marcar como realizada"
                textoPendiente="Guardando…"
                accion={() =>
                  registrarResultadoPreEntrevista(
                    postulacionId,
                    coordinada.id,
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
                estiloBoton="neutro"
                claseBoton="w-full px-3!"
                deshabilitado={!fechaPasada}
                titulo="El postulante no asistió"
                descripcion="Después vas a poder reprogramar la pre-entrevista con una fecha nueva."
                textoConfirmar="Confirmar"
                textoPendiente="Guardando…"
                accion={() =>
                  registrarResultadoPreEntrevista(
                    postulacionId,
                    coordinada.id,
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
              <p className="text-[13px] text-muted-foreground">{motivoSinResultado}</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
