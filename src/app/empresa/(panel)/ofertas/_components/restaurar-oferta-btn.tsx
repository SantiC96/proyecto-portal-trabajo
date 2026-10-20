"use client";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { restaurarOferta } from "@/app/empresa/(panel)/ofertas/actions";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";

interface Props {
  ofertaId: string;
  ofertaTitulo: string;
  estadoLabel: string;
}

export function RestaurarOfertaBtn({ ofertaId, ofertaTitulo, estadoLabel }: Props) {
  const router = useRouter();

  return (
    <DialogoConfirmacion
      textoBoton={
        <>
          <RotateCcw className="h-3.5 w-3.5" />
          Restaurar
        </>
      }
      estiloBoton="secundario"
      claseBoton="px-3 text-xs sm:min-h-9"
      titulo="¿Restaurar esta oferta?"
      descripcion={
        <>
          <span className="font-medium text-foreground">&ldquo;{ofertaTitulo}&rdquo;</span> vuelve a
          Mis ofertas en el estado que tenía: {estadoLabel.toLowerCase()}.
        </>
      }
      textoConfirmar="Restaurar"
      textoPendiente="Restaurando…"
      accion={() => restaurarOferta(ofertaId)}
      onExito={() => router.refresh()}
    />
  );
}
