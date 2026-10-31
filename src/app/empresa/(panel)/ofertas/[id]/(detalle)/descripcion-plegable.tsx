"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Descripción de la oferta recortada a 8 líneas con "Ver más". El botón
 * aparece solo si el texto no entra: se mide en el navegador, porque depende
 * del ancho de la columna.
 */
export function DescripcionPlegable({ texto }: { texto: string }) {
  const id = useId();
  const ref = useRef<HTMLParagraphElement>(null);
  const [abierta, setAbierta] = useState(false);
  const [recortada, setRecortada] = useState(false);

  useEffect(() => {
    const p = ref.current;
    if (!p || abierta) return;
    // ResizeObserver también avisa apenas empieza a observar: mide la primera vez.
    const observador = new ResizeObserver(() =>
      setRecortada(p.scrollHeight > p.clientHeight + 1),
    );
    observador.observe(p);
    return () => observador.disconnect();
  }, [abierta]);

  return (
    <div className="flex flex-col items-start gap-1">
      <p
        id={id}
        ref={ref}
        className={cn(
          "text-base leading-[1.6] whitespace-pre-line break-words text-texto-parrafo",
          !abierta && "line-clamp-8",
        )}
      >
        {texto}
      </p>
      {(recortada || abierta) && (
        <button
          type="button"
          aria-expanded={abierta}
          aria-controls={id}
          onClick={() => setAbierta((v) => !v)}
          className="inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-sm)] text-[15px] font-bold text-primary outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]"
        >
          {abierta ? "Ver menos" : "Ver más"}
          <ChevronDown
            className={cn(
              "size-4 shrink-0 transition-transform duration-150 motion-reduce:transition-none",
              abierta && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
}
