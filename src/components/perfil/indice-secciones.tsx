"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Seccion = { id: string; titulo: string };

/**
 * Índice "En esta página" de Mi perfil (solo en pantallas anchas). Marca con
 * aria-current la sección que se está viendo: la primera cuyo título pasó la
 * franja superior de la pantalla.
 */
export function IndiceSecciones({ secciones }: { secciones: Seccion[] }) {
  const [actual, setActual] = useState(secciones[0]?.id ?? null);

  useEffect(() => {
    const elementos = secciones
      .map((s) => document.getElementById(s.id))
      .filter((e): e is HTMLElement => e !== null);
    if (elementos.length === 0) return;

    const visibles = new Set<string>();
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) visibles.add(e.target.id);
          else visibles.delete(e.target.id);
        }
        // La primera sección visible en el orden de la página.
        const primera = secciones.find((s) => visibles.has(s.id));
        if (primera) setActual(primera.id);
      },
      // Cuenta como "a la vista" lo que está en el 40 % superior de la pantalla.
      { rootMargin: "0px 0px -60% 0px" },
    );
    elementos.forEach((e) => observador.observe(e));
    return () => observador.disconnect();
  }, [secciones]);

  return (
    <nav aria-labelledby="indice-perfil-titulo" className="flex flex-col gap-2">
      <p
        id="indice-perfil-titulo"
        className="px-3 text-[13px] font-bold tracking-[0.06em] text-neutral uppercase"
      >
        En esta página
      </p>
      <ul className="flex flex-col gap-0.5">
        {secciones.map((s) => {
          const activa = s.id === actual;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={activa ? "true" : undefined}
                onClick={() => setActual(s.id)}
                className={cn(
                  "flex min-h-11 items-center rounded-[var(--radius-md)] border-l-[3px] px-3 text-[15px] font-semibold outline-none transition-colors duration-150 focus-visible:shadow-[var(--sombra-foco)]",
                  activa
                    ? "border-primary bg-surface text-primary"
                    : "border-transparent text-muted-foreground-strong hover:bg-surface hover:text-primary",
                )}
              >
                {s.titulo}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
