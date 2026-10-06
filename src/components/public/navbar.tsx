"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  Menu, X, LogIn, UserPlus, LogOut,
  User, Briefcase, LayoutDashboard, ChevronDown,
} from "lucide-react";
import { RegisterModal } from "@/components/auth/register-modal";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { logout } from "@/app/auth/actions";

type NavbarSession = {
  nombre: string;
  apellido: string;
  rol?: string | null;
  avatarUrl?: string | null;
  ajuste?: { x: number; y: number; zoom: number } | null;
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

type MenuItem = { label: string; href: string; Icon: React.ComponentType<{ className?: string }> };

function getMenuItems(rol?: string | null): MenuItem[] {
  if (rol === "postulante") {
    return [
      { label: "Mi perfil", href: "/perfil", Icon: User },
      { label: "Mis postulaciones", href: "/mis-postulaciones", Icon: Briefcase },
    ];
  }
  if (rol === "empresa") {
    return [{ label: "Mi panel", href: "/empresa", Icon: LayoutDashboard }];
  }
  if (rol === "municipalidad") {
    return [{ label: "Panel de la oficina", href: "/admin", Icon: LayoutDashboard }];
  }
  return [{ label: "Mi perfil", href: "/perfil", Icon: User }];
}

export function Navbar({ session = null }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  // Store the pathname at which the menu was opened; derived menuOpen is false when pathname changes
  const [menuOpenForPath, setMenuOpenForPath] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const menuOpen = menuOpenForPath === pathname;

  function openMenu() {
    setMenuOpenForPath(pathname);
  }
  function closeMenu() {
    setMenuOpenForPath(null);
  }

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

  // Close dropdown on Escape and click outside
  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeMenu();
        return;
      }
      const items = menuItemRefs.current.filter(Boolean) as HTMLAnchorElement[];
      const focused = document.activeElement;
      const idx = items.indexOf(focused as HTMLAnchorElement);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        items[(idx + 1) % items.length]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        items[(idx - 1 + items.length) % items.length]?.focus();
      }
    }

    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [menuOpen]);

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

  const menuItems = getMenuItems(session?.rol);

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
              {/* Avatar dropdown trigger */}
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => (menuOpen ? closeMenu() : openMenu())}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-surface-tinted focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <AvatarAjustado
                    src={session.avatarUrl}
                    alt={`Foto de ${session.nombre} ${session.apellido}`.trim()}
                    ajuste={session.ajuste ?? undefined}
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
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-border bg-white shadow-md z-50 py-1"
                  >
                    {menuItems.map((item, i) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        ref={(el) => { menuItemRefs.current[i] = el; }}
                        onClick={closeMenu}
                        className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-foreground rounded-lg mx-1 hover:bg-surface-tinted hover:text-primary focus:outline-none focus:bg-surface-tinted focus:text-primary"
                      >
                        <item.Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="mx-1 h-6 w-px bg-border" />

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
                    <AvatarAjustado
                      src={session.avatarUrl}
                      alt={`Foto de ${session.nombre} ${session.apellido}`.trim()}
                      ajuste={session.ajuste ?? undefined}
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

                  {session.rol === "postulante" && (
                    <Link
                      href="/mis-postulaciones"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`${mobileLinkBase} ${mobileLinkInactive}`}
                    >
                      Mis postulaciones
                    </Link>
                  )}

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
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white font-medium text-foreground transition hover:border-primary hover:text-primary"
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
