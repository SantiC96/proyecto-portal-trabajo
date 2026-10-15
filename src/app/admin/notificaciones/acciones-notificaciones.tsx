"use client";

import { CheckCheck } from "lucide-react";
import { marcarNotificacionLeida, marcarTodasLeidas } from "./actions";
import { Spinner } from "@/components/ui/spinner";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";

export function MarcarTodasLeidasBtn() {
  const { pendiente, ejecutar } = useAccion();
  return (
    <button
      type="button"
      onClick={() =>
        ejecutar(async () => {
          mostrarAviso(await marcarTodasLeidas());
        })
      }
      disabled={pendiente}
      aria-busy={pendiente}
      className="btn-secundario inline-flex min-h-11 items-center gap-2 px-4 text-sm font-medium"
    >
      {pendiente ? <Spinner /> : <CheckCheck className="h-4 w-4" />}
      Marcar todas como leídas
    </button>
  );
}

export function MarcarLeidaBtn({ id }: { id: string }) {
  const { pendiente, ejecutar } = useAccion();
  return (
    <button
      type="button"
      onClick={() =>
        ejecutar(async () => {
          const res = await marcarNotificacionLeida(id);
          if (!res.ok) mostrarAviso(res);
        })
      }
      disabled={pendiente}
      aria-busy={pendiente}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground-strong transition hover:bg-surface-tinted hover:text-primary disabled:opacity-60"
    >
      {pendiente && <Spinner />}
      Marcar como leída
    </button>
  );
}
