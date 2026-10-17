"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { asignarCurso } from "@/app/admin/cursos/actions";
import { toErrorAccion, type ErrorAccion } from "@/lib/resultado";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { Tabla } from "@/types/db";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { LARGO_MAXIMO } from "@/lib/validaciones";
import {
  CLASE_CONTROL_INVALIDO,
  ErrorCampo,
  Obligatorio,
  ariaErrorCampo,
} from "@/components/ui/obligatorio";
import { useErroresCampo } from "@/lib/use-errores-campo";

const CAMPOS = ["cursoId", "nota"] as const;

type Curso = Pick<Tabla<"cursos">, "id" | "nombre" | "descripcion">;

type Props = {
  postulanteId: string;
  postulanteNombre: string;
  cursosActivos: Curso[];
  /** Cursos que el postulante ya tiene asignados o en curso: no se ofrecen. */
  cursosPendientesIds?: readonly string[];
  destacado?: boolean;
  /** Clases extra para el botón que abre el diálogo. */
  claseBoton?: string;
};

export function AsignarCursoDialog({
  postulanteId,
  postulanteNombre,
  cursosActivos,
  cursosPendientesIds = [],
  destacado = false,
  claseBoton,
}: Props) {
  const disponibles = cursosActivos.filter((c) => !cursosPendientesIds.includes(c.id));
  const [open, setOpen] = useState(false);
  const [cursoId, setCursoId] = useState(disponibles[0]?.id ?? "");
  const [nota, setNota] = useState("");
  const [error, setError] = useState<ErrorAccion | null>(null);
  const campos = useErroresCampo<(typeof CAMPOS)[number]>();
  const { pendiente: isPending, ejecutar } = useAccion();

  function handleOpen() {
    setCursoId(disponibles[0]?.id ?? "");
    setNota("");
    setError(null);
    campos.limpiarTodos();
    setOpen(true);
  }

  function handleAsignar() {
    setError(null);
    if (!campos.validar({ cursoId })) return;
    ejecutar(async () => {
      const res = await asignarCurso(postulanteId, cursoId, nota);
      mostrarAviso(res);
      if (!res.ok) {
        if (!campos.tomarDelServidor(res, CAMPOS)) setError(toErrorAccion(res));
      } else {
        setOpen(false);
        setNota("");
      }
    });
  }

  const triggerClass = destacado
    ? "btn-primario inline-flex items-center justify-center whitespace-nowrap px-4 py-2 text-sm font-medium"
    : "inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

  const descripcionSeleccionada =
    disponibles.find((c) => c.id === cursoId)?.descripcion ?? null;

  return (
    <>
      <button type="button" onClick={handleOpen} className={cn(triggerClass, claseBoton)}>
        Asignar curso
      </button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setError(null);
            campos.limpiarTodos();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar curso</DialogTitle>
            <DialogDescription>
              Asignando curso a{" "}
              <span className="font-semibold text-foreground">
                {postulanteNombre}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          {cursosActivos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay cursos activos. Primero creá un curso desde{" "}
              <Link href="/admin/cursos" className="text-primary hover:underline">
                la sección Cursos
              </Link>
              .
            </p>
          ) : disponibles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ya tiene pendientes todos los cursos activos. Cuando complete alguno, o si
              creás un curso nuevo desde{" "}
              <Link href="/admin/cursos" className="text-primary hover:underline">
                la sección Cursos
              </Link>
              , vas a poder asignárselo.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="asignar-curso" className="text-sm font-medium text-foreground">
                  Curso <Obligatorio />
                </label>
                <select
                  id="asignar-curso"
                  value={cursoId}
                  onChange={(e) => {
                    setCursoId(e.target.value);
                    campos.limpiar("cursoId");
                  }}
                  {...ariaErrorCampo("asignar-curso", campos.errores.cursoId)}
                  className={cn(
                    "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30",
                    CLASE_CONTROL_INVALIDO
                  )}
                  disabled={isPending}
                >
                  {disponibles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
                <ErrorCampo idCampo="asignar-curso" mensaje={campos.errores.cursoId} />
                {cursosPendientesIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    No se muestran los cursos que ya tiene pendientes.
                  </p>
                )}
                {descripcionSeleccionada && (
                  <p className="text-xs text-muted-foreground">
                    {descripcionSeleccionada}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="asignar-curso-nota" className="text-sm font-medium text-foreground">
                  Nota interna{" "}
                  <span className="font-normal text-muted-foreground">
                    (opcional, no la ve el postulante)
                  </span>
                </label>
                <Textarea
                  id="asignar-curso-nota"
                  value={nota}
                  onChange={(e) => {
                    setNota(e.target.value);
                    campos.limpiar("nota");
                  }}
                  placeholder="Observaciones sobre la asignación..."
                  maxLength={LARGO_MAXIMO.nota}
                  className="min-h-20"
                  disabled={isPending}
                  {...ariaErrorCampo("asignar-curso-nota", campos.errores.nota)}
                />
                <ErrorCampo idCampo="asignar-curso-nota" mensaje={campos.errores.nota} />
                <ContadorCaracteres actual={nota.length} maximo={LARGO_MAXIMO.nota} />
              </div>
            </div>
          )}

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

          <DialogFooter>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              disabled={isPending}
              className="btn-secundario inline-flex items-center justify-center whitespace-nowrap h-9 px-4 text-sm font-medium"
            >
              Cancelar
            </button>
            {disponibles.length > 0 && (
              <Button onClick={handleAsignar} disabled={isPending}>
                {isPending && <Spinner className="mr-1" />}
                {isPending ? "Asignando..." : "Asignar curso"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
