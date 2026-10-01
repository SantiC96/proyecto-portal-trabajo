"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, LogIn, UserPlus, LogOut } from "lucide-react";
import { RegisterModal } from "@/components/auth/register-modal";
import { Avatar } from "@/components/ui/avatar";
import { logout } from "@/app/auth/actions";

type NavbarSession = {
  nombre: string;
  apellido: string;
  rol?: string | null;
  avatarUrl?: string | null;
};

interface NavbarProps {
  session?: NavbarSession | null;
}

function getRolLabel(rol?: string | null): string {
  if (rol === "empresa") return "Empresa";
  if (rol === "municipalidad") return "Oficina de empleo";
  return "Postulante";
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

          {/* Brand */}
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

          {/* Desktop nav links */}
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
              <>
                <Link
                  href="/"
                  className="text-sm font-medium text-muted-foreground-strong transition-colors hover:text-primary"
                >
                  Inicio
                </Link>
                <Link
                  href="/ofertas"
                  className="text-sm font-medium text-muted-foreground-strong transition-colors hover:text-primary"
                >
                  Ofertas
                </Link>
              </>
            )}
          </nav>

          {/* Desktop actions */}
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
            <div className="hidden items-center gap-2 md:flex">
              {/* Avatar + nombre (link al perfil) */}
              <Link
                href="/perfil"
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-surface-tinted focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <Avatar
                  src={session.avatarUrl}
                  nombre={session.nombre}
                  apellido={session.apellido}
                  size="sm"
                />
                <div className="text-left leading-tight">
                  <p className="text-sm font-medium text-foreground">
                    {session.nombre} {session.apellido}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getRolLabel(session.rol)}
                  </p>
                </div>
              </Link>

              <div className="mx-1 h-6 w-px bg-border" />

              {/* Mi perfil */}
              <Link
                href="/perfil"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-white px-3.5 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                Mi perfil
              </Link>

              {/* Cerrar sesión */}
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

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="border-b border-border bg-background px-4 pt-3 pb-6 md:hidden">
            <nav className="flex flex-col gap-1">
              {session && (
                <>
                  {/* Avatar + nombre/rol — link al perfil */}
                  <Link
                    href="/perfil"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-surface-tinted"
                  >
                    <Avatar
                      src={session.avatarUrl}
                      nombre={session.nombre}
                      apellido={session.apellido}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {session.nombre} {session.apellido}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getRolLabel(session.rol)}
                      </p>
                    </div>
                  </Link>

                  <div className="my-1 h-px bg-border" />

                  <Link
                    href="/perfil"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex h-11 items-center rounded-lg px-3 text-base font-medium text-foreground transition hover:bg-secondary-hover"
                  >
                    Mi perfil
                  </Link>

                  <form action={logout}>
                    <button
                      type="submit"
                      className="flex h-11 w-full items-center gap-2 rounded-lg px-3 text-base font-medium text-foreground transition hover:bg-secondary-hover"
                    >
                      <LogOut className="h-4 w-4" />
                      Cerrar sesión
                    </button>
                  </form>

                  <div className="my-1 h-px bg-border" />
                </>
              )}

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
                <>
                  <Link
                    href="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg px-3 py-2 text-base font-medium text-foreground hover:bg-secondary-hover"
                  >
                    Inicio
                  </Link>
                  <Link
                    href="/ofertas"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg px-3 py-2 text-base font-medium text-foreground hover:bg-secondary-hover"
                  >
                    Ofertas
                  </Link>
                </>
              )}

              {!session && (
                <div className="mt-3 flex flex-col gap-2.5 border-t border-border pt-4">
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
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Registration modal */}
      {!session && registerModalOpen && (
        <RegisterModal onClose={() => setRegisterModalOpen(false)} />
      )}
    </>
  );
}
