"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BotonesDialogo, CLASE_ACCION_DIALOGO } from "@/components/ui/dialogo-confirmacion";
import { SelectorCv } from "@/components/postulantes/selector-cv";
import { CV_MAXIMOS } from "@/lib/archivos";
import type { CvVista } from "@/lib/cvs";
import { hrefSeccionPerfil, SECCION_PERFIL } from "@/lib/perfil-secciones";

type Props = {
  abierto: boolean;
  onCambiarAbierto: (abierto: boolean) => void;
  ofertaTitulo: string;
  empresa: string | null;
  /** CVs disponibles, del más nuevo al más viejo. Sin CVs, el diálogo pide cargar uno. */
  cvs: CvVista[];
  pendiente: boolean;
  onConfirmar: (cvId: string) => void;
  /** Texto del diálogo cuando no hay CVs cargados. */
  descripcionSinCv: ReactNode;
};

/**
 * "Elegí con qué CV postularte": lo abren "Postularme" en el detalle de la
 * oferta y "Me interesa" / "Aceptar invitación". La acción del servidor la
 * decide quien lo usa (onConfirmar).
 */
export function DialogoElegirCv({
  abierto,
  onCambiarAbierto,
  ofertaTitulo,
  empresa,
  cvs,
  pendiente,
  onConfirmar,
  descripcionSinCv,
}: Props) {
  // El más reciente, salvo que el postulante elija otro.
  const [cvElegidoId, setCvElegidoId] = useState<string | null>(null);
  const cvElegido = cvs.find((cv) => cv.id === cvElegidoId) ?? cvs[0] ?? null;

  // Mientras se envía la postulación el diálogo no se cierra.
  function cambiar(valor: boolean) {
    if (!pendiente) onCambiarAbierto(valor);
  }

  return (
    <Dialog open={abierto} onOpenChange={cambiar}>
      <DialogContent>
        {cvs.length === 0 ? (
          <>
            <DialogHeader>
              <DialogTitle>Necesitás cargar tu CV</DialogTitle>
              <DialogDescription>{descripcionSinCv}</DialogDescription>
            </DialogHeader>
            <BotonesDialogo pendiente={false} onCancelar={() => cambiar(false)}>
              <Link
                href="/perfil"
                onClick={() => cambiar(false)}
                className={CLASE_ACCION_DIALOGO.primario}
              >
                Ir a mi perfil
              </Link>
            </BotonesDialogo>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Elegí con qué CV postularte</DialogTitle>
              <DialogDescription className="flex flex-col">
                <span className="text-base font-bold text-heading">{ofertaTitulo}</span>
                {empresa && <span>{empresa}</span>}
              </DialogDescription>
            </DialogHeader>

            <SelectorCv
              cvs={cvs}
              elegido={cvElegido}
              onElegir={setCvElegidoId}
              deshabilitado={pendiente}
            />

            <p className="text-sm text-muted-foreground">
              Tenés {cvs.length} de {CV_MAXIMOS} CVs cargados.{" "}
              <Link
                href={hrefSeccionPerfil(SECCION_PERFIL.cvs)}
                onClick={() => cambiar(false)}
                className="inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-2 sm:min-h-0"
              >
                Gestionar mis CVs
              </Link>
            </p>

            <BotonesDialogo
              pendiente={pendiente}
              onCancelar={() => cambiar(false)}
              onConfirmar={() => cvElegido && onConfirmar(cvElegido.id)}
              textoConfirmar="Confirmar postulación"
              textoPendiente="Enviando…"
              deshabilitado={!cvElegido}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
