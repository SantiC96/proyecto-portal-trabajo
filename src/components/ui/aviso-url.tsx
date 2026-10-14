"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";

const MENSAJES: Record<string, { tipo: "exito" | "info"; texto: string }> = {
  enviada: { tipo: "exito", texto: "Tu oferta se envió a revisión. La Oficina de Empleo la revisará pronto." },
  editada: { tipo: "exito", texto: "Oferta guardada. Volvió a revisión de la Oficina de Empleo." },
  eliminada: { tipo: "exito", texto: "El envío fue eliminado exitosamente." },
  pendiente: { tipo: "info", texto: "La oferta está en revisión. Vas a poder editarla cuando la oficina responda." },
  creado: { tipo: "exito", texto: "Curso creado." },
  reenviada: { tipo: "exito", texto: "Solicitud reenviada. La Oficina de Empleo la revisará pronto." },
};

export function AvisoUrl() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const aviso = searchParams.get("aviso");

  useEffect(() => {
    if (!aviso) return;

    const config = MENSAJES[aviso];
    if (config) {
      const id = `aviso-${aviso}`;
      if (config.tipo === "exito") {
        toast.success(config.texto, { id });
      } else {
        toast.info(config.texto, { id });
      }
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("aviso");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aviso]);

  return null;
}
