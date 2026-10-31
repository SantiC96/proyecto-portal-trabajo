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

/** "Desactivar"/"Activar" a todo el ancho y, sin asignaciones, "Eliminar". */
export function CursoAcciones({ cursoId, activo, tieneAsignaciones }: Props) {
  const { pendiente: isPending, ejecutar } = useAccion();

  function handleToggle() {
    ejecutar(async () => {
      mostrarAviso(await toggleActivoCurso(cursoId, !activo));
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        aria-busy={isPending}
        className="btn-secundario w-full"
      >
        {isPending && <Spinner />}
        {isPending ? "Guardando…" : activo ? "Desactivar" : "Activar"}
      </button>
      {!tieneAsignaciones && (
        // En el éxito la acción redirige al listado de cursos.
        <DialogoConfirmacion
          textoBoton="Eliminar"
          estiloBoton="peligro"
          claseBoton="w-full"
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
