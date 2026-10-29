"use client";

import {
  createContext,
  use,
  useOptimistic,
  useTransition,
  type MouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { clasePastilla } from "@/components/ui/pastilla-filtro";
import { alternarValor, hrefFiltrosOfertas } from "@/lib/filtros-ofertas";
import type { ParamsUrl } from "@/lib/paginacion";
import { cn } from "@/lib/utils";

type Seleccion = { categorias: readonly string[]; modalidades: readonly string[] };
type Tipo = "categoria" | "modalidad";

type Contexto = {
  /** La selección optimista: la de la URL, o la última tocada mientras llega la página. */
  seleccion: Seleccion;
  pendiente: boolean;
  /** Selección que resulta de tocar `valor` (null: «Todos» / «Todas»). */
  alTocar: (tipo: Tipo, valor: string | null) => Seleccion;
  href: (seleccion: Seleccion) => string;
  navegar: (seleccion: Seleccion) => void;
};

const ContextoSeleccion = createContext<Contexto | null>(null);

export function useSeleccionFiltrosOfertas(): Contexto {
  const contexto = use(ContextoSeleccion);
  if (!contexto) throw new Error("Falta <SeleccionFiltrosOfertas> alrededor de los filtros.");
  return contexto;
}

/**
 * Selección de rubros y modalidades de /ofertas que se marca al instante.
 * La de la URL es la base; al tocar una opción, useOptimistic la muestra en
 * el momento y router.push navega dentro de la misma transición. Cada toque
 * parte de la selección optimista, así varios seguidos se acumulan. Cuando
 * la transición termina (o falla), vuelve a la de la URL. El filtrado sigue
 * en el servidor.
 */
export function SeleccionFiltrosOfertas({
  ruta,
  searchParams,
  catalogo,
  seleccion: deUrl,
  children,
}: {
  ruta: string;
  searchParams: ParamsUrl;
  /** Todos los rubros y modalidades, en el orden en que se escriben en la URL. */
  catalogo: { categorias: readonly string[]; modalidades: readonly string[] };
  seleccion: Seleccion;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  // La acción es la selección completa (no «alternar X»): si la base cambia
  // mientras hay otra pendiente, reaplicarla da el mismo resultado.
  const [seleccion, setSeleccion] = useOptimistic<Seleccion, Seleccion>(deUrl, (_, nueva) => nueva);

  function alTocar(tipo: Tipo, valor: string | null): Seleccion {
    if (tipo === "categoria") {
      return {
        ...seleccion,
        categorias: valor === null ? [] : alternarValor(catalogo.categorias, seleccion.categorias, valor),
      };
    }
    return {
      ...seleccion,
      modalidades: valor === null ? [] : alternarValor(catalogo.modalidades, seleccion.modalidades, valor),
    };
  }

  function href(nueva: Seleccion) {
    return hrefFiltrosOfertas(ruta, searchParams, nueva, {});
  }

  function navegar(nueva: Seleccion) {
    const destino = href(nueva);
    startTransition(() => {
      setSeleccion(nueva);
      router.push(destino, { scroll: false });
    });
  }

  return (
    <ContextoSeleccion value={{ seleccion, pendiente, alTocar, href, navegar }}>
      {children}
    </ContextoSeleccion>
  );
}

/** Solo el clic simple navega con la selección optimista; Ctrl/Cmd, Shift o el botón del medio siguen el link. */
function useLinkFiltro(tipo: Tipo, valor: string | null) {
  const { seleccion, alTocar, href, navegar } = useSeleccionFiltrosOfertas();
  const lista = tipo === "categoria" ? seleccion.categorias : seleccion.modalidades;
  const elegida = valor === null ? lista.length === 0 : lista.includes(valor);
  const nueva = alTocar(tipo, valor);

  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    e.preventDefault();
    navegar(nueva);
  }

  return { elegida, href: href(nueva), onClick };
}

/** Tarjeta de «Explorá por rubro». `valor` null es «Todos». */
export function TarjetaRubro({
  valor,
  icono,
  nombre,
  detalle,
}: {
  valor: string | null;
  icono: ReactNode;
  nombre: string;
  detalle?: string;
}) {
  const { elegida, href, onClick } = useLinkFiltro("categoria", valor);
  return (
    <Link
      href={href}
      scroll={false}
      onClick={onClick}
      aria-current={elegida ? "true" : undefined}
      className={cn("tarjeta-rubro", elegida && "tarjeta-rubro--elegida")}
    >
      <span className="tarjeta-rubro-icono">{icono}</span>
      <span className="tarjeta-rubro-nombre">{nombre}</span>
      {detalle && <span className="tarjeta-rubro-detalle">{detalle}</span>}
      {elegida && (
        <span className="tarjeta-rubro-tilde" aria-hidden="true">
          <Check />
        </span>
      )}
    </Link>
  );
}

/** Pastilla de Modalidad. `valor` null es «Todas». */
export function PastillaModalidad({ valor, children }: { valor: string | null; children: ReactNode }) {
  const { elegida, href, onClick } = useLinkFiltro("modalidad", valor);
  return (
    <Link
      href={href}
      scroll={false}
      onClick={onClick}
      aria-current={elegida ? "true" : undefined}
      className={clasePastilla(elegida, "rounded-[22px] sm:h-11")}
    >
      {children}
    </Link>
  );
}

/** La lista de resultados se atenúa mientras llega la página nueva. */
export function ResultadosPendientes({ children }: { children: ReactNode }) {
  const { pendiente } = useSeleccionFiltrosOfertas();
  return (
    <div
      aria-busy={pendiente ? "true" : undefined}
      className={cn(
        "transition-opacity duration-150 motion-reduce:transition-none",
        pendiente && "opacity-60",
      )}
    >
      {children}
    </div>
  );
}
