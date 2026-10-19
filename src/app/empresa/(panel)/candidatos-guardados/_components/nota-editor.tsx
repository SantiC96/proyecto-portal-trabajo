"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { actualizarNotaGuardado } from "@/app/empresa/(panel)/candidatos-guardados/actions";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { Spinner } from "@/components/ui/spinner";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { LARGO_MAXIMO } from "@/lib/validaciones";

type Props = {
  guardadoId: string;
  notaInicial: string | null;
};

export function NotaGuardadoEditor({ guardadoId, notaInicial }: Props) {
  const { pendiente: isPending, ejecutar } = useAccion();
  const [editing, setEditing] = useState(false);
  const [nota, setNota] = useState(notaInicial ?? "");

  function handleSave() {
    ejecutar(async () => {
      const result = await actualizarNotaGuardado(guardadoId, nota.trim() || null);
      mostrarAviso(result);
      if (result.ok) setEditing(false);
    });
  }

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground">Nota privada</p>
          <p className="mt-0.5 text-sm text-foreground">
            {nota || <span className="italic text-muted-foreground">Sin nota</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface-tinted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label="Editar nota"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Nota privada</p>
      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Escribí una nota privada…"
        maxLength={LARGO_MAXIMO.nota}
        disabled={isPending}
        autoFocus
      />
      <ContadorCaracteres actual={nota.length} maximo={LARGO_MAXIMO.nota} />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          aria-busy={isPending}
          className="btn-primario min-h-11 px-3 text-xs sm:min-h-9"
        >
          {isPending ? <Spinner /> : <Check className="h-3.5 w-3.5" />}
          {isPending ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => { setNota(notaInicial ?? ""); setEditing(false); }}
          disabled={isPending}
          className="btn-secundario inline-flex min-h-11 items-center gap-1.5 px-3 text-xs font-medium sm:min-h-9"
        >
          <X className="h-3.5 w-3.5" />
          Cancelar
        </button>
      </div>
    </div>
  );
}
