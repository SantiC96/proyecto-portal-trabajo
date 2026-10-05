"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Menu, X, LogIn, UserPlus, LogOut } from "lucide-react";
import { RegisterModal } from "@/components/auth/register-modal";
import { Avatar } from "@/components/ui/avatar";
import { logout } from "@/app/auth/actions";

type NavbarSession = {
  nombre: string;
  apellido: string;
  rol?: string | null;
  avatarUrl?: string | null;
  profileHref: string;
};

interface NavbarProps {
  session?: NavbarSession | null;
}

function getRolLabel(rol?: string | null): string {
  if (rol === "empresa") return "Empresa";
  if (rol === "municipalidad") return "Oficina de empleo";
  return "Postulante";
}

type NavLink = { label: string; href: string; anchor?: string };

const NAV_LINKS: NavLink[] = [
  { label: "Inicio", href: "/" },
  { label: "Ofertas laborales", href: "/ofertas" },
  { label: "¿Cómo funciona?", href: "/#como-funciona", anchor: "como-funciona" },
  { label: "Para empresas", href: "/#empresas", anchor: "empresas" },
];

export function Navbar({ session = null }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    // On each navigation, check if the server-rendered session matches the browser's.
    // A mismatch means the layout is stale (e.g. inactivity signOut mid-navigation).
    supabase.auth.getSession().then(({ data: { session: clientSession } }) => {
      if (cancelled) return;
      const clientHasSession = clientSession !== null;
      const serverHasSession = session !== null;
      if (clientHasSession !== serverHasSession) {
        router.refresh();
      }
    });

    // Also refresh when auth state changes in another tab (e.g. sign-out from another window)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, clientSession) => {
      const clientHasSession = clientSession !== null;
      const serverHasSession = session !== null;
      if (clientHasSession !== serverHasSession) {
        router.refresh();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [pathname, session, router]);

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    if (href === "/ofertas") return pathname.startsWith("/ofertas");
    return false;
  }

  function handleAnchorClick(
    e: React.MouseEvent<HTMLAnchorElement>,
    anchor: string,
  ) {
    setMobileMenuOpen(false);
    if (pathname === "/") {
      e.preventDefault();
      const element = document.getElementById(anchor);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.pushState(null, "", `#${anchor}`);
      }
    }
    // On other pages, let the browser navigate to /#anchor normally
  }

  const linkBase =
    "text-sm font-medium transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 rounded";
  const linkActive = "text-primary border-b-2 border-primary pb-0.5";
  const linkInactive = "text-muted-foreground-strong";

  const mobileLinkBase =
    "flex h-11 items-center rounded-lg px-3 text-base font-medium transition hover:bg-secondary-hover focus:outline-none focus:ring-2 focus:ring-primary/30";
  const mobileLinkActive = "text-primary font-semibold border-l-2 border-primary pl-2.5";
  const mobileLinkInactive = "text-foreground";

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">

          {/* Brand */}
          <div className="flex items-center gap-6">
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
            <nav className="hidden items-center gap-5 lg:flex">
              {NAV_LINKS.map((link) =>
                link.anchor ? (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => handleAnchorClick(e, link.anchor!)}
                    className={`${linkBase} ${linkInactive}`}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`${linkBase} ${isActive(link.href) ? linkActive : linkInactive}`}
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </nav>
          </div>

          {/* Desktop actions */}
          {!session ? (
            <div className="hidden items-center gap-3 lg:flex">
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
            <div className="hidden items-center gap-2 lg:flex">
              <Link
                href={session.profileHref}
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

              <Link
                href={session.profileHref}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-white px-3.5 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                Mi perfil
              </Link>

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
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-foreground transition hover:bg-surface-tinted lg:hidden"
            aria-expanded={mobileMenuOpen}
            aria-label="Abrir menú de navegación"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="border-b border-border bg-background px-4 pt-3 pb-6 lg:hidden">
            <nav className="flex flex-col gap-1">
              {/* Nav links */}
              {NAV_LINKS.map((link) =>
                link.anchor ? (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => handleAnchorClick(e, link.anchor!)}
                    className={`${mobileLinkBase} ${mobileLinkInactive}`}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`${mobileLinkBase} ${isActive(link.href) ? mobileLinkActive : mobileLinkInactive}`}
                  >
                    {link.label}
                  </Link>
                ),
              )}

              <div className="my-1 h-px bg-border" />

              {/* User block or auth buttons */}
              {session ? (
                <>
                  <Link
                    href={session.profileHref}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-surface-tinted focus:outline-none focus:ring-2 focus:ring-primary/30"
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

                  <Link
                    href={session.profileHref}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`${mobileLinkBase} ${mobileLinkInactive}`}
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
                </>
              ) : (
                <div className="mt-2 flex flex-col gap-2.5">
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

      {!session && registerModalOpen && (
        <RegisterModal onClose={() => setRegisterModalOpen(false)} />
      )}
    </>
  );
}
