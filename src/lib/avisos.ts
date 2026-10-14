"use client";

import { toast } from "sonner";
import type { Resultado } from "@/lib/resultado";

export function mostrarAviso<T>(resultado: Resultado<T>, fallbackExito = "Hecho"): void {
  if (resultado.ok) {
    toast.success(resultado.mensaje ?? fallbackExito);
  } else {
    if (resultado.codigo === "ERROR_INTERNO" && resultado.ref) {
      toast.error(resultado.mensaje, {
        description: `Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código: ${resultado.ref}`,
      });
    } else {
      toast.error(resultado.mensaje);
    }
  }
}
