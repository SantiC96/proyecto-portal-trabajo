"use client";

import { useRouter } from "next/navigation";
import { cerrarOferta } from "@/app/empresa/(panel)/ofertas/actions";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";

interface Props {
  ofertaId: string;
  ofertaTitulo: string;
}

export function CerrarOfertaBtn({ ofertaId, ofertaTitulo }: Props) {
  const router = useRouter();

  return (
    <DialogoConfirmacion
      textoBoton="Cerrar oferta"
      estiloBoton="peligro"
      claseBoton="px-3 text-xs sm:min-h-9"
      ayudaBoton="La oferta deja de recibir postulaciones. Las que ya llegaron se conservan."
      titulo="¿Cerrar esta oferta?"
      descripcion={
        <>
          La oferta <span className="font-medium text-foreground">&ldquo;{ofertaTitulo}&rdquo;</span>{" "}
          dejará de estar disponible para postulantes y no se podrá reabrir.
        </>
      }
      textoConfirmar="Sí, cerrar oferta"
      textoPendiente="Cerrando…"
      destructivo
      accion={() => cerrarOferta(ofertaId)}
      onExito={() => router.refresh()}
    />
  );
}
