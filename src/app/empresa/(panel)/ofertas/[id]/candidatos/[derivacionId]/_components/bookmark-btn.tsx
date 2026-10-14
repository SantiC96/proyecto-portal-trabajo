"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { guardarCandidato, quitarGuardado } from "@/app/empresa/(panel)/candidatos-guardados/actions";

type Props = {
  postulanteId: string;
  ofertaOrigenId: string;
  guardadoId: string | null;
};

export function BookmarkBtn({ postulanteId, ofertaOrigenId, guardadoId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openGuardar, setOpenGuardar] = useState(false);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleGuardar() {
    setError(null);
    startTransition(async () => {
      const result = await guardarCandidato(postulanteId, ofertaOrigenId, nota.trim() || null);
      if (result.error) {
        setError(result.error);
      } else {
        setOpenGuardar(false);
        setNota("");
        router.refresh();
      }
    });
  }

  function handleQuitar() {
    if (!guardadoId) return;
    startTransition(async () => {
      await quitarGuardado(guardadoId);
      router.refresh();
    });
  }

  if (guardadoId) {
    return (
      <button
        type="button"
        onClick={handleQuitar}
        disabled={isPending}
        className="btn-secundario inline-flex h-9 items-center gap-2 px-4 text-sm font-medium disabled:opacity-50"
      >
        <BookmarkCheck className="h-4 w-4 text-primary" />
        Guardado — Quitar
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(null); setOpenGuardar(true); }}
        disabled={isPending}
        className="btn-secundario inline-flex h-9 items-center gap-2 px-4 text-sm font-medium disabled:opacity-50"
      >
        <Bookmark className="h-4 w-4 shrink-0 text-muted-foreground" />
        Guardar para futuras búsquedas
      </button>

      <Dialog
        open={openGuardar}
        onOpenChange={(v) => {
          if (!v && !isPending) { setOpenGuardar(false); setNota(""); setError(null); }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar candidato</DialogTitle>
            <DialogDescription>
              Vas a agregar este candidato a tu lista de perfiles guardados.
              Podés dejar una nota privada para recordar por qué lo guardaste.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label
              htmlFor="nota-guardado"
              className="text-sm font-medium text-foreground"
            >
              Nota privada{" "}
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </label>
            <Textarea
              id="nota-guardado"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej.: Buen perfil para el área de ventas…"
              className="min-h-20"
              disabled={isPending}
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <DialogFooter>
            <button
              type="button"
              onClick={() => { setOpenGuardar(false); setNota(""); setError(null); }}
              disabled={isPending}
              className="btn-secundario inline-flex h-9 items-center justify-center px-4 text-sm font-medium disabled:opacity-40"
            >
              Cancelar
            </button>
            <Button onClick={handleGuardar} disabled={isPending}>
              {isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
