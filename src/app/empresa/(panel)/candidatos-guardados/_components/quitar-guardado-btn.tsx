"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { quitarGuardado } from "@/app/empresa/(panel)/candidatos-guardados/actions";
import { toErrorAccion, type ErrorAccion } from "@/lib/resultado";

type Props = {
  guardadoId: string;
  nombre: string;
};

export function QuitarGuardadoBtn({ guardadoId, nombre }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<ErrorAccion | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await quitarGuardado(guardadoId);
      if (!result.ok) {
        setError(toErrorAccion(result));
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(null); setOpen(true); }}
        className="btn-secundario inline-flex h-8 items-center gap-1.5 px-3 text-xs font-medium"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Quitar
      </button>

      <Dialog
        open={open}
        onOpenChange={(v) => { if (!v && !isPending) { setOpen(false); setError(null); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Quitar candidato guardado?</DialogTitle>
            <DialogDescription>
              Vas a quitar a{" "}
              <span className="font-semibold text-foreground">{nombre}</span>{" "}
              de tu lista de candidatos guardados. Podés volver a guardarlo desde
              su ficha si querés.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              <p>{error.mensaje}</p>
              {error.ref && (
                <p className="mt-0.5 text-xs text-gray-500">
                  Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código: {error.ref}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <button
              type="button"
              onClick={() => { setOpen(false); setError(null); }}
              disabled={isPending}
              className="btn-secundario inline-flex h-9 items-center justify-center px-4 text-sm font-medium disabled:opacity-40"
            >
              Cancelar
            </button>
            <Button onClick={handleConfirm} disabled={isPending} variant="destructive">
              {isPending ? "Quitando…" : "Sí, quitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
