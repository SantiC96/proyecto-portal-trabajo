"use client";

import Link from "next/link";
import { ArrowDown, CheckCircle2, ShieldCheck, Users } from "lucide-react";
import { AuthLink } from "@/components/auth/auth-link";
import { useSesion } from "@/components/layout/sesion-provider";

export function Hero() {
  const sesion = useSesion();
  const esEmpresa = sesion?.rol === "empresa";

  const handleScrollToOfertas = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.getElementById("ofertas");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", "#ofertas");
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-secondary to-background pt-10 pb-12 sm:pt-16 sm:pb-20">
      {/* Decorative background aura */}
      <div
        className="pointer-events-none absolute -top-24 right-1/2 h-80 w-80 translate-x-1/2 rounded-full bg-primary/10 blur-3xl sm:h-96 sm:w-96"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          {/* Institutional Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-xs backdrop-blur-xs">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Oficina de Empleo • Municipalidad de Funes
          </div>

          {/* Main Title */}
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl sm:leading-tight">
            Encontrá tu próximo trabajo o sumá{" "}
            <span className="text-primary underline decoration-primary/30 underline-offset-4">
              talento en Funes
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-4 text-base text-muted-foreground-strong sm:text-lg sm:leading-relaxed">
            El portal oficial de intermediación laboral para vecinos, comercios e industrias de nuestra ciudad.
            Acompañamiento personalizado, pre-entrevistas y selección transparente.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <a
              href="#ofertas"
              onClick={handleScrollToOfertas}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover sm:w-auto"
            >
              <span>Ver ofertas disponibles</span>
              <ArrowDown className="h-4 w-4" />
            </a>
            {esEmpresa ? (
              <Link
                href="/empresa"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-white px-6 text-sm font-semibold text-foreground shadow-xs transition hover:border-primary hover:text-primary sm:w-auto"
              >
                <span>Mi panel de empresa</span>
              </Link>
            ) : (
              <AuthLink
                href="/auth/login"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-white px-6 text-sm font-semibold text-foreground shadow-xs transition hover:border-primary hover:text-primary sm:w-auto"
              >
                <span>Acceso usuarios y empresas</span>
              </AuthLink>
            )}
          </div>

          {/* Highlights */}
          <div className="mt-10 grid grid-cols-1 gap-3 pt-6 border-t border-border/70 text-left sm:grid-cols-3 sm:gap-4">
            <div className="flex items-center gap-3 rounded-lg bg-white/60 p-3 backdrop-blur-xs">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
              <div className="text-xs font-medium text-foreground">
                <strong className="block text-sm font-semibold">100% Oficial y Gratuito</strong>
                Sin intermediarios con costo
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-white/60 p-3 backdrop-blur-xs">
              <Users className="h-5 w-5 text-primary shrink-0" />
              <div className="text-xs font-medium text-foreground">
                <strong className="block text-sm font-semibold">Talento Local de Funes</strong>
                Prioridad de cercanía geográfica
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-white/60 p-3 backdrop-blur-xs">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <div className="text-xs font-medium text-foreground">
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
