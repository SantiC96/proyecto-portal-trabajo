import type { ReactNode } from "react";
import { Buscador } from "@/components/ui/buscador";
import { DecoracionBanda } from "@/components/ui/decoracion-banda";

/**
 * Banda verde de /ofertas: título, cantidad de ofertas y buscador (q). La
 * decoración (anillo y escudo) va en una capa propia que recorta sin cortar
 * lo que salga de la banda.
 */
export function BandaOfertas({ cantidad }: { cantidad: ReactNode }) {
  return (
    <section aria-labelledby="ofertas-titulo" className="banda-ofertas flex flex-col gap-5 sm:gap-6">
      <DecoracionBanda />

      <div className="flex flex-col gap-2">
        <h1
          id="ofertas-titulo"
          className="titulo-display text-[34px] leading-[1.1] text-white sm:text-5xl"
        >
          Ofertas de trabajo
        </h1>
        <p className="text-base text-sidebar-texto">{cantidad}</p>
      </div>

      <div className="w-full max-w-[880px] rounded-2xl bg-surface p-2 shadow-[var(--sombra-buscador)]">
        <Buscador
          placeholder="Buscar por puesto, empresa, palabra clave o conocimiento"
          boton="Buscar"
          className="gap-2"
          inputClassName="min-h-[52px] border-border-campo"
        />
      </div>
    </section>
  );
}
