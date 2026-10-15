"use client";

import { useState } from "react";
import { toggleActivoCurso, eliminarCurso } from "./actions";
import { toErrorAccion, type ErrorAccion } from "@/lib/resultado";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  cursoId: string;
  activo: boolean;
  tieneAsignaciones: boolean;
};

export function CursoAcciones({ cursoId, activo, tieneAsignaciones }: Props) {
  const [error, setError] = useState<ErrorAccion | null>(null);
  const { pendiente: isPending, ejecutar } = useAccion();

  function handleToggle() {
    setError(null);
    ejecutar(async () => {
      const res = await toggleActivoCurso(cursoId, !activo);
      mostrarAviso(res);
      if (!res.ok) setError(toErrorAccion(res));
    });
  }

  function handleEliminar() {
    if (!confirm("¿Seguro querés eliminar este curso? Esta acción no se puede deshacer."))
      return;
    setError(null);
    ejecutar(async () => {
      const res = await eliminarCurso(cursoId);
      if (!res.ok) {
        mostrarAviso(res);
        setError(toErrorAccion(res));
      }
    });
  }

  return (
    <div className="space-y-2">
      {error && (
        <div>
          <p className="text-sm text-red-600">{error.mensaje}</p>
          {error.ref && (
            <p className="mt-0.5 text-xs text-gray-500">
              Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código: {error.ref}
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className="btn-secundario inline-flex items-center justify-center whitespace-nowrap px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {isPending && <Spinner className="mr-1" />}
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
