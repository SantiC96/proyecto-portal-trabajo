"use client";

import Link from "next/link";
import { ArrowDown, CheckCircle2, ShieldCheck, Users } from "lucide-react";

export function Hero() {
  const handleScrollToOfertas = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.getElementById("ofertas");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", "#ofertas");
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#e8f0e9] to-[#f8f8f4] pt-10 pb-12 sm:pt-16 sm:pb-20">
      {/* Decorative background aura */}
      <div
        className="pointer-events-none absolute -top-24 right-1/2 h-80 w-80 translate-x-1/2 rounded-full bg-[#0f5b53]/10 blur-3xl sm:h-96 sm:w-96"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          {/* Institutional Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0f5b53]/20 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-[#0f5b53] shadow-xs backdrop-blur-xs">
            <span className="h-2 w-2 rounded-full bg-[#0f5b53] animate-pulse" />
            Oficina de Empleo • Municipalidad de Funes
          </div>

          {/* Main Title */}
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-[#1b2926] sm:text-5xl sm:leading-tight">
            Encontrá tu próximo trabajo o sumá{" "}
            <span className="text-[#0f5b53] underline decoration-[#0f5b53]/30 underline-offset-4">
              talento en Funes
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-4 text-base text-[#4f5a54] sm:text-lg sm:leading-relaxed">
            El portal oficial de intermediación laboral para vecinos, comercios e industrias de nuestra ciudad.
            Acompañamiento personalizado, pre-entrevistas y selección transparente.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <a
              href="#ofertas"
              onClick={handleScrollToOfertas}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0f5b53] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#093e39] sm:w-auto"
            >
              <span>Ver ofertas disponibles</span>
              <ArrowDown className="h-4 w-4" />
            </a>
            <Link
              href="/auth/login"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#d8ddd7] bg-white px-6 text-sm font-semibold text-[#1b2926] shadow-xs transition hover:border-[#0f5b53] hover:text-[#0f5b53] sm:w-auto"
            >
              <span>Acceso usuarios y empresas</span>
            </Link>
          </div>

          {/* Highlights */}
          <div className="mt-10 grid grid-cols-1 gap-3 pt-6 border-t border-[#d8ddd7]/70 text-left sm:grid-cols-3 sm:gap-4">
            <div className="flex items-center gap-3 rounded-lg bg-white/60 p-3 backdrop-blur-xs">
              <ShieldCheck className="h-5 w-5 text-[#0f5b53] shrink-0" />
              <div className="text-xs font-medium text-[#1b2926]">
                <strong className="block text-sm font-semibold">100% Oficial y Gratuito</strong>
                Sin intermediarios con costo
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-white/60 p-3 backdrop-blur-xs">
              <Users className="h-5 w-5 text-[#0f5b53] shrink-0" />
              <div className="text-xs font-medium text-[#1b2926]">
                <strong className="block text-sm font-semibold">Talento Local de Funes</strong>
                Prioridad de cercanía geográfica
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-white/60 p-3 backdrop-blur-xs">
              <CheckCircle2 className="h-5 w-5 text-[#0f5b53] shrink-0" />
              <div className="text-xs font-medium text-[#1b2926]">
                <strong className="block text-sm font-semibold">Preselección Cuidada</strong>
                Entrevistas previas del municipio
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
