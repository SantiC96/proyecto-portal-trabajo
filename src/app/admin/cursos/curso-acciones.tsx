"use client";

import { useState, useTransition } from "react";
import { toggleActivoCurso, eliminarCurso } from "./actions";

type Props = {
  cursoId: string;
  activo: boolean;
  tieneAsignaciones: boolean;
};

export function CursoAcciones({ cursoId, activo, tieneAsignaciones }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      const res = await toggleActivoCurso(cursoId, !activo);
      if (res.error) setError(res.error);
    });
  }

  function handleEliminar() {
    if (!confirm("¿Seguro querés eliminar este curso? Esta acción no se puede deshacer."))
      return;
    setError(null);
    startTransition(async () => {
      const res = await eliminarCurso(cursoId);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className="btn-secundario inline-flex items-center justify-center whitespace-nowrap px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {isPending ? "Guardando..." : activo ? "Desactivar" : "Activar"}
        </button>
        {!tieneAsignaciones && (
          <button
            type="button"
            onClick={handleEliminar}
            disabled={isPending}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}
