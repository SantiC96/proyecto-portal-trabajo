"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { quitarGuardado } from "@/app/empresa/(panel)/candidatos-guardados/actions";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";

type Props = {
  guardadoId: string;
  nombre: string;
};

export function QuitarGuardadoBtn({ guardadoId, nombre }: Props) {
  const router = useRouter();

  return (
    <DialogoConfirmacion
      textoBoton={
        <>
          <Trash2 className="h-3.5 w-3.5" />
          Quitar
        </>
      }
      estiloBoton="peligro"
      claseBoton="px-3 text-xs sm:min-h-9"
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
