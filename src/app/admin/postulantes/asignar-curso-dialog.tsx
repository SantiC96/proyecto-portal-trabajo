"use client";

import { useState, useTransition } from "react";
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

type Curso = { id: string; nombre: string; descripcion: string | null };

type Props = {
  postulanteId: string;
  postulanteNombre: string;
  cursosActivos: Curso[];
  destacado?: boolean;
};

export function AsignarCursoDialog({
  postulanteId,
  postulanteNombre,
  cursosActivos,
  destacado = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [cursoId, setCursoId] = useState(cursosActivos[0]?.id ?? "");
  const [nota, setNota] = useState("");
  const [error, setError] = useState<ErrorAccion | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    setCursoId(cursosActivos[0]?.id ?? "");
    setNota("");
    setError(null);
    setOpen(true);
  }

  function handleAsignar() {
    setError(null);
    if (!cursoId) {
      setError({ mensaje: "Seleccioná un curso." });
      return;
    }
    startTransition(async () => {
      const res = await asignarCurso(postulanteId, cursoId, nota);
      if (!res.ok) {
        setError(toErrorAccion(res));
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
    cursosActivos.find((c) => c.id === cursoId)?.descripcion ?? null;

  return (
    <>
      <button type="button" onClick={handleOpen} className={triggerClass}>
        Asignar curso
      </button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setError(null);
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
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Curso
                </label>
                <select
                  value={cursoId}
                  onChange={(e) => setCursoId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  disabled={isPending}
                >
                  {cursosActivos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
                {descripcionSeleccionada && (
                  <p className="text-xs text-muted-foreground">
                    {descripcionSeleccionada}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Nota interna{" "}
                  <span className="font-normal text-muted-foreground">
                    (opcional, no la ve el postulante)
                  </span>
                </label>
                <Textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Observaciones sobre la asignación..."
                  className="min-h-20"
                  disabled={isPending}
                />
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
            {cursosActivos.length > 0 && (
              <Button onClick={handleAsignar} disabled={isPending}>
                {isPending ? "Asignando..." : "Asignar curso"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
