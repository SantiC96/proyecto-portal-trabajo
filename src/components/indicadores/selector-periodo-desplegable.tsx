"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Calendar, Check, ChevronDown } from "lucide-react";
import { PERIODOS, PERIODO_LABEL, hrefPeriodo, type Periodo } from "@/lib/indicadores-periodo";
import { cn } from "@/lib/utils";

/**
 * Selector de período desplegable (indicadores de la oficina). Un botón con
 * el período elegido abre la lista; cada opción es un link con el mismo
 * ?periodo= de siempre, así el período se resuelve en el servidor. Patrón
 * disclosure: botón con aria-expanded y aria-controls, Escape cierra y
 * devuelve el foco al botón, y un clic afuera también cierra. La opción
 * elegida lleva aria-current. Sin JavaScript, los links se ven en una fila
 * (noscript).
 *
 * Con `enBanda` (indicadores de la empresa) va sobre la banda verde: el label
 * "Período" visible arriba y el botón blanco de 48 px con texto
 * `primary-hover`; en el celular, a todo el ancho.
 */
export function SelectorPeriodoDesplegable({
  ruta,
  periodo,
  enBanda = false,
  className,
}: {
  ruta: string;
  periodo: Periodo;
  enBanda?: boolean;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const idLista = useId();
  const contenedor = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function alTocarAfuera(e: PointerEvent) {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    }
    function alTeclear(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setAbierto(false);
      boton.current?.focus();
    }
    function alSalirElFoco(e: FocusEvent) {
      if (!contenedor.current?.contains(e.relatedTarget as Node | null)) setAbierto(false);
    }
    const el = contenedor.current;
    document.addEventListener("pointerdown", alTocarAfuera);
    document.addEventListener("keydown", alTeclear);
    el?.addEventListener("focusout", alSalirElFoco);
    return () => {
      document.removeEventListener("pointerdown", alTocarAfuera);
      document.removeEventListener("keydown", alTeclear);
      el?.removeEventListener("focusout", alSalirElFoco);
    };
  }, [abierto]);

  return (
    <div
      ref={contenedor}
      className={cn("relative w-full sm:w-auto", enBanda && "selector-periodo-banda", className)}
    >
      {enBanda && (
        <span aria-hidden="true" className="mb-1.5 block text-[13px] font-semibold text-sidebar-texto">
          Período
        </span>
      )}
      <button
        ref={boton}
        type="button"
        aria-expanded={abierto}
        aria-controls={idLista}
        onClick={() => setAbierto((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2.5 bg-surface px-4 text-[15px] font-bold transition-colors duration-150 sm:w-auto sm:min-w-[232px]",
          enBanda
            ? "h-12 rounded-[var(--radius-lg)] text-primary-hover hover:bg-sidebar-texto focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
            : "h-[50px] rounded-[var(--radius-xl)] border border-border text-heading shadow-[var(--sombra-selector)] outline-none hover:border-border-strong focus-visible:shadow-[var(--sombra-foco)]",
        )}
      >
        <Calendar aria-hidden="true" className="size-5 shrink-0 text-primary" />
        <span className="sr-only">Período: </span>
        <span className="flex-1 text-left">{PERIODO_LABEL[periodo]}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-5 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
            enBanda ? "text-primary" : "text-muted-foreground",
            abierto && "rotate-180",
          )}
        />
      </button>

      <ul
        id={idLista}
        hidden={!abierto}
        aria-label="Período"
        className="absolute top-full right-0 z-30 mt-2 w-full overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface p-1.5 shadow-[var(--sombra-selector)] sm:min-w-[232px]"
      >
        {PERIODOS.map((p) => {
          const actual = p === periodo;
          return (
            <li key={p}>
              <Link
                href={hrefPeriodo(ruta, p)}
                scroll={false}
                aria-current={actual ? "page" : undefined}
                onClick={() => setAbierto(false)}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] px-3 text-[15px] no-underline outline-none transition-colors duration-150 focus-visible:shadow-[var(--sombra-foco)]",
                  actual
                    ? "bg-secondary font-bold text-primary"
                    : "font-semibold text-control-foreground hover:bg-secondary hover:text-primary",
                )}
              >
                <span className="flex-1">{PERIODO_LABEL[p]}</span>
                {actual && <Check aria-hidden="true" className="size-[18px] shrink-0" />}
              </Link>
            </li>
          );
        })}
      </ul>

      <noscript>
        <nav aria-label="Período" className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {PERIODOS.map((p) => (
            <a
              key={p}
              href={hrefPeriodo(ruta, p)}
              aria-current={p === periodo ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center text-sm font-bold",
                enBanda ? "text-primary-foreground underline" : "text-primary",
              )}
            >
              {PERIODO_LABEL[p]}
            </a>
          ))}
        </nav>
      </noscript>
    </div>
  );
}
