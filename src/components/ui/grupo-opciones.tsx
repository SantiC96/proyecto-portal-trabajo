"use client";

import { useRef, type KeyboardEvent } from "react";
import { clasePastilla } from "@/components/ui/pastilla-filtro";
import { ErrorCampo, Obligatorio, ariaErrorCampo } from "@/components/ui/obligatorio";

/**
 * Opciones en pastillas de 44 px que se comportan como radios: una sola
 * elegida, un solo paso de tabulación y las flechas para cambiar (como un
 * grupo de radios nativo). El valor viaja en un input oculto con el name.
 * Lo usan el formulario de oferta y la modalidad de la pre-entrevista.
 */
export function GrupoOpciones({
  id,
  titulo,
  opciones,
  etiquetaOpcion = (o) => o,
  valor,
  onElegir,
  error,
  deshabilitado = false,
}: {
  id: string;
  titulo: string;
  opciones: readonly string[];
  etiquetaOpcion?: (opcion: string) => string;
  valor: string;
  onElegir: (valor: string) => void;
  error?: string;
  deshabilitado?: boolean;
}) {
  const botones = useRef<(HTMLButtonElement | null)[]>([]);
  const indiceElegido = opciones.indexOf(valor);

  function elegir(indice: number) {
    onElegir(opciones[indice]);
    botones.current[indice]?.focus();
  }

  function alPresionar(e: KeyboardEvent<HTMLButtonElement>, indice: number) {
    const ultimo = opciones.length - 1;
    let destino: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") destino = indice === ultimo ? 0 : indice + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") destino = indice === 0 ? ultimo : indice - 1;
    else if (e.key === "Home") destino = 0;
    else if (e.key === "End") destino = ultimo;
    if (destino === null) return;
    e.preventDefault();
    elegir(destino);
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span id={`${id}-etiqueta`} className="etiqueta-campo">
        {titulo} <Obligatorio />
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-etiqueta`}
        aria-required="true"
        aria-disabled={deshabilitado || undefined}
        // Para que el foco del primer error pueda llegar al grupo.
        tabIndex={-1}
        className="flex flex-wrap gap-2 rounded-[22px] outline-none focus:shadow-[var(--sombra-foco)]"
        {...ariaErrorCampo(id, error)}
      >
        {opciones.map((o, i) => {
          const elegida = i === indiceElegido;
          const enfocable = elegida || (indiceElegido === -1 && i === 0);
          return (
            <button
              key={o}
              ref={(el) => {
                botones.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={elegida}
              tabIndex={enfocable ? 0 : -1}
              disabled={deshabilitado}
              onClick={() => elegir(i)}
              onKeyDown={(e) => alPresionar(e, i)}
              className={clasePastilla(elegida, "cursor-pointer sm:h-11 disabled:cursor-not-allowed disabled:opacity-60")}
            >
              {etiquetaOpcion(o)}
            </button>
          );
        })}
      </div>
      <input type="hidden" name={id} value={valor} />
      <ErrorCampo idCampo={id} mensaje={error} />
    </div>
  );
}
