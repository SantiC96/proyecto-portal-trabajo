"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, LogIn, UserPlus, LogOut } from "lucide-react";
import { RegisterModal } from "@/components/auth/register-modal";
import { logout } from "@/app/auth/actions";

type NavbarSession = { nombre: string; apellido: string };

interface NavbarProps {
  session?: NavbarSession | null;
}

export function Navbar({ session = null }: NavbarProps) {
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
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-md">
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

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-6 md:flex">
            {!session ? (
              <>
                <a
                  href="#ofertas"
                  onClick={(e) => handleScrollTo(e, "ofertas")}
                  className="text-sm font-medium text-muted-foreground-strong transition-colors hover:text-primary"
                >
                  Ofertas laborales
                </a>
                <a
                  href="#como-funciona"
                  onClick={(e) => handleScrollTo(e, "como-funciona")}
                  className="text-sm font-medium text-muted-foreground-strong transition-colors hover:text-primary"
                >
                  ¿Cómo funciona?
                </a>
                <a
                  href="#empresas"
                  onClick={(e) => handleScrollTo(e, "empresas")}
                  className="text-sm font-medium text-muted-foreground-strong transition-colors hover:text-primary"
                >
                  Para empresas
                </a>
              </>
            ) : (
              <Link
                href="/inicio"
                className="text-sm font-medium text-muted-foreground-strong transition-colors hover:text-primary"
              >
                Mi panel
              </Link>
            )}
          </nav>

          {/* Desktop Actions */}
          {!session ? (
            <div className="hidden items-center gap-3 md:flex">
              <Link
                href="/auth/login"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3.5 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <LogIn className="h-4 w-4" />
                <span>Iniciar sesión</span>
              </Link>
              <button
                onClick={() => setRegisterModalOpen(true)}
                type="button"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <UserPlus className="h-4 w-4" />
                <span>Registrarse</span>
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-3 md:flex">
              <span className="text-sm font-medium text-foreground">
                {session.nombre} {session.apellido}
              </span>
              <form action={logout}>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3.5 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Cerrar sesión</span>
                </button>
              </form>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-foreground transition md:hidden hover:bg-surface-tinted"
            aria-expanded={mobileMenuOpen}
            aria-label="Abrir menú de navegación"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="border-b border-border bg-background px-4 pt-3 pb-6 md:hidden">
            <nav className="flex flex-col gap-2.5">
              {!session ? (
                <>
                  <a
                    href="#ofertas"
                    onClick={(e) => handleScrollTo(e, "ofertas")}
                    className="rounded-lg px-3 py-2 text-base font-medium text-foreground hover:bg-secondary-hover"
                  >
                    Ofertas laborales
                  </a>
                  <a
                    href="#como-funciona"
                    onClick={(e) => handleScrollTo(e, "como-funciona")}
                    className="rounded-lg px-3 py-2 text-base font-medium text-foreground hover:bg-secondary-hover"
                  >
                    ¿Cómo funciona?
                  </a>
                  <a
                    href="#empresas"
                    onClick={(e) => handleScrollTo(e, "empresas")}
                    className="rounded-lg px-3 py-2 text-base font-medium text-foreground hover:bg-secondary-hover"
                  >
                    Para empresas
                  </a>
                </>
              ) : (
                <Link
                  href="/inicio"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-base font-medium text-foreground hover:bg-secondary-hover"
                >
                  Mi panel
                </Link>
              )}

              <div className="mt-3 flex flex-col gap-2.5 border-t border-border pt-4">
                {!session ? (
                  <>
                    <Link
                      href="/auth/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white font-medium text-foreground"
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
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-white"
                    >
                      <UserPlus className="h-4 w-4" />
                      Registrarse
                    </button>
                  </>
                ) : (
                  <>
                    <p className="px-3 text-sm font-medium text-foreground">
                      {session.nombre} {session.apellido}
                    </p>
                    <form action={logout}>
                      <button
                        type="submit"
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white font-medium text-foreground"
                      >
                        <LogOut className="h-4 w-4" />
                        Cerrar sesión
                      </button>
                    </form>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Registration Type Choice Modal */}
      {!session && registerModalOpen && (
        <RegisterModal onClose={() => setRegisterModalOpen(false)} />
      )}
    </>
  );
}
