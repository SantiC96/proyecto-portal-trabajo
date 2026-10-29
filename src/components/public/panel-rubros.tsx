"use client";

import { useId, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Check, List, Search, X } from "lucide-react";
import { Dialog, DialogClose, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { useSeleccionFiltrosOfertas } from "@/components/public/seleccion-filtros-ofertas";
import { agruparPorLetra, filtrarRubros } from "@/lib/rubros-panel";
import type { RubroConOfertas } from "@/lib/rubros-destacados";
import { cn } from "@/lib/utils";

type Props = {
  /** Rubros con ofertas vigentes (los únicos que se listan). */
  rubros: RubroConOfertas[];
  /** Todos los rubros por nombre, en el orden en que se escriben en la URL. */
  catalogo: string[];
  /** Rubros elegidos en la URL (para saber si totalActual sirve). */
  elegidos: string[];
  /** Rubros de las tarjetas visibles: los elegidos que no están pintan "Ver todos". */
  destacados: string[];
  /** Total de ofertas con la selección de la URL; null si no se conoce. */
  totalActual: number | null;
  /** Hay texto o modalidades elegidas: la cantidad de un rubro ya no alcanza. */
  hayOtrosFiltros: boolean;
};

function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`;
}

function mismosRubros(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((x) => b.includes(x));
}

/**
 * "Ver todos" de "Explorá por rubro" y su panel "Todos los rubros". Solo
 * elige rubros y cambia ?categoria= en la URL (conserva q y modalidad, vuelve
 * a la página 1): el filtrado lo hace el servidor. Parte de la selección
 * optimista de SeleccionFiltrosOfertas y aplica con ella. Lateral derecho de 400 px
 * desde sm y pantalla completa en el celular, con el Dialog de Base UI (foco
 * atrapado, Escape, aria-modal y el foco de vuelta en "Ver todos").
 */
export function PanelRubros({
  rubros,
  catalogo,
  elegidos,
  destacados,
  totalActual,
  hayOtrosFiltros,
}: Props) {
  const { seleccion: actual, navegar } = useSeleccionFiltrosOfertas();
  const id = useId();
  const disparadorRef = useRef<HTMLButtonElement>(null);
  const busquedaRef = useRef<HTMLInputElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [seleccion, setSeleccion] = useState<readonly string[]>(actual.categorias);
  const [texto, setTexto] = useState("");

  function cambiarAbierto(abrir: boolean) {
    if (abrir) {
      setSeleccion(actual.categorias);
      setTexto("");
    }
    setAbierto(abrir);
  }

  function alternar(nombre: string) {
    setSeleccion((previa) =>
      previa.includes(nombre) ? previa.filter((n) => n !== nombre) : [...previa, nombre],
    );
  }

  function aplicar() {
    setAbierto(false);
    navegar({ ...actual, categorias: catalogo.filter((c) => seleccion.includes(c)) });
  }

  const visibles = filtrarRubros(rubros, texto);
  const grupos = agruparPorLetra(visibles);
  const buscado = texto.trim();

  // La cantidad solo se muestra cuando se sabe sin otra consulta: la misma
  // selección de la URL, o un solo rubro sin texto ni modalidad.
  let cantidad: number | null = null;
  if (mismosRubros(seleccion, elegidos)) cantidad = totalActual;
  else if (seleccion.length === 1 && !hayOtrosFiltros) {
    cantidad = rubros.find((r) => r.nombre === seleccion[0])?.cantidad ?? null;
  }
  const textoAplicar = cantidad === null ? "Ver ofertas" : `Ver ${plural(cantidad, "oferta", "ofertas")}`;

  const elegidosOcultos = actual.categorias.filter((c) => !destacados.includes(c));
  const conOcultos = elegidosOcultos.length > 0;
  const detalleDisparador = conOcultos
    ? elegidosOcultos.length === 1
      ? elegidosOcultos[0]
      : `${elegidosOcultos.length} rubros más`
    : plural(rubros.length, "rubro", "rubros");

  return (
    <Dialog open={abierto} onOpenChange={cambiarAbierto}>
      <button
        ref={disparadorRef}
        type="button"
        aria-haspopup="dialog"
        onClick={() => cambiarAbierto(true)}
        className={cn("tarjeta-rubro tarjeta-rubro--ver-todos", conOcultos && "tarjeta-rubro--elegida")}
      >
        <span className="tarjeta-rubro-icono">
          <List aria-hidden="true" />
        </span>
        <span className="tarjeta-rubro-nombre">Ver todos</span>
        <span className="tarjeta-rubro-detalle">
          {conOcultos && <span className="sr-only">Elegidos: </span>}
          {detalleDisparador}
        </span>
        {conOcultos && (
          <span className="tarjeta-rubro-tilde" aria-hidden="true">
            <Check />
          </span>
        )}
      </button>

      <DialogPortal>
        <DialogOverlay className="panel-rubros-fondo backdrop-blur-none" />
        <DialogPrimitive.Popup
          aria-modal="true"
          aria-describedby={`${id}-estado`}
          initialFocus={(tipo) => (tipo === "touch" ? true : busquedaRef.current)}
          finalFocus={disparadorRef}
          className="panel-rubros fixed inset-0 z-50 flex flex-col bg-surface text-foreground shadow-[var(--sombra-dialogo)] outline-none sm:left-auto sm:w-[400px]"
        >
          <div className="panel-rubros-cabecera flex items-center gap-3 py-3 pr-3 pl-5">
            <List className="size-5 shrink-0" aria-hidden="true" />
            <DialogTitle className="flex-1 text-xl text-white">Todos los rubros</DialogTitle>
            <DialogClose
              aria-label="Cerrar"
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-white outline-none transition-colors hover:bg-white/15 focus-visible:shadow-[0_0_0_2px_#fff]"
            >
              <X className="size-5" aria-hidden="true" />
            </DialogClose>
          </div>

          <div className="flex flex-col gap-2 border-b border-border px-5 pt-4 pb-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-icon"
                aria-hidden="true"
              />
              <label htmlFor={`${id}-buscar`} className="sr-only">
                Buscá un rubro
              </label>
              <input
                ref={busquedaRef}
                id={`${id}-buscar`}
                type="search"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Buscá un rubro"
                autoComplete="off"
                enterKeyHint="search"
                className="campo border-border-campo pl-10 [&::-webkit-search-cancel-button]:hidden"
              />
            </div>
            <p id={`${id}-estado`} aria-live="polite" className="text-sm text-muted-foreground">
              {buscado === ""
                ? `${plural(rubros.length, "rubro", "rubros")} con ofertas vigentes`
                : `${plural(visibles.length, "rubro", "rubros")} con «${buscado}»`}
              {seleccion.length > 0 && (
                <>
                  {" · "}
                  <strong className="font-bold text-primary">
                    {plural(seleccion.length, "elegido", "elegidos")}
                  </strong>
                </>
              )}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
            {grupos.length === 0 ? (
              <p className="py-6 text-center text-[15px] text-muted-foreground">
                No hay rubros que coincidan con «{buscado}».
              </p>
            ) : (
              grupos.map((grupo) => (
                <div key={grupo.letra} role="group" aria-labelledby={`${id}-letra-${grupo.letra}`} className="pb-2">
                  <p
                    id={`${id}-letra-${grupo.letra}`}
                    className="pt-2 pb-1 text-[13px] font-bold tracking-[0.08em] text-muted-foreground-strong"
                  >
                    {grupo.letra}
                  </p>
                  <ul>
                    {grupo.rubros.map((rubro) => {
                      const marcado = seleccion.includes(rubro.nombre);
                      return (
                        <li key={rubro.id}>
                          <label className="-mx-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--radius-md)] px-2 hover:bg-surface-tinted has-[:focus-visible]:shadow-[var(--sombra-foco)]">
                            <input
                              type="checkbox"
                              checked={marcado}
                              onChange={() => alternar(rubro.nombre)}
                              className="size-5 shrink-0 accent-primary outline-none"
                            />
                            <span className="min-w-0 flex-1 text-[15px] font-semibold text-heading">
                              {rubro.nombre}
                            </span>
                            <span
                              aria-hidden="true"
                              className="shrink-0 rounded-full bg-primary/12 px-2.5 py-0.5 text-[13px] font-bold text-primary-hover"
                            >
                              {rubro.cantidad}
                            </span>
                            <span className="sr-only">
                              , {plural(rubro.cantidad, "oferta", "ofertas")}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-3 border-t border-border bg-surface px-5 py-4">
            <button
              type="button"
              onClick={() => setSeleccion([])}
              disabled={seleccion.length === 0}
              className="btn-secundario min-h-11 flex-1 border-transparent bg-primary/12 px-4 text-[15px] font-bold text-primary-hover hover:bg-primary/20"
            >
              Limpiar rubros
            </button>
            <button
              type="button"
              onClick={aplicar}
              className="btn-primario min-h-11 flex-1 px-4 text-[15px] font-bold"
            >
              {textoAplicar}
            </button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
