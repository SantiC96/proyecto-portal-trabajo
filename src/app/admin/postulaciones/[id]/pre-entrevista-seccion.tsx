"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { CalendarClock, CircleCheck, UserX } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { ErrorCampo, ariaErrorCampo } from "@/components/ui/obligatorio";
import {
  CamposEntrevista,
  validarEntrevistaEnCliente,
  valoresEntrevista,
  type ValoresEntrevista,
} from "@/components/entrevistas/campos-entrevista";
import { CartelEntrevista, ModalidadYLugar } from "@/components/entrevistas/cartel-entrevista";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { mostrarAviso } from "@/lib/avisos";
import { formatFechaHora } from "@/lib/fechas";
import { useAccion } from "@/lib/use-accion";
import { LARGO_MAXIMO } from "@/lib/validaciones";
import {
  PRE_ENTREVISTA_LABEL,
  badgePreEntrevista,
  type CampoPreEntrevista,
  type PreEntrevista,
} from "@/lib/pre-entrevistas";
import { Badge } from "@/components/ui/badge";
import { DatosClave } from "@/components/ui/datos-clave";
import { Spinner } from "@/components/ui/spinner";
import { TituloBloque } from "@/components/ui/titulo-bloque";
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

const CAMPOS_SERVIDOR = ["fechaHora", "modalidad", "lugar", "link", "nota"] as const;

/**
 * Coordinar o reprogramar la pre-entrevista dentro de la tarjeta. Al
 * reprogramar una coordinada, viene precargado y con "Cancelar" para volver
 * al cartel.
 */
function FormularioPreEntrevista({
  postulacionId,
  preEntrevista,
  onCancelar,
}: {
  postulacionId: string;
  preEntrevista: PreEntrevista | null;
  onCancelar?: () => void;
}) {
  const { pendiente, ejecutar } = useAccion();
  const [valores, setValores] = useState<ValoresEntrevista>(() =>
    valoresEntrevista(
      preEntrevista
        ? {
            // Una "no asistió" se reprograma con una fecha nueva.
            fechaHora: preEntrevista.estado === "coordinada" ? preEntrevista.fecha_hora : null,
            modalidad: preEntrevista.modalidad,
            lugar: preEntrevista.lugar,
            link: preEntrevista.link,
          }
        : undefined
    )
  );
  const [nota, setNota] = useState(preEntrevista?.nota_oficina ?? "");
  const campos = useErroresCampo<CampoPreEntrevista>();

  function confirmar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const iso = validarEntrevistaEnCliente(valores, campos, e.currentTarget);
    if (!iso) return;

    const datos = { fechaHoraISO: iso, modalidad: valores.modalidad, lugar: valores.lugar, link: valores.link };
    ejecutar(async () => {
      const res = !preEntrevista
        ? await coordinarPreEntrevista(postulacionId, datos, nota)
        : await reprogramarPreEntrevista(postulacionId, preEntrevista.id, datos, nota);
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
          Le avisamos al postulante con la fecha, la hora y el lugar o el link.
        </p>
      </div>

      <CamposEntrevista
        idBase="pre-entrevista"
        valores={valores}
        onCambiar={(cambio) => setValores((v) => ({ ...v, ...cambio }))}
        errores={campos.errores}
        onLimpiar={campos.limpiar}
        deshabilitado={pendiente}
        placeholderLugar="Dirección de la oficina o box"
        modalidadEnPastillas
        etiquetaLink="Link de la videollamada"
        placeholderLink="https://…"
      />

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

      <div className="flex flex-col gap-2">
        <button type="submit" disabled={pendiente} aria-busy={pendiente} className="btn-secundario w-full">
          {pendiente && <Spinner />}
          {pendiente ? "Guardando…" : preEntrevista ? "Guardar cambios" : "Guardar pre-entrevista"}
        </button>
        {onCancelar && (
          <button type="button" onClick={onCancelar} disabled={pendiente} className="btn-neutro w-full">
            Cancelar
          </button>
        )}
      </div>
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
  /** Resumen de los diálogos (ResumenPostulacion). */
  resumen: ReactNode;
};

export function PreEntrevistaSeccion({
  postulacionId,
  preEntrevista,
  gestionable,
  fechaPasada,
  resumen,
}: Props) {
  const [notaResultado, setNotaResultado] = useState(preEntrevista?.nota_oficina ?? "");
  // Al guardar cambia updated_at y la página vuelve a montar la sección (key):
  // el cartel aparece de nuevo con los datos nuevos.
  const [reprogramando, setReprogramando] = useState(false);
  const badge = badgePreEntrevista(preEntrevista);
  const estado = preEntrevista?.estado;
  const coordinada = estado === "coordinada" && preEntrevista;

  const motivoSinResultado = fechaPasada
    ? undefined
    : "Podés registrar el resultado después de la fecha de la pre-entrevista.";

  return (
    <section aria-labelledby="pre-entrevista-titulo" className="tarjeta tarjeta-panel flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <TituloBloque id="pre-entrevista-titulo" titulo="Pre-entrevista" icono={CalendarClock} />
        {/* La coordinada lleva la fecha en el cartel: el badge, solo el estado. */}
        <Badge tono={badge.tono} estado>
          {coordinada ? PRE_ENTREVISTA_LABEL.coordinada : badge.label}
        </Badge>
      </div>

      {coordinada ? (
        reprogramando && gestionable ? (
          <FormularioPreEntrevista
            postulacionId={postulacionId}
            preEntrevista={coordinada}
            onCancelar={() => setReprogramando(false)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <CartelEntrevista
              titulo="Pre-entrevista coordinada"
              datos={{
                fechaHora: coordinada.fecha_hora,
                modalidad: coordinada.modalidad,
                lugar: coordinada.lugar,
                link: coordinada.link,
              }}
              notas={coordinada.nota_oficina ? { etiqueta: "Nota interna", texto: coordinada.nota_oficina } : null}
            />
            {gestionable && (
              <button type="button" onClick={() => setReprogramando(true)} className="btn-secundario w-full">
                Reprogramar
              </button>
            )}
          </div>
        )
      ) : preEntrevista ? (
        <>
          <DatosClave
            datos={[
              { etiqueta: "Fecha y hora", valor: formatFechaHora(preEntrevista.fecha_hora) },
              {
                etiqueta: "Modalidad",
                valor: (
                  <ModalidadYLugar
                    datos={{ modalidad: preEntrevista.modalidad, lugar: preEntrevista.lugar, link: preEntrevista.link }}
                  />
                ),
              },
              {
                etiqueta: "Nota interna",
                valor: preEntrevista.nota_oficina ? (
                  <span className="whitespace-pre-line">{preEntrevista.nota_oficina}</span>
                ) : null,
              },
            ]}
          />
          {gestionable && estado === "no_asistio" && (
            <FormularioPreEntrevista postulacionId={postulacionId} preEntrevista={preEntrevista} />
          )}
        </>
      ) : (
        <>
          <p className="text-[15px] text-muted-foreground">
            {gestionable
              ? "Si querés conocer al postulante antes de derivarlo, coordiná una pre-entrevista. Es opcional."
              : "Esta postulación no tuvo pre-entrevista."}
          </p>
          {gestionable && <FormularioPreEntrevista postulacionId={postulacionId} preEntrevista={null} />}
        </>
      )}

      {gestionable && coordinada && !reprogramando && (
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
                icono={CircleCheck}
                tonoIcono="primario"
                resumen={resumen}
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
                icono={UserX}
                tonoIcono="peligro"
                resumen={resumen}
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
