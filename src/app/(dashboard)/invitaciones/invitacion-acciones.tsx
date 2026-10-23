"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { responderInvitacion } from "@/app/(dashboard)/postulaciones/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BotonesDialogo } from "@/components/ui/dialogo-confirmacion";
import { Textarea } from "@/components/ui/textarea";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { ErrorCampo, ariaErrorCampo } from "@/components/ui/obligatorio";
import { OpcionRadio } from "@/components/ui/opcion-radio";
import { DialogoElegirCv } from "@/components/postulantes/dialogo-elegir-cv";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { MOTIVO_INVITACION_MAXIMO } from "@/lib/invitaciones";
import type { CvVista } from "@/lib/cvs";
import type { Resultado } from "@/lib/resultado";
import { cn } from "@/lib/utils";

type Props = {
  invitacionId: string;
  ofertaTitulo: string;
  empresaNombre: string | null;
  /** CVs disponibles, del más nuevo al más viejo. */
  cvs: CvVista[];
  /** Texto del botón que acepta: "Me interesa" en /invitaciones, "Aceptar invitación" en el detalle. */
  textoAceptar?: string;
  /** "mitades": un botón al lado del otro; "apiladas": uno debajo del otro, a todo el ancho. */
  disposicion?: "mitades" | "apiladas";
};

// El motivo se guarda como texto en el mismo campo de siempre: el texto de la
// opción elegida o lo que escribió en "Otro motivo".
const MOTIVOS = [
  "El horario no me sirve",
  "Me queda lejos",
  "No es el tipo de trabajo que busco",
  "Ya conseguí trabajo",
] as const;
const OTRO_MOTIVO = "otro";

/**
 * "Me interesa" (elige el CV, igual que al postularse) y "No me interesa"
 * (motivo opcional). Si la oferta se cerró mientras tanto, la acción avisa
 * "La oferta ya se cerró." y la invitación pasa al historial.
 */
export function InvitacionAcciones({
  invitacionId,
  ofertaTitulo,
  empresaNombre,
  cvs,
  textoAceptar = "Me interesa",
  disposicion = "mitades",
}: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState<"acepta" | "rechaza" | null>(null);
  const [opcion, setOpcion] = useState<string | null>(null);
  const [otroMotivo, setOtroMotivo] = useState("");
  const campos = useErroresCampo<"motivo">();
  const { pendiente, ejecutar } = useAccion();

  const motivo = opcion === OTRO_MOTIVO ? otroMotivo : (opcion ?? "");
  const idOtro = `motivo-${invitacionId}`;

  function cambiarAbierto(valor: "acepta" | "rechaza" | null) {
    if (pendiente) return;
    setAbierto(valor);
    if (valor === null) limpiarMotivo();
  }

  function limpiarMotivo() {
    setOpcion(null);
    setOtroMotivo("");
    campos.limpiarTodos();
  }

  function despuesDeResponder(res: Resultado<void>) {
    // Respondida o vencida: la invitación ya no está pendiente.
    if (res.ok || res.codigo === "ESTADO_INVALIDO" || res.codigo === "REGLA_DE_NEGOCIO") {
      setAbierto(null);
      limpiarMotivo();
      router.refresh();
    }
  }

  function aceptar(cvId: string) {
    ejecutar(async () => {
      const res = await responderInvitacion(invitacionId, true, { cvArchivoId: cvId });
      mostrarAviso(res);
      despuesDeResponder(res);
    });
  }

  function rechazar() {
    ejecutar(async () => {
      const res = await responderInvitacion(invitacionId, false, { motivo });
      if (!campos.tomarDelServidor(res, ["motivo"])) mostrarAviso(res);
      despuesDeResponder(res);
    });
  }

  const deEmpresa = empresaNombre ? ` de ${empresaNombre}` : "";

  return (
    <>
      <div
        className={cn(
          "grid gap-2",
          disposicion === "mitades" ? "grid-cols-2" : "grid-cols-1",
        )}
      >
        <button
          type="button"
          onClick={() => cambiarAbierto("acepta")}
          disabled={pendiente}
          className="btn-primario px-3!"
        >
          {textoAceptar}
        </button>
        <button
          type="button"
          onClick={() => cambiarAbierto("rechaza")}
          disabled={pendiente}
          className="btn-neutro px-3!"
        >
          No me interesa
        </button>
      </div>

      <DialogoElegirCv
        abierto={abierto === "acepta"}
        onCambiarAbierto={(v) => cambiarAbierto(v ? "acepta" : null)}
        ofertaTitulo={ofertaTitulo}
        empresa={empresaNombre}
        cvs={cvs}
        pendiente={pendiente}
        onConfirmar={aceptar}
        descripcionSinCv={
          <>
            Para postularte a{" "}
            <span className="font-medium text-foreground">{ofertaTitulo}</span> necesitás tener
            tu CV cargado en tu perfil. Después volvé a Mis postulaciones para responder la
            invitación.
          </>
        }
      />

      <Dialog
        open={abierto === "rechaza"}
        onOpenChange={(v) => cambiarAbierto(v ? "rechaza" : null)}
      >
        <DialogContent tamano="amplio">
          <DialogHeader>
            <DialogTitle>No me interesa esta oferta</DialogTitle>
            <DialogDescription>
              Le vamos a avisar a la Oficina de Empleo que no te interesa{" "}
              <span className="font-medium text-foreground">{ofertaTitulo}</span>
              {deEmpresa}.
            </DialogDescription>
          </DialogHeader>

          <fieldset disabled={pendiente} className="flex min-w-0 flex-col gap-2">
            <legend className="mb-2 text-[15px] font-bold text-control-foreground">
              ¿Por qué? (opcional)
            </legend>
            {[...MOTIVOS, OTRO_MOTIVO].map((valor) => (
              <OpcionRadio
                key={valor}
                name={`motivo-opcion-${invitacionId}`}
                value={valor}
                checked={opcion === valor}
                onChange={() => {
                  setOpcion(valor);
                  campos.limpiar("motivo");
                }}
              >
                <span className="text-[15px] font-semibold text-heading">
                  {valor === OTRO_MOTIVO ? "Otro motivo" : valor}
                </span>
              </OpcionRadio>
            ))}
          </fieldset>

          {opcion === OTRO_MOTIVO && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={idOtro} className="text-[15px] font-bold text-control-foreground">
                Contanos el motivo
              </label>
              <Textarea
                id={idOtro}
                value={otroMotivo}
                onChange={(e) => {
                  setOtroMotivo(e.target.value);
                  campos.limpiar("motivo");
                }}
                maxLength={MOTIVO_INVITACION_MAXIMO}
                className="min-h-24"
                disabled={pendiente}
                {...ariaErrorCampo(idOtro, campos.errores.motivo)}
              />
              <ErrorCampo idCampo={idOtro} mensaje={campos.errores.motivo} />
              <ContadorCaracteres actual={otroMotivo.length} maximo={MOTIVO_INVITACION_MAXIMO} />
            </div>
          )}
          {/* Un error del motivo con una opción de la lista (no debería pasar): debajo de las opciones. */}
          {opcion !== OTRO_MOTIVO && (
            <ErrorCampo idCampo={`${idOtro}-opciones`} mensaje={campos.errores.motivo} />
          )}

          <BotonesDialogo
            pendiente={pendiente}
            onCancelar={() => cambiarAbierto(null)}
            onConfirmar={rechazar}
            textoConfirmar="Enviar respuesta"
            textoPendiente="Enviando…"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
