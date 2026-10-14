"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, X } from "lucide-react";
import { actualizarNotaGuardado } from "@/app/empresa/(panel)/candidatos-guardados/actions";

type Props = {
  guardadoId: string;
  notaInicial: string | null;
};

export function NotaGuardadoEditor({ guardadoId, notaInicial }: Props) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [nota, setNota] = useState(notaInicial ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await actualizarNotaGuardado(guardadoId, nota.trim() || null);
      if (result.error) {
        setError(result.error);
      } else {
        setEditing(false);
      }
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
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-gray-100 hover:text-foreground"
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
        disabled={isPending}
        autoFocus
      />
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-white transition hover:bg-primary-hover disabled:opacity-60"
        >
          <Check className="h-3.5 w-3.5" />
          {isPending ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => { setNota(notaInicial ?? ""); setEditing(false); setError(null); }}
          disabled={isPending}
          className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-medium text-foreground transition hover:bg-surface-tinted disabled:opacity-40"
        >
          <X className="h-3.5 w-3.5" />
          Cancelar
        </button>
      </div>
    </div>
  );
}
