"use client";

import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";
import { formatFecha } from "@/lib/fechas";
import { invitarAOferta } from "@/app/admin/ofertas/actions";

type Props = {
  ofertaId: string;
  ofertaTitulo: string;
  postulanteId: string;
  nombre: string;
  /** La última invitación a esta oferta fue rechazada: se muestra antes de confirmar. */
  rechazoAnterior: { fecha: string | null; motivo: string | null } | null;
  claseBoton?: string;
};

/**
 * "Invitar a esta oferta" con el diálogo de confirmación común. Lo usan la
 * búsqueda de postulantes de una oferta y la ficha del postulante.
 */
export function InvitarBoton({
  ofertaId,
  ofertaTitulo,
  postulanteId,
  nombre,
  rechazoAnterior,
  claseBoton = "w-full justify-center sm:w-auto",
}: Props) {
  const router = useRouter();

  return (
    <DialogoConfirmacion
      textoBoton={
        <>
          <Send className="h-4 w-4" aria-hidden="true" />
          Invitar a esta oferta
        </>
      }
      estiloBoton="primario"
      claseBoton={claseBoton}
      titulo={rechazoAnterior ? "¿Invitar de nuevo?" : "Invitar a esta oferta"}
      descripcion={
        rechazoAnterior ? (
          <>
            Esta persona dijo que no a esta oferta el {formatFecha(rechazoAnterior.fecha)}
            {rechazoAnterior.motivo ? ` (motivo: ${rechazoAnterior.motivo})` : ""}. ¿Querés
            invitarla de nuevo?
          </>
        ) : (
          <>
            Le vamos a avisar a <span className="font-medium text-foreground">{nombre}</span>{" "}
            por el portal y por email que la Oficina de Empleo le propone «{ofertaTitulo}». Si
            acepta, su postulación queda pendiente de revisión, como cualquier otra.
          </>
        )
      }
      textoConfirmar={rechazoAnterior ? "Invitar de nuevo" : "Enviar invitación"}
      textoPendiente="Invitando…"
      accion={() => invitarAOferta(ofertaId, postulanteId)}
      onExito={() => router.refresh()}
    />
  );
}
