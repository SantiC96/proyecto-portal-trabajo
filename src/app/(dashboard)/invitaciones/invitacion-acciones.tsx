"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { responderInvitacion } from "@/app/(dashboard)/postulaciones/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BotonesDialogo, CLASE_ACCION_DIALOGO } from "@/components/ui/dialogo-confirmacion";
import { Textarea } from "@/components/ui/textarea";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { ErrorCampo, ariaErrorCampo } from "@/components/ui/obligatorio";
import { SelectorCv } from "@/components/postulantes/selector-cv";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { MOTIVO_INVITACION_MAXIMO } from "@/lib/invitaciones";
import type { CvVista } from "@/lib/cvs";
import type { Resultado } from "@/lib/resultado";

type Props = {
  invitacionId: string;
  ofertaTitulo: string;
  empresaNombre: string | null;
  /** CVs disponibles, del más nuevo al más viejo. */
  cvs: CvVista[];
};

const BOTON =
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap px-4 text-sm font-medium";

/**
 * "Me interesa" (elige el CV, igual que al postularse) y "No me interesa"
 * (motivo opcional). Si la oferta se cerró mientras tanto, la acción avisa
 * "La oferta ya se cerró." y la invitación pasa al historial.
 */
export function InvitacionAcciones({ invitacionId, ofertaTitulo, empresaNombre, cvs }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState<"acepta" | "rechaza" | null>(null);
  const [cvElegidoId, setCvElegidoId] = useState<string | null>(null);
  const cvElegido = cvs.find((cv) => cv.id === cvElegidoId) ?? cvs[0] ?? null;
  const [motivo, setMotivo] = useState("");
  const campos = useErroresCampo<"motivo">();
  const { pendiente, ejecutar } = useAccion();

  function cambiarAbierto(valor: "acepta" | "rechaza" | null) {
    if (pendiente) return;
    setAbierto(valor);
    if (valor === null) {
      setMotivo("");
      campos.limpiarTodos();
    }
  }

  function despuesDeResponder(res: Resultado<void>) {
    // Respondida o vencida: la invitación ya no está pendiente.
    if (res.ok || res.codigo === "ESTADO_INVALIDO" || res.codigo === "REGLA_DE_NEGOCIO") {
      setAbierto(null);
      setMotivo("");
      router.refresh();
    }
  }

  function aceptar() {
    if (!cvElegido) return;
    const cvId = cvElegido.id;
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
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => cambiarAbierto("acepta")}
          disabled={pendiente}
          className={`btn-primario ${BOTON}`}
        >
          <ThumbsUp className="h-4 w-4" aria-hidden="true" />
          Me interesa
        </button>
        <button
          type="button"
          onClick={() => cambiarAbierto("rechaza")}
          disabled={pendiente}
          className={`btn-secundario ${BOTON}`}
        >
          <ThumbsDown className="h-4 w-4" aria-hidden="true" />
          No me interesa
        </button>
      </div>

      <Dialog
        open={abierto === "acepta"}
        onOpenChange={(v) => cambiarAbierto(v ? "acepta" : null)}
      >
        <DialogContent>
          {cvs.length === 0 ? (
            <>
              <DialogHeader>
                <DialogTitle>Necesitás cargar tu CV</DialogTitle>
                <DialogDescription>
                  Para postularte a{" "}
                  <span className="font-medium text-foreground">{ofertaTitulo}</span> necesitás
                  tener tu CV cargado en tu perfil. Después volvé a Mis postulaciones para
                  responder la invitación.
                </DialogDescription>
              </DialogHeader>
              <BotonesDialogo pendiente={false} onCancelar={() => cambiarAbierto(null)}>
                <Link
                  href="/perfil"
                  onClick={() => setAbierto(null)}
                  className={CLASE_ACCION_DIALOGO.primario}
                >
                  Ir a mi perfil
                </Link>
              </BotonesDialogo>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Postularte a {ofertaTitulo}</DialogTitle>
                <DialogDescription>
                  Te postulás a la oferta{deEmpresa}. La Oficina de Empleo va a revisar tu
                  postulación junto con{" "}
                  {cvs.length > 1 ? "el CV que elijas" : "este CV"}, como cualquier otra.
                </DialogDescription>
              </DialogHeader>
              <SelectorCv
                cvs={cvs}
                elegido={cvElegido}
                onElegir={setCvElegidoId}
                deshabilitado={pendiente}
              />
              <BotonesDialogo
                pendiente={pendiente}
                onCancelar={() => cambiarAbierto(null)}
                onConfirmar={aceptar}
                textoConfirmar="Confirmar postulación"
                textoPendiente="Enviando…"
                deshabilitado={!cvElegido}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={abierto === "rechaza"}
        onOpenChange={(v) => cambiarAbierto(v ? "rechaza" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No me interesa esta oferta</DialogTitle>
            <DialogDescription>
              Le vamos a avisar a la Oficina de Empleo que no te interesa{" "}
              <span className="font-medium text-foreground">{ofertaTitulo}</span>
              {deEmpresa}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label
              htmlFor={`motivo-${invitacionId}`}
              className="text-sm font-medium text-foreground"
            >
              ¿Por qué? (opcional)
            </label>
            <Textarea
              id={`motivo-${invitacionId}`}
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                campos.limpiar("motivo");
              }}
              placeholder="Por ejemplo: me queda lejos, ya conseguí trabajo…"
              maxLength={MOTIVO_INVITACION_MAXIMO}
              className="min-h-24"
              disabled={pendiente}
              {...ariaErrorCampo(`motivo-${invitacionId}`, campos.errores.motivo)}
            />
            <ErrorCampo idCampo={`motivo-${invitacionId}`} mensaje={campos.errores.motivo} />
            <ContadorCaracteres actual={motivo.length} maximo={MOTIVO_INVITACION_MAXIMO} />
          </div>
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
