"use client";

import { useState } from "react";
import { crearCurso, editarCurso } from "./actions";
import { toErrorAccion, type ErrorAccion } from "@/lib/resultado";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { Spinner } from "@/components/ui/spinner";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { LARGO_MAXIMO } from "@/lib/validaciones";
import type { Tabla } from "@/types/db";
import {
  CLASE_CONTROL_INVALIDO,
  ErrorCampo,
  Obligatorio,
  ariaErrorCampo,
} from "@/components/ui/obligatorio";
import { useErroresCampo } from "@/lib/use-errores-campo";

type CursoData = Pick<Tabla<"cursos">, "nombre" | "descripcion" | "link" | "indicaciones">;

const CAMPOS = ["nombre", "descripcion", "link", "indicaciones"] as const;

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
  const campos = useErroresCampo<keyof CursoData>();
  const { pendiente: isPending, ejecutar } = useAccion();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!campos.validar({ nombre }, e.currentTarget)) return;
    if (link.trim() && !link.trim().startsWith("https://")) {
      campos.marcar("link", "El link debe comenzar con https://", e.currentTarget);
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
        if (!campos.tomarDelServidor(res, CAMPOS)) setError(toErrorAccion(res));
      } else {
        mostrarAviso(res);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="cf-nombre" className="text-sm font-medium text-foreground">
          Nombre <Obligatorio />
        </label>
        <input
          id="cf-nombre"
          type="text"
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value);
            campos.limpiar("nombre");
          }}
          placeholder="Ej: Preparación para entrevistas"
          maxLength={LARGO_MAXIMO.nombreCurso}
          className={"w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30 " + CLASE_CONTROL_INVALIDO}
          disabled={isPending}
          {...ariaErrorCampo("cf-nombre", campos.errores.nombre)}
        />
        <ErrorCampo idCampo="cf-nombre" mensaje={campos.errores.nombre} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cf-descripcion" className="text-sm font-medium text-foreground">
          Descripción{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <textarea
          id="cf-descripcion"
          value={descripcion}
          onChange={(e) => {
            setDescripcion(e.target.value);
            campos.limpiar("descripcion");
          }}
          placeholder="Breve descripción del contenido del curso..."
          rows={3}
          maxLength={LARGO_MAXIMO.descripcion}
          className={"w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none " + CLASE_CONTROL_INVALIDO}
          disabled={isPending}
          {...ariaErrorCampo("cf-descripcion", campos.errores.descripcion)}
        />
        <ErrorCampo idCampo="cf-descripcion" mensaje={campos.errores.descripcion} />
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
          onChange={(e) => {
            setLink(e.target.value);
            campos.limpiar("link");
          }}
          placeholder="https://..."
          maxLength={LARGO_MAXIMO.linkCurso}
          className={"w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30 " + CLASE_CONTROL_INVALIDO}
          disabled={isPending}
          {...ariaErrorCampo("cf-link", campos.errores.link)}
        />
        <ErrorCampo idCampo="cf-link" mensaje={campos.errores.link} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cf-indicaciones" className="text-sm font-medium text-foreground">
          Indicaciones{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <textarea
          id="cf-indicaciones"
          value={indicaciones}
          onChange={(e) => {
            setIndicaciones(e.target.value);
            campos.limpiar("indicaciones");
          }}
          placeholder="Cómo inscribirse, qué tener a mano u otras indicaciones para el postulante..."
          rows={3}
          maxLength={LARGO_MAXIMO.descripcion}
          className={"w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none " + CLASE_CONTROL_INVALIDO}
          disabled={isPending}
          {...ariaErrorCampo("cf-indicaciones", campos.errores.indicaciones)}
        />
        <ErrorCampo idCampo="cf-indicaciones" mensaje={campos.errores.indicaciones} />
        <ContadorCaracteres actual={indicaciones.length} maximo={LARGO_MAXIMO.descripcion} />
      </div>

      {error && (
        <div>
          <p className="text-sm text-danger">{error.mensaje}</p>
          {error.ref && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código: {error.ref}
            </p>
          )}
        </div>
      )}

      <button type="submit" disabled={isPending} aria-busy={isPending} className="btn-primario min-h-11">
        {isPending && <Spinner />}
        {isPending
          ? modo === "crear"
            ? "Creando…"
            : "Guardando…"
          : modo === "crear"
            ? "Crear curso"
            : "Guardar cambios"}
      </button>
    </form>
  );
}
