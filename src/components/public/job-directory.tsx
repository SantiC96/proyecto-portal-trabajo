"use client";

import { useState, useMemo } from "react";
import { OfertaLaboral } from "@/types/oferta";
import { JobCard } from "@/components/public/job-card";
import { Search, Filter, X } from "lucide-react";

interface JobDirectoryProps {
  ofertas: OfertaLaboral[];
  categorias: string[];
}

export function JobDirectory({ ofertas, categorias }: JobDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRubro, setSelectedRubro] = useState<string>("Todos");
  const [selectedModalidad, setSelectedModalidad] = useState<string>("Todas");

  const rubroOptions = ["Todos", ...categorias];

  const filteredOfertas = useMemo(() => {
    return ofertas.filter((oferta) => {
      const matchesRubro =
        selectedRubro === "Todos" || oferta.rubro.toLowerCase() === selectedRubro.toLowerCase();

      const matchesModalidad =
        selectedModalidad === "Todas" || oferta.modalidad === selectedModalidad;

      const query = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !query ||
        oferta.titulo.toLowerCase().includes(query) ||
        oferta.empresa.toLowerCase().includes(query) ||
        oferta.descripcion.toLowerCase().includes(query) ||
        oferta.ubicacion.toLowerCase().includes(query) ||
        oferta.requisitos.some((req) => req.toLowerCase().includes(query));

      return matchesRubro && matchesModalidad && matchesQuery;
    });
  }, [ofertas, searchQuery, selectedRubro, selectedModalidad]);

  const hasActiveFilters =
    searchQuery.trim() !== "" || selectedRubro !== "Todos" || selectedModalidad !== "Todas";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedRubro("Todos");
    setSelectedModalidad("Todas");
  };

  return (
    <section id="ofertas" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16 scroll-mt-20">
      {/* Section Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-xs font-bold tracking-wider text-primary uppercase">
            Búsquedas activas en Funes
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Ofertas laborales publicadas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Explorá las vacantes vigentes de comercios, empresas e industrias de la ciudad.
          </p>
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs font-medium text-muted-foreground-strong md:mt-0">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          <span>
            {filteredOfertas.length}{" "}
            {filteredOfertas.length === 1 ? "oferta disponible" : "ofertas disponibles"}
          </span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="mt-6 rounded-2xl border border-border bg-white p-4 shadow-xs">
        {/* Main Search Input */}
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por puesto, empresa, palabra clave o conocimiento..."
            className="h-11 w-full rounded-xl border border-border bg-background/60 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:bg-white focus:outline-none focus:ring-3 focus:ring-primary/15"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 rounded-full p-1 text-muted-foreground hover:bg-gray-100"
              aria-label="Borrar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Categories / Rubros Pills (Mobile horizontal scroll) */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Rubro o Sector:</span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-medium text-primary hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            {rubroOptions.map((rubro) => {
              const isSelected = selectedRubro === rubro;
              return (
                <button
                  key={rubro}
                  type="button"
                  onClick={() => setSelectedRubro(rubro)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 font-medium transition-all ${
                    isSelected
                      ? "bg-primary text-white shadow-xs"
                      : "border border-border bg-white text-muted-foreground-strong hover:border-primary hover:text-primary"
                  }`}
                >
                  {rubro}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modality Filter Pills */}
        <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-border/60 text-xs">
          <span className="font-semibold text-foreground">Modalidad:</span>
          {(["Todas", "Presencial", "Híbrido", "Remoto"] as const).map((mod) => {
            const isSelected = selectedModalidad === mod;
            return (
              <button
                key={mod}
                type="button"
                onClick={() => setSelectedModalidad(mod)}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  isSelected
                    ? "bg-foreground text-white font-medium"
                    : "bg-surface-tinted text-muted-foreground-strong hover:bg-secondary-hover"
                }`}
              >
                {mod}
              </button>
            );
          })}
        </div>
      </div>

      {/* Job Cards Grid */}
      {filteredOfertas.length > 0 ? (
        <div className="mt-6 grid auto-rows-fr grid-cols-1 gap-5 md:grid-cols-2">
          {filteredOfertas.map((oferta) => (
            <JobCard key={oferta.id} oferta={oferta} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-muted-foreground">
            <Filter className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-base font-bold text-foreground">
            No encontramos ofertas con esos criterios
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Probá quitando o modificando los filtros aplicados o buscando un término más general.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-hover"
          >
            Ver todas las ofertas
          </button>
        </div>
      )}
    </section>
  );
}
