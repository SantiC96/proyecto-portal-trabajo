"use client";

import { useRouter } from "next/navigation";
import { eliminarOferta } from "@/app/empresa/(panel)/ofertas/actions";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";
import { DIAS_RESTAURACION_OFERTA } from "@/lib/oferta-estados";

interface Props {
  ofertaId: string;
  ofertaTitulo: string;
  esBorrador?: boolean;
  /** Adónde ir después de la baja; sin valor, se refresca la página actual. */
  volverA?: string;
}

export function EliminarEnvioBtn({ ofertaId, ofertaTitulo, esBorrador = false, volverA }: Props) {
  const router = useRouter();
  const objeto = esBorrador ? "el borrador" : "la oferta";

  return (
    <DialogoConfirmacion
      textoBoton="Eliminar"
      estiloBoton="peligro"
      claseBoton="px-3 text-xs sm:min-h-9"
      ayudaBoton={`Pasa a la pestaña Eliminadas. Podés restaurarla durante ${DIAS_RESTAURACION_OFERTA} días.`}
      titulo={esBorrador ? "¿Eliminar este borrador?" : "¿Eliminar esta oferta?"}
      descripcion={
        <>
          Vas a eliminar {objeto}{" "}
          <span className="font-medium text-foreground">&ldquo;{ofertaTitulo}&rdquo;</span>. Pasa a
          la pestaña Eliminadas y podés restaurarla durante {DIAS_RESTAURACION_OFERTA} días; después
          se borra definitivamente.
        </>
      }
      textoConfirmar="Sí, eliminar"
      textoPendiente="Eliminando…"
      destructivo
      accion={() => eliminarOferta(ofertaId)}
      onExito={() => (volverA ? router.push(volverA) : router.refresh())}
    />
  );
}
