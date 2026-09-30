"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OFERTAS_MOCK, CATEGORIAS_RUBROS } from "@/data/mock-ofertas";
import { OfertaLaboral } from "@/types/oferta";
import { JobCard } from "@/components/public/job-card";
import { Search, Filter, X, LogIn, UserPlus, AlertCircle } from "lucide-react";

export function JobDirectory() {
  const router = useRouter();

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRubro, setSelectedRubro] = useState<string>("Todos");
  const [selectedModalidad, setSelectedModalidad] = useState<string>("Todas");

  // Modal state when visitor clicks "Postularme" without session
  const [applyModalOferta, setApplyModalOferta] = useState<OfertaLaboral | null>(null);

  // Filtered job list
  const filteredOfertas = useMemo(() => {
    return OFERTAS_MOCK.filter((oferta) => {
      // Rubro filter
      const matchesRubro =
        selectedRubro === "Todos" || oferta.rubro.toLowerCase() === selectedRubro.toLowerCase();

      // Modalidad filter
      const matchesModalidad =
        selectedModalidad === "Todas" || oferta.modalidad === selectedModalidad;

      // Search query filter (matches title, description, company, or requirements)
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
  }, [searchQuery, selectedRubro, selectedModalidad]);

  const hasActiveFilters =
    searchQuery.trim() !== "" || selectedRubro !== "Todos" || selectedModalidad !== "Todas";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedRubro("Todos");
    setSelectedModalidad("Todas");
  };

  const handleApplyClick = (oferta: OfertaLaboral) => {
    // Show the login-redirect modal so the visitor understands and can choose login or register
    setApplyModalOferta(oferta);
  };

  const handleConfirmLoginRedirect = () => {
    if (applyModalOferta) {
      const redirectTarget = `/ofertas/${applyModalOferta.id}?accion=postular`;
      router.push(`/auth/login?redirect=${encodeURIComponent(redirectTarget)}`);
    } else {
      router.push("/auth/login");
    }
  };

  return (
    <section id="ofertas" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16 scroll-mt-20">
      {/* Section Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-xs font-bold tracking-wider text-[#0f5b53] uppercase">
            Búsquedas activas en Funes
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-[#1b2926] sm:text-3xl">
            Ofertas laborales publicadas
          </h2>
          <p className="mt-1 text-sm text-[#6e7772]">
            Explorá las vacantes vigentes de comercios, empresas e industrias de la ciudad.
          </p>
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs font-medium text-[#4f5a54] md:mt-0">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          <span>
            {filteredOfertas.length}{" "}
            {filteredOfertas.length === 1 ? "oferta disponible" : "ofertas disponibles"}
          </span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="mt-6 rounded-2xl border border-[#d8ddd7] bg-white p-4 shadow-xs">
        {/* Main Search Input */}
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#6e7772]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por puesto, empresa, palabra clave o conocimiento..."
            className="h-11 w-full rounded-xl border border-[#d8ddd7] bg-[#f8f8f4]/60 pl-10 pr-10 text-sm text-[#1b2926] placeholder:text-[#6e7772]/70 focus:border-[#0f5b53] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#0f5b53]/15"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 rounded-full p-1 text-[#6e7772] hover:bg-gray-100"
              aria-label="Borrar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Categories / Rubros Pills (Mobile horizontal scroll) */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1b2926]">Rubro o Sector:</span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-medium text-[#0f5b53] hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            {CATEGORIAS_RUBROS.map((rubro) => {
              const isSelected = selectedRubro === rubro;
              return (
                <button
                  key={rubro}
                  type="button"
                  onClick={() => setSelectedRubro(rubro)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 font-medium transition-all ${
                    isSelected
                      ? "bg-[#0f5b53] text-white shadow-xs"
                      : "border border-[#d8ddd7] bg-white text-[#4f5a54] hover:border-[#0f5b53] hover:text-[#0f5b53]"
                  }`}
                >
                  {rubro}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modality Filter Pills */}
        <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-[#d8ddd7]/60 text-xs">
          <span className="font-semibold text-[#1b2926]">Modalidad:</span>
          {(["Todas", "Presencial", "Híbrido", "Remoto"] as const).map((mod) => {
            const isSelected = selectedModalidad === mod;
            return (
              <button
                key={mod}
                type="button"
                onClick={() => setSelectedModalidad(mod)}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  isSelected
                    ? "bg-[#1b2926] text-white font-medium"
                    : "bg-[#f0f4f1] text-[#4f5a54] hover:bg-[#e2ebe4]"
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
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {filteredOfertas.map((oferta) => (
            <JobCard key={oferta.id} oferta={oferta} onApply={handleApplyClick} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-[#d8ddd7] bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-[#6e7772]">
            <Filter className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-base font-bold text-[#1b2926]">
            No encontramos ofertas con esos criterios
          </h3>
          <p className="mt-1 text-xs text-[#6e7772]">
            Probá quitando o modificando los filtros aplicados o buscando un término más general.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 inline-flex items-center rounded-lg bg-[#0f5b53] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#093e39]"
          >
            Ver todas las ofertas
          </button>
        </div>
      )}

      {/* Visitor Apply / Login Redirect Modal */}
      {applyModalOferta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="apply-modal-title"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-[#d8ddd7] bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setApplyModalOferta(null)}
              className="absolute top-4 right-4 rounded-full p-1.5 text-[#6e7772] transition hover:bg-gray-100 hover:text-[#1b2926]"
              aria-label="Cerrar ventana"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 id="apply-modal-title" className="text-lg font-bold text-[#1b2926]">
                Iniciá sesión para postularte
              </h3>
              <p className="mt-2 text-sm text-[#4f5a54]">
                Para postularte a la búsqueda de{" "}
                <strong className="text-[#1b2926]">&ldquo;{applyModalOferta.titulo}&rdquo;</strong> en{" "}
                <span className="font-semibold text-[#1b2926]">{applyModalOferta.empresa}</span>, es
                necesario ingresar con tu cuenta de Postulante.
              </p>
            </div>

            <div className="rounded-xl bg-[#f8f8f4] p-3 text-xs text-[#6e7772]">
              💡 Las postulaciones son revisadas por el equipo de intermediación laboral municipal antes
              de ser presentadas a la empresa.
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleConfirmLoginRedirect}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0f5b53] font-semibold text-white shadow-xs transition hover:bg-[#093e39]"
              >
                <LogIn className="h-4 w-4" />
                <span>Ir al formulario de Login</span>
              </button>

              <Link
                href="/auth/registro"
                onClick={() => setApplyModalOferta(null)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#d8ddd7] bg-white font-medium text-[#1b2926] transition hover:border-[#0f5b53] hover:text-[#0f5b53]"
              >
                <UserPlus className="h-4 w-4" />
                <span>¿No tenés cuenta? Registrate gratis</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
