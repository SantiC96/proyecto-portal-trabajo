"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle } from "lucide-react";
import { useMounted } from "@/lib/use-mounted";
import { eliminarOferta } from "@/app/empresa/ofertas/actions";

interface Props {
  ofertaId: string;
  ofertaTitulo: string;
}

export function EliminarEnvioBtn({ ofertaId, ofertaTitulo }: Props) {
  const mounted = useMounted();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await eliminarOferta(ofertaId);
      // redirect() on success throws; only lands here on error
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(null); setOpen(true); }}
        title="La oferta se borra y no queda registro. Usalo si te equivocaste al cargarla."
        className="inline-flex h-8 items-center rounded-lg border border-red-200 bg-white px-3 text-xs font-medium text-red-600 transition hover:bg-red-50 hover:border-red-300"
      >
        Eliminar envío
      </button>

      {mounted && open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="eliminar-envio-titulo"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setOpen(false);
          }}
        >
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={() => { if (!isPending) setOpen(false); }}
              disabled={isPending}
              className="absolute top-4 right-4 rounded-full p-1.5 text-muted-foreground transition hover:bg-gray-100 hover:text-foreground disabled:opacity-40"
              aria-label="Cerrar ventana"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 id="eliminar-envio-titulo" className="text-lg font-bold text-foreground">
              ¿Eliminar este envío?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              La oferta <span className="font-medium text-foreground">&ldquo;{ofertaTitulo}&rdquo;</span> será eliminada permanentemente. Esta acción no se puede deshacer.
            </p>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-red-600 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Eliminando…
                  </>
                ) : (
                  "Sí, eliminar envío"
                )}
              </button>
              <button
                type="button"
                onClick={() => { if (!isPending) { setOpen(false); setError(null); } }}
                disabled={isPending}
                className="flex h-10 w-full items-center justify-center rounded-lg border border-border bg-white text-sm font-medium text-foreground transition hover:bg-surface-tinted disabled:opacity-40"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
