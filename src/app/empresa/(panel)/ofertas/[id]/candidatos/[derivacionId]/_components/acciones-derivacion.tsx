"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import {
  CamposEntrevista,
  validarEntrevistaEnCliente,
  valoresEntrevista,
  type ValoresEntrevista,
} from "@/components/entrevistas/campos-entrevista";
import { CartelEntrevista, type DatosEntrevistaCoordinada } from "@/components/entrevistas/cartel-entrevista";
import type { CampoEntrevista } from "@/lib/entrevistas";
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
import { useAccion } from "@/lib/use-accion";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { LARGO_MAXIMO } from "@/lib/validaciones";
import {
  ErrorCampo,
  Obligatorio,
  ariaErrorCampo,
} from "@/components/ui/obligatorio";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { Franja } from "@/components/ui/franja";
import { OpcionRadio } from "@/components/ui/opcion-radio";
import { Spinner } from "@/components/ui/spinner";

const CAMPOS_SERVIDOR = ["fechaHora", "modalidad", "lugar", "link"] as const;

/**
 * Coordinar o reprogramar la entrevista, en la tarjeta de gestión. Al
 * reprogramar viene precargado y con "Cancelar" para volver al cartel.
 */
function FormularioEntrevista({
  derivacionId,
  ofertaId,
  entrevista,
  onCancelar,
  onGuardado,
}: {
  derivacionId: string;
  ofertaId: string;
  /** La entrevista coordinada, si se está reprogramando. */
  entrevista: DatosEntrevistaCoordinada | null;
  onCancelar?: () => void;
  onGuardado?: () => void;
}) {
  const router = useRouter();
  const { pendiente: isPending, ejecutar } = useAccion();
  const [valores, setValores] = useState<ValoresEntrevista>(() =>
    valoresEntrevista(entrevista ?? undefined)
  );
  const campos = useErroresCampo<CampoEntrevista>();
  const modo = entrevista ? "reprogramar" : "coordinar";

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fechaHoraISO = validarEntrevistaEnCliente(valores, campos, e.currentTarget);
    if (!fechaHoraISO) return;
    const datos = { fechaHoraISO, modalidad: valores.modalidad, lugar: valores.lugar, link: valores.link };
    const action = modo === "coordinar" ? coordinarEntrevista : reprogramarEntrevista;
    ejecutar(async () => {
      const result = await action(derivacionId, ofertaId, datos);
      if (!campos.tomarDelServidor(result, CAMPOS_SERVIDOR)) mostrarAviso(result);
      if (result.ok) {
        campos.limpiarTodos();
        onGuardado?.();
        router.refresh();
      }
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h3 className="text-[17px] font-extrabold text-heading">
          {modo === "coordinar" ? "Coordinar entrevista" : "Reprogramar entrevista"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {modo === "coordinar"
            ? "Es opcional: podés seleccionar al candidato sin entrevista. Le avisamos con la fecha, la hora y el lugar o el link."
            : "Le avisamos al candidato con los datos nuevos."}
        </p>
      </div>
      <CamposEntrevista
        idBase="entrevista"
        valores={valores}
        onCambiar={(cambio) => setValores((v) => ({ ...v, ...cambio }))}
        errores={campos.errores}
        onLimpiar={campos.limpiar}
        deshabilitado={isPending}
      />
      <div className="flex flex-col gap-2">
        <button type="submit" disabled={isPending} aria-busy={isPending} className="btn-secundario w-full">
          {isPending && <Spinner />}
          {isPending ? "Guardando…" : modo === "coordinar" ? "Guardar entrevista" : "Guardar cambios"}
        </button>
        {onCancelar && (
          <button type="button" onClick={onCancelar} disabled={isPending} className="btn-neutro w-full">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

// El motivo se guarda como texto en el mismo campo de siempre (nota_empresa):
// el texto de la opción elegida o lo que escribió en "Otro motivo".
const MOTIVOS = [
  "No cumple con los requisitos del puesto",
  "Elegimos a otra persona",
  "No se presentó a la entrevista",
] as const;
const OTRO_MOTIVO = "otro";

type Props = {
  derivacionId: string;
  ofertaId: string;
  estado: EstadoDerivacionEmpresa;
  entrevista: {
    fechaHora: string | null;
    modalidad: string | null;
    lugar: string | null;
    link: string | null;
  };
  vacantesCubiertas: boolean;
};

/** Contenido de la tarjeta "Gestión" de la ficha del candidato. */
export function AccionesDerivacion({
  derivacionId,
  ofertaId,
  estado,
  entrevista,
  vacantesCubiertas,
}: Props) {
  const router = useRouter();
  const { pendiente: isPending, ejecutar } = useAccion();
  const [openRechazo, setOpenRechazo] = useState(false);
  const [openSeleccion, setOpenSeleccion] = useState(false);
  const [openOfertaCerrada, setOpenOfertaCerrada] = useState(false);
  const [opcion, setOpcion] = useState<string | null>(null);
  const [otroMotivo, setOtroMotivo] = useState("");
  const [reprogramando, setReprogramando] = useState(false);
  const camposRechazo = useErroresCampo<"motivo">();

  const motivo = opcion === OTRO_MOTIVO ? otroMotivo : (opcion ?? "");

  // Se puede seleccionar sin entrevista o antes de la fecha (migration_064):
  // solo lo frena tener las vacantes cubiertas.
  const motivoSeleccionNoDisponible = vacantesCubiertas
    ? "Ya cubriste todas las vacantes de esta oferta."
    : null;
  const coordinada =
    estado === "en_proceso" && entrevista.fechaHora
      ? { ...entrevista, fechaHora: entrevista.fechaHora }
      : null;

  function cerrarRechazo() {
    setOpenRechazo(false);
    setOpcion(null);
    setOtroMotivo("");
    camposRechazo.limpiarTodos();
  }

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
        cerrarRechazo();
        router.refresh();
      }
    });
  }

  if (estado === "contratado") {
    return (
      <Franja tono="ok" titulo="Seleccionado.">
        Marcaste a este candidato como seleccionado para el puesto.
      </Franja>
    );
  }

  if (estado === "oferta_retirada") {
    return (
      <Franja tono="neutra" titulo="Proceso cerrado.">
        Retiraste la oferta y el proceso con este candidato quedó cerrado.
      </Franja>
    );
  }

  if (estado === "retirada_postulante") {
    return (
      <Franja tono="neutra" titulo="Se retiró.">
        El candidato retiró su postulación y el proceso quedó cerrado.
      </Franja>
    );
  }

  if (estado === "rechazado") {
    return (
      <Franja tono="neutra" titulo="No seleccionado.">
        Este candidato no fue seleccionado para el puesto.
      </Franja>
    );
  }

  const idOtro = "motivo-rechazo";
  const idOpciones = "motivo-rechazo-opciones";
  const errorMotivo = camposRechazo.errores.motivo;

  return (
    <div className="flex flex-col gap-5">
      {coordinada && !reprogramando ? (
        <div className="flex flex-col gap-3">
          <CartelEntrevista titulo="Entrevista coordinada" datos={coordinada} />
          <button
            type="button"
            onClick={() => setReprogramando(true)}
            disabled={isPending}
            className="btn-secundario w-full"
          >
            Reprogramar
          </button>
        </div>
      ) : (
        <FormularioEntrevista
          derivacionId={derivacionId}
          ofertaId={ofertaId}
          entrevista={coordinada}
          onCancelar={coordinada ? () => setReprogramando(false) : undefined}
          onGuardado={() => setReprogramando(false)}
        />
      )}

      <hr className="border-border" />

      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-[17px] font-extrabold text-heading">Resultado</h3>
          <p id="resultado-ayuda" className="mt-1 text-sm text-muted-foreground">
            Podés seleccionar al candidato en cualquier momento, aunque no hayan tenido una entrevista o
            todavía no haya pasado la fecha.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setOpenSeleccion(true)}
            disabled={isPending || motivoSeleccionNoDisponible !== null}
            aria-describedby={motivoSeleccionNoDisponible ? "motivo-seleccion" : "resultado-ayuda"}
            className="btn-primario w-full"
          >
            Seleccionar
          </button>
          {motivoSeleccionNoDisponible && (
            <p id="motivo-seleccion" className="text-[13px] text-muted-foreground">
              {motivoSeleccionNoDisponible}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpenRechazo(true)}
          disabled={isPending}
          className="btn-peligro-borde w-full"
        >
          No seleccionado
        </button>
      </div>

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
          if (!v && !isPending) cerrarRechazo();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No seleccionar candidato</DialogTitle>
            <DialogDescription>
              Indicá el motivo (no lo verá el postulante). Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <fieldset disabled={isPending} className="flex min-w-0 flex-col gap-2">
            <legend className="mb-2 text-[15px] font-bold text-control-foreground">
              Motivo <Obligatorio />
            </legend>
            {[...MOTIVOS, OTRO_MOTIVO].map((valor) => (
              <OpcionRadio
                key={valor}
                name="motivo-rechazo-opcion"
                value={valor}
                checked={opcion === valor}
                onChange={() => {
                  setOpcion(valor);
                  camposRechazo.limpiar("motivo");
                }}
                {...(opcion !== OTRO_MOTIVO ? ariaErrorCampo(idOpciones, errorMotivo) : {})}
              >
                <span className="text-[15px] font-semibold text-heading">
                  {valor === OTRO_MOTIVO ? "Otro motivo" : valor}
                </span>
              </OpcionRadio>
            ))}
          </fieldset>
          {opcion !== OTRO_MOTIVO && <ErrorCampo idCampo={idOpciones} mensaje={errorMotivo} />}

          {opcion === OTRO_MOTIVO && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={idOtro} className="text-[15px] font-bold text-control-foreground">
                Contanos el motivo <Obligatorio />
              </label>
              <Textarea
                id={idOtro}
                value={otroMotivo}
                onChange={(e) => {
                  setOtroMotivo(e.target.value);
                  camposRechazo.limpiar("motivo");
                }}
                placeholder="¿Por qué no encaja este candidato?"
                maxLength={LARGO_MAXIMO.motivo}
                className="min-h-24"
                disabled={isPending}
                {...ariaErrorCampo(idOtro, errorMotivo)}
              />
              <ErrorCampo idCampo={idOtro} mensaje={errorMotivo} />
              <ContadorCaracteres actual={otroMotivo.length} maximo={LARGO_MAXIMO.motivo} />
            </div>
          )}

          <BotonesDialogo
            pendiente={isPending}
            onCancelar={cerrarRechazo}
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
