import { Search } from "lucide-react";
import { DecoracionBanda } from "@/components/ui/decoracion-banda";
import {
  Esqueleto,
  GrillaOfertasEsqueleto,
  LineaBanda,
} from "@/components/ui/esqueleto";
import { clasePastilla } from "@/components/ui/pastilla-filtro";
import { MODALIDADES } from "@/lib/ofertas";
import { EsqueletoExplorarRubros } from "./explorar-rubros";

/**
 * /ofertas mientras carga: la banda verde real (título, buscador y botón) con
 * la cantidad en gris, "Explorá por rubro", las pastillas de modalidad con su
 * texto real y la grilla de tarjetas detalladas.
 */
export function EsqueletoListadoOfertas() {
  return (
    <section className="flex flex-col gap-8">
      <div className="banda-ofertas flex flex-col gap-5 sm:gap-6">
        <DecoracionBanda />
        <div className="flex flex-col gap-2">
          <h1 className="titulo-portada text-[34px] leading-[1.1] text-white sm:text-5xl">
            Ofertas de trabajo
          </h1>
          <p className="text-base text-sidebar-texto">
            <LineaBanda className="w-[22em]" />
          </p>
        </div>
        <div
          aria-hidden="true"
          className="w-full max-w-[880px] rounded-2xl bg-surface p-2 shadow-[var(--sombra-buscador)]"
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-[18px] w-[18px] -translate-y-1/2 text-muted-icon" />
              <div className="campo flex min-h-[52px] items-center border-border-campo pl-10 text-placeholder">
                <span className="truncate">Buscar por puesto, empresa, palabra clave o conocimiento</span>
              </div>
            </div>
            <span className="btn-primario min-h-[52px]! px-7!">Buscar</span>
          </div>
        </div>
      </div>

      <EsqueletoExplorarRubros />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Esqueleto className="h-6 w-28" />
          <div aria-hidden="true" className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-[13px] font-bold text-muted-foreground-strong">Modalidad</span>
            <div className="flex flex-wrap gap-2">
              {["Todas", ...MODALIDADES].map((m, i) => (
                <span key={m} className={clasePastilla(i === 0, "pointer-events-none rounded-[22px] sm:h-11")}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
        <GrillaOfertasEsqueleto cantidad={6} />
      </div>
    </section>
  );
}
