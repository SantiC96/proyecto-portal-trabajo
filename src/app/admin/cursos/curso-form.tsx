"use client";

import { useState } from "react";
import { crearCurso, editarCurso } from "./actions";
import { toErrorAccion, type ErrorAccion } from "@/lib/resultado";
import { useAccion } from "@/lib/use-accion";
import { Spinner } from "@/components/ui/spinner";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { LARGO_MAXIMO } from "@/lib/validaciones";
import type { Tabla } from "@/types/db";
import { Obligatorio } from "@/components/ui/obligatorio";

type CursoData = Pick<Tabla<"cursos">, "nombre" | "descripcion" | "link" | "indicaciones">;

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
  const [error, setError] = useState<ErrorAccion | null>(null);
  const [guardado, setGuardado] = useState(false);
  const { pendiente: isPending, ejecutar } = useAccion();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardado(false);

    if (!nombre.trim()) {
      setError({ mensaje: "El nombre del curso es obligatorio." });
      return;
    }
    if (link.trim() && !link.trim().startsWith("https://")) {
      setError({ mensaje: "El link debe comenzar con https://" });
      return;
    }

    const data: CursoData = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      link: link.trim() || null,
      indicaciones: indicaciones.trim() || null,
    };

    ejecutar(async () => {
      const res =
        modo === "crear"
          ? await crearCurso(data)
          : await editarCurso(cursoId!, data);
      if (!res.ok) {
        setError(toErrorAccion(res));
      } else {
        setGuardado(true);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="cf-nombre" className="text-sm font-medium text-foreground">
          Nombre <Obligatorio />
        </label>
        <input
          id="cf-nombre"
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Preparación para entrevistas"
          maxLength={LARGO_MAXIMO.nombreCurso}
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
          maxLength={LARGO_MAXIMO.descripcion}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          disabled={isPending}
        />
        <ContadorCaracteres actual={descripcion.length} maximo={LARGO_MAXIMO.descripcion} />
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
          maxLength={LARGO_MAXIMO.linkCurso}
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
          placeholder="Cómo inscribirse, qué tener a mano u otras indicaciones para el postulante..."
          rows={3}
          maxLength={LARGO_MAXIMO.descripcion}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          disabled={isPending}
        />
        <ContadorCaracteres actual={indicaciones.length} maximo={LARGO_MAXIMO.descripcion} />
      </div>

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
      {guardado && (
        <p className="text-sm text-primary">Cambios guardados.</p>
      )}

      <button type="submit" disabled={isPending} aria-busy={isPending} className="btn-primario">
        {isPending && <Spinner />}
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
