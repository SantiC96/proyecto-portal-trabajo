"use client";

import { toggleActivoCurso, eliminarCurso } from "./actions";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { Spinner } from "@/components/ui/spinner";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";

type Props = {
  cursoId: string;
  activo: boolean;
  tieneAsignaciones: boolean;
};

export function CursoAcciones({ cursoId, activo, tieneAsignaciones }: Props) {
  const { pendiente: isPending, ejecutar } = useAccion();

  function handleToggle() {
    ejecutar(async () => {
      mostrarAviso(await toggleActivoCurso(cursoId, !activo));
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        aria-busy={isPending}
        className="btn-secundario inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap px-4 text-sm font-medium"
      >
        {isPending && <Spinner />}
        {isPending ? "Guardando…" : activo ? "Desactivar" : "Activar"}
      </button>
      {!tieneAsignaciones && (
        // En el éxito la acción redirige al listado de cursos.
        <DialogoConfirmacion
          textoBoton="Eliminar"
          estiloBoton="peligro"
          deshabilitado={isPending}
          titulo="¿Eliminar este curso?"
          descripcion="El curso se borra definitivamente. Esta acción no se puede deshacer."
          textoConfirmar="Sí, eliminar"
          textoPendiente="Eliminando…"
          destructivo
          accion={() => eliminarCurso(cursoId)}
        />
      )}
    </div>
  );
}
