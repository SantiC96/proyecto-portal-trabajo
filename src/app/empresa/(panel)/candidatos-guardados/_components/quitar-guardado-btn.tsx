"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { quitarGuardado } from "@/app/empresa/(panel)/candidatos-guardados/actions";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";

type Props = {
  guardadoId: string;
  nombre: string;
  claseBoton?: string;
};

export function QuitarGuardadoBtn({ guardadoId, nombre, claseBoton }: Props) {
  const router = useRouter();

  return (
    <DialogoConfirmacion
      textoBoton={
        <>
          <Trash2 aria-hidden="true" />
          Quitar
        </>
      }
      etiquetaBoton={`Quitar a ${nombre} de guardados`}
      estiloBoton="peligroBorde"
      claseBoton={claseBoton}
      titulo="¿Quitar candidato guardado?"
      descripcion={
        <>
          Vas a quitar a <span className="font-semibold text-foreground">{nombre}</span> de tu
          lista de candidatos guardados. Podés volver a guardarlo desde su ficha si querés.
        </>
      }
      textoConfirmar="Sí, quitar"
      textoPendiente="Quitando…"
      destructivo
      accion={() => quitarGuardado(guardadoId)}
      onExito={() => router.refresh()}
    />
  );
}
