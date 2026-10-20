"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { abrirFicha } from "../actions";

/**
 * Pasa la postulación de recibida a en_revision cuando la oficina abre la
 * ficha, llegue desde donde llegue. Va al montar y no en el render del
 * servidor porque Next precarga páginas: se marcarían fichas que nadie abrió.
 */
export function MarcarFichaAbierta({ postulacionId }: { postulacionId: string }) {
  const router = useRouter();
  const llamadaPara = useRef<string | null>(null);

  useEffect(() => {
    if (llamadaPara.current === postulacionId) return;
    llamadaPara.current = postulacionId;
    abrirFicha(postulacionId)
      .then((cambio) => {
        if (cambio) router.refresh();
      })
      .catch(() => {});
  }, [postulacionId, router]);

  return null;
}
