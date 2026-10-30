"use client";

import { useId, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { actualizarNotaGuardado } from "@/app/empresa/(panel)/candidatos-guardados/actions";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { LARGO_MAXIMO } from "@/lib/validaciones";

type Props = {
  guardadoId: string;
  notaInicial: string | null;
  className?: string;
};

/**
 * Nota privada de un candidato guardado: recuadro amarillo suave con el
 * rótulo "NOTA PRIVADA", el lápiz para editarla, el texto y la ayuda.
 */
export function NotaGuardadoEditor({ guardadoId, notaInicial, className }: Props) {
  const { pendiente: isPending, ejecutar } = useAccion();
  const [editing, setEditing] = useState(false);
  const [nota, setNota] = useState(notaInicial ?? "");
  const idRotulo = useId();
  const idAyuda = useId();

  function handleSave() {
    ejecutar(async () => {
      const result = await actualizarNotaGuardado(guardadoId, nota.trim() || null);
      mostrarAviso(result);
      if (result.ok) setEditing(false);
    });
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-[14px] border border-aviso-fila-borde bg-accent/15 px-4 py-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          id={idRotulo}
          className="text-xs font-extrabold tracking-[0.06em] text-nota-rotulo uppercase"
        >
          Nota privada
        </p>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="-my-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-nota-rotulo outline-none transition-colors hover:bg-accent/25 focus-visible:shadow-[var(--sombra-foco)]"
            aria-label="Editar nota"
          >
            <Pencil className="size-[18px]" aria-hidden="true" />
          </button>
        )}
      </div>

      {editing ? (
        <>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={3}
            aria-labelledby={idRotulo}
            aria-describedby={idAyuda}
            className="w-full rounded-lg border border-border-strong bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Escribí una nota privada…"
            maxLength={LARGO_MAXIMO.nota}
            disabled={isPending}
            autoFocus
          />
          <ContadorCaracteres actual={nota.length} maximo={LARGO_MAXIMO.nota} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              aria-busy={isPending}
              className="btn-primario btn-chico"
            >
              {isPending ? <Spinner /> : <Check aria-hidden="true" />}
              {isPending ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setNota(notaInicial ?? "");
                setEditing(false);
              }}
              disabled={isPending}
              className="btn-neutro btn-chico"
            >
              <X aria-hidden="true" />
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <p className="text-[15px] leading-normal whitespace-pre-line break-words text-foreground">
          {nota || <span className="text-muted-foreground-strong italic">Sin nota</span>}
        </p>
      )}

      <p id={idAyuda} className="text-[13px] text-muted-foreground-strong">
        Solo la ve tu empresa.
      </p>
    </div>
  );
}
