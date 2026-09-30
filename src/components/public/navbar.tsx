"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, LogIn, UserPlus } from "lucide-react";
import { RegisterModal } from "@/components/auth/register-modal";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", `#${id}`);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[#d8ddd7] bg-[#f8f8f4]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Brand Logo & Name */}
          <Link
            href="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
            aria-label="Portal de Empleo Funes - Inicio"
          >
          
          <Image
            src="/images/logo-funes-color.png"
            alt="Logo Municipalidad de Funes"
            width={92}
            height={26}
            className="object-contain"
            priority
          />

          </Link>

          {/* Desktop Navigation Links con scroll suave */}
          <nav className="hidden items-center gap-6 md:flex">
            <a
              href="#ofertas"
              onClick={(e) => handleScrollTo(e, "ofertas")}
              className="text-sm font-medium text-[#4f5a54] transition-colors hover:text-[#0f5b53]"
            >
              Ofertas laborales
            </a>
            <a
              href="#como-funciona"
              onClick={(e) => handleScrollTo(e, "como-funciona")}
              className="text-sm font-medium text-[#4f5a54] transition-colors hover:text-[#0f5b53]"
            >
              ¿Cómo funciona?
            </a>
            <a
              href="#empresas"
              onClick={(e) => handleScrollTo(e, "empresas")}
              className="text-sm font-medium text-[#4f5a54] transition-colors hover:text-[#0f5b53]"
            >
              Para empresas
            </a>
          </nav>

          {/* Desktop Actions: Login & Registro */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/auth/login"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#d8ddd7] bg-white px-3.5 text-sm font-medium text-[#1b2926] transition hover:border-[#0f5b53] hover:text-[#0f5b53] focus:outline-none focus:ring-2 focus:ring-[#0f5b53]/30"
            >
              <LogIn className="h-4 w-4" />
              <span>Iniciar sesión</span>
            </Link>
            <button
              onClick={() => setRegisterModalOpen(true)}
              type="button"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#0f5b53] px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#093e39] focus:outline-none focus:ring-2 focus:ring-[#0f5b53]/40"
            >
              <UserPlus className="h-4 w-4" />
              <span>Registrarse</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#d8ddd7] bg-white text-[#1b2926] transition md:hidden hover:bg-[#eef3ef]"
            aria-expanded={mobileMenuOpen}
            aria-label="Abrir menú de navegación"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile dropdown menu con scroll suave */}
        {mobileMenuOpen && (
          <div className="border-b border-[#d8ddd7] bg-[#f8f8f4] px-4 pt-3 pb-6 md:hidden">
            <nav className="flex flex-col gap-2.5">
              <a
                href="#ofertas"
                onClick={(e) => handleScrollTo(e, "ofertas")}
                className="rounded-lg px-3 py-2 text-base font-medium text-[#1b2926] hover:bg-[#e4ece5]"
              >
                Ofertas laborales
              </a>
              <a
                href="#como-funciona"
                onClick={(e) => handleScrollTo(e, "como-funciona")}
                className="rounded-lg px-3 py-2 text-base font-medium text-[#1b2926] hover:bg-[#e4ece5]"
              >
                ¿Cómo funciona?
              </a>
              <a
                href="#empresas"
                onClick={(e) => handleScrollTo(e, "empresas")}
                className="rounded-lg px-3 py-2 text-base font-medium text-[#1b2926] hover:bg-[#e4ece5]"
              >
                Para empresas
              </a>

              <div className="mt-3 flex flex-col gap-2.5 border-t border-[#d8ddd7] pt-4">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#d8ddd7] bg-white font-medium text-[#1b2926]"
                >
                  <LogIn className="h-4 w-4" />
                  Iniciar sesión
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setRegisterModalOpen(true);
                  }}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0f5b53] font-semibold text-white"
                >
                  <UserPlus className="h-4 w-4" />
                  Registrarse
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Registration Type Choice Modal */}
      {registerModalOpen && (
        <RegisterModal onClose={() => setRegisterModalOpen(false)} />
      )}
    </>
  );
}
