import Link from "next/link";
import { UserCheck, FileText, MessagesSquare, CheckCircle, Building2, ArrowRight } from "lucide-react";

export function HowItWorks() {
  return (
    <section id="como-funciona" className="border-t border-[#d8ddd7] bg-[#f8f8f4] py-14 sm:py-20 scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Title */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold tracking-wider text-[#0f5b53] uppercase">
            Transparencia y cercanía
          </span>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#1b2926] sm:text-3xl">
            ¿Cómo funciona la intermediación municipal?
          </h2>
          <p className="mt-2 text-sm text-[#4f5a54] sm:text-base">
            El Portal de Empleo conecta a quienes buscan trabajo con las empresas locales a través de un
            proceso asistido por el equipo de empleo de la Municipalidad de Funes.
          </p>
        </div>

        {/* 4 Steps Timeline/Grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Step 1 */}
          <div className="relative flex flex-col rounded-2xl border border-[#d8ddd7] bg-white p-6 shadow-xs">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0f5b53]/10 text-[#0f5b53]">
              <FileText className="h-6 w-6" />
            </div>
            <span className="text-xs font-bold text-[#0f5b53]">Paso 01</span>
            <h3 className="mt-1 text-base font-bold text-[#1b2926]">Registrate y cargá tu CV</h3>
            <p className="mt-2 text-xs text-[#6e7772] leading-relaxed">
              Creá tu cuenta de postulante completando tus datos personales, experiencia, formación y habilidades.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative flex flex-col rounded-2xl border border-[#d8ddd7] bg-white p-6 shadow-xs">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0f5b53]/10 text-[#0f5b53]">
              <UserCheck className="h-6 w-6" />
            </div>
            <span className="text-xs font-bold text-[#0f5b53]">Paso 02</span>
            <h3 className="mt-1 text-base font-bold text-[#1b2926]">Postulate a búsquedas</h3>
            <p className="mt-2 text-xs text-[#6e7772] leading-relaxed">
              Explorá las ofertas vigentes y postuláte a las que coincidan con tu perfil e intereses laborales.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative flex flex-col rounded-2xl border border-[#d8ddd7] bg-white p-6 shadow-xs">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0f5b53]/10 text-[#0f5b53]">
              <MessagesSquare className="h-6 w-6" />
            </div>
            <span className="text-xs font-bold text-[#0f5b53]">Paso 03</span>
            <h3 className="mt-1 text-base font-bold text-[#1b2926]">Pre-entrevista municipal</h3>
            <p className="mt-2 text-xs text-[#6e7772] leading-relaxed">
              El equipo municipal revisa tu postulación y coordina una pre-entrevista para conocer mejor tus fortalezas.
            </p>
          </div>

          {/* Step 4 */}
          <div className="relative flex flex-col rounded-2xl border border-[#d8ddd7] bg-white p-6 shadow-xs">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0f5b53]/10 text-[#0f5b53]">
              <CheckCircle className="h-6 w-6" />
            </div>
            <span className="text-xs font-bold text-[#0f5b53]">Paso 04</span>
            <h3 className="mt-1 text-base font-bold text-[#1b2926]">Preselección y contacto</h3>
            <p className="mt-2 text-xs text-[#6e7772] leading-relaxed">
              Tu perfil preseleccionado se envía a la empresa correspondiente para la entrevista final y contratación.
            </p>
          </div>
        </div>

        {/* Section for Empresas */}
        <div
          id="empresas"
          className="mt-14 rounded-2xl border border-[#0f5b53]/20 bg-gradient-to-r from-[#093e39] to-[#0f5b53] p-8 text-white sm:p-10 scroll-mt-24"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-200 backdrop-blur-xs">
                <Building2 className="h-3.5 w-3.5" />
                <span>Espacio para Empresas y Comercios</span>
              </div>
              <h3 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                ¿Buscás personal para tu empresa en Funes?
              </h3>
              <p className="mt-2 text-sm text-gray-200 leading-relaxed sm:text-base">
                Registrá tu razón social en el portal. Nuestro equipo municipal valida tu registro, publica
                tus avisos y te envía una preselección de postulantes calificados sin costo de intermediación.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col shrink-0">
              <Link
                href="/registro/empresa"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#093e39] shadow-sm transition hover:bg-gray-100"
              >
                <span>Registrar empresa</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/30 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Acceso a panel de empresa
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
