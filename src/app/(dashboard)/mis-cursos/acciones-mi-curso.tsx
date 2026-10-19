"use client";

import { CheckCircle2, PlayCircle } from "lucide-react";
import { actualizarEstadoMiCurso } from "./actions";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";
import { Spinner } from "@/components/ui/spinner";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import type { EstadoAsignacionCurso } from "@/lib/cursos";
import { cn } from "@/lib/utils";

type Props = {
  asignacionId: string;
  estado: EstadoAsignacionCurso;
  nombreCurso: string;
  className?: string;
};

export function AccionesMiCurso({ asignacionId, estado, nombreCurso, className }: Props) {
  const { pendiente, ejecutar } = useAccion();

  if (estado !== "asignado" && estado !== "en_curso") return null;

  function empezar() {
    ejecutar(async () => {
      mostrarAviso(await actualizarEstadoMiCurso(asignacionId, "en_curso"));
    });
  }

  return (
    <div className={cn("relative z-10 flex flex-wrap gap-2", className)}>
        {estado === "asignado" && (
          <button
            type="button"
            onClick={empezar}
            disabled={pendiente}
            aria-busy={pendiente}
            className="btn-primario inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap px-4 text-sm font-medium disabled:opacity-60"
          >
            {pendiente ? <Spinner /> : <PlayCircle className="h-4 w-4" />}
            {pendiente ? "Guardando…" : "Empezar curso"}
          </button>
        )}

        {estado === "en_curso" && (
          <DialogoConfirmacion
            textoBoton={
              <>
                <CheckCircle2 className="h-4 w-4" />
                Marcar como completado
              </>
            }
            deshabilitado={pendiente}
            titulo="¿Completaste el curso?"
            descripcion={
              <>
                Vamos a avisarle a la Oficina de Empleo que completaste{" "}
                <span className="font-semibold text-foreground">{nombreCurso}</span>.
                Después no se puede deshacer.
              </>
            }
            textoConfirmar="Sí, lo completé"
            textoPendiente="Guardando…"
            accion={() => actualizarEstadoMiCurso(asignacionId, "completado")}
          />
        )}
    </div>
  );
}
