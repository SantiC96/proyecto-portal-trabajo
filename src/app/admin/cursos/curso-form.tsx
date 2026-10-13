"use client";

import { useState, useTransition } from "react";
import { crearCurso, editarCurso } from "./actions";

type CursoData = {
  nombre: string;
  descripcion: string | null;
  link: string | null;
  indicaciones: string | null;
};

type Props = {
  modo: "crear" | "editar";
  cursoId?: string;
  inicial?: CursoData;
};

export function CursoForm({ modo, cursoId, inicial }: Props) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? "");
  const [link, setLink] = useState(inicial?.link ?? "");
  const [indicaciones, setIndicaciones] = useState(inicial?.indicaciones ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardado(false);

    if (!nombre.trim()) {
      setError("El nombre del curso es obligatorio.");
      return;
    }
    if (link.trim() && !link.trim().startsWith("https://")) {
      setError("El link debe comenzar con https://");
      return;
    }

    const data: CursoData = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      link: link.trim() || null,
      indicaciones: indicaciones.trim() || null,
    };

    startTransition(async () => {
      const res =
        modo === "crear"
          ? await crearCurso(data)
          : await editarCurso(cursoId!, data);
      if (res.error) {
        setError(res.error);
      } else {
        setGuardado(true);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="cf-nombre" className="text-sm font-medium text-foreground">
          Nombre <span className="text-red-500">*</span>
        </label>
        <input
          id="cf-nombre"
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Preparación para entrevistas"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30"
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cf-descripcion" className="text-sm font-medium text-foreground">
          Descripción{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <textarea
          id="cf-descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Breve descripción del contenido del curso..."
          rows={3}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cf-link" className="text-sm font-medium text-foreground">
          Link{" "}
          <span className="font-normal text-muted-foreground">
            (opcional; debe comenzar con https://)
          </span>
        </label>
        <input
          id="cf-link"
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30"
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cf-indicaciones" className="text-sm font-medium text-foreground">
          Indicaciones{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <textarea
          id="cf-indicaciones"
          value={indicaciones}
          onChange={(e) => setIndicaciones(e.target.value)}
          placeholder="Lugar, días, horarios u otras indicaciones para el postulante..."
          rows={3}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          disabled={isPending}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {guardado && (
        <p className="text-sm text-primary">Cambios guardados.</p>
      )}

      <button type="submit" disabled={isPending} className="btn-primario">
        {isPending
          ? modo === "crear"
            ? "Creando..."
            : "Guardando..."
          : modo === "crear"
            ? "Crear curso"
            : "Guardar cambios"}
      </button>
    </form>
  );
}
