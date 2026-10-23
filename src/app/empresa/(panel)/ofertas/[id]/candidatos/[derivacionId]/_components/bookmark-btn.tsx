"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { BotonesDialogo } from "@/components/ui/dialogo-confirmacion";
import { guardarCandidato, quitarGuardado } from "@/app/empresa/(panel)/candidatos-guardados/actions";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { Spinner } from "@/components/ui/spinner";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { LARGO_MAXIMO } from "@/lib/validaciones";
import { cn } from "@/lib/utils";

type Props = {
  postulanteId: string;
  ofertaOrigenId: string;
  guardadoId: string | null;
  className?: string;
};

export function BookmarkBtn({ postulanteId, ofertaOrigenId, guardadoId, className }: Props) {
  const router = useRouter();
  const { pendiente: isPending, ejecutar } = useAccion();
  const [openGuardar, setOpenGuardar] = useState(false);
  const [nota, setNota] = useState("");

  function handleGuardar() {
    ejecutar(async () => {
      const result = await guardarCandidato(postulanteId, ofertaOrigenId, nota.trim() || null);
      mostrarAviso(result);
      if (result.ok) {
        setOpenGuardar(false);
        setNota("");
        router.refresh();
      }
    });
  }

  function handleQuitar() {
    if (!guardadoId) return;
    ejecutar(async () => {
      const result = await quitarGuardado(guardadoId);
      mostrarAviso(result);
      router.refresh();
    });
  }

  // Botón que se alterna: guardado (aria-pressed) se quita con otro clic.
  if (guardadoId) {
    return (
      <button
        type="button"
        onClick={handleQuitar}
        disabled={isPending}
        aria-busy={isPending}
        aria-pressed={true}
        title="Quitar de candidatos guardados"
        className={cn("btn-neutro", className)}
      >
        {isPending ? (
          <Spinner />
        ) : (
          <Bookmark aria-hidden="true" fill="currentColor" className="text-primary" />
        )}
        {isPending ? "Quitando…" : "Candidato guardado"}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenGuardar(true)}
        disabled={isPending}
        aria-pressed={false}
        title="Guardar para futuras búsquedas"
        className={cn("btn-neutro", className)}
      >
        <Bookmark aria-hidden="true" />
        Guardar candidato
      </button>

      <Dialog
        open={openGuardar}
        onOpenChange={(v) => {
          if (!v && !isPending) { setOpenGuardar(false); setNota(""); }
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
              maxLength={LARGO_MAXIMO.nota}
              className="min-h-20"
              disabled={isPending}
            />
            <ContadorCaracteres actual={nota.length} maximo={LARGO_MAXIMO.nota} />
          </div>
          <BotonesDialogo
            pendiente={isPending}
            onCancelar={() => { setOpenGuardar(false); setNota(""); }}
            onConfirmar={handleGuardar}
            textoConfirmar="Guardar"
            textoPendiente="Guardando…"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
