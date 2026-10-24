"use client";

import { retirarPostulacion } from "@/app/(dashboard)/postulaciones/actions";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";

/**
 * "Retirar postulación" con su confirmación. Lo usan Mis postulaciones y el
 * detalle de la oferta; quien lo usa decide si se puede retirar (sePuedeRetirar).
 */
export function RetirarPostulacion({
  postulacionId,
  ofertaTitulo,
  derivada,
  conPreEntrevista,
  className,
}: {
  postulacionId: string;
  /** null si el postulante ya no puede ver la oferta. */
  ofertaTitulo: string | null;
  derivada: boolean;
  /** Tiene una pre-entrevista coordinada con la Oficina de Empleo. */
  conPreEntrevista: boolean;
  className?: string;
}) {
  const titulo = ofertaTitulo
    ? `¿Retirar tu postulación a «${ofertaTitulo}»?`
    : "¿Retirar tu postulación?";
  const descripcion = derivada
    ? "La empresa va a recibir un aviso."
    : conPreEntrevista
      ? "Se cancela la pre-entrevista coordinada con la Oficina de Empleo."
      : undefined;

  return (
    <DialogoConfirmacion
      textoBoton="Retirar postulación"
      estiloBoton="peligroBorde"
      claseBoton={className}
      titulo={titulo}
      descripcion={descripcion}
      textoConfirmar="Sí, retirar"
      textoPendiente="Retirando…"
      destructivo
      accion={() => retirarPostulacion(postulacionId)}
    />
  );
}
