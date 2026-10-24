"use client";

import { RefreshCw } from "lucide-react";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";
import { renovarOferta } from "../actions";

type Props = {
  ofertaId: string;
  ofertaTitulo: string;
  duracionDias: number;
  /** Clases del botón; por defecto, el chico de Mis ofertas. */
  claseBoton?: string;
};

export function RenovarOfertaBtn({
  ofertaId,
  ofertaTitulo,
  duracionDias,
  claseBoton = "px-3 text-xs sm:min-h-9",
}: Props) {
  return (
    <DialogoConfirmacion
      textoBoton={
        <>
          <RefreshCw className="h-3.5 w-3.5" />
          Renovar
        </>
      }
      estiloBoton="primario"
      claseBoton={claseBoton}
      titulo="Renovar oferta"
      descripcion={
        <>
          <span className="font-semibold text-foreground">{ofertaTitulo}</span> vuelve a
          publicarse por {duracionDias} días desde hoy, sin pasar de nuevo por revisión.
          Si querés cambiar el contenido, editala: en ese caso vuelve a revisión.
        </>
      }
      textoConfirmar="Renovar"
      textoPendiente="Renovando…"
      accion={() => renovarOferta(ofertaId)}
    />
  );
}
