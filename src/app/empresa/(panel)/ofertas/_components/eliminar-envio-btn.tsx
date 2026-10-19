"use client";

import { useRouter } from "next/navigation";
import { eliminarOferta } from "@/app/empresa/(panel)/ofertas/actions";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";

interface Props {
  ofertaId: string;
  ofertaTitulo: string;
}

export function EliminarEnvioBtn({ ofertaId, ofertaTitulo }: Props) {
  const router = useRouter();

  return (
    <DialogoConfirmacion
      textoBoton="Eliminar envío"
      estiloBoton="peligro"
      claseBoton="px-3 text-xs sm:min-h-9"
      ayudaBoton="La oferta se borra y no queda registro. Usalo si te equivocaste al cargarla."
      titulo="¿Eliminar este envío?"
      descripcion={
        <>
          La oferta <span className="font-medium text-foreground">&ldquo;{ofertaTitulo}&rdquo;</span>{" "}
          será eliminada permanentemente. Esta acción no se puede deshacer.
        </>
      }
      textoConfirmar="Sí, eliminar envío"
      textoPendiente="Eliminando…"
      destructivo
      accion={() => eliminarOferta(ofertaId)}
      mensajeExito="El envío fue eliminado."
      onExito={() => router.refresh()}
    />
  );
}
