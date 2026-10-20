"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { logout } from "@/app/auth/actions";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { BotonFormulario } from "@/components/ui/boton-formulario";
import { seccionActual, seccionesDeRol } from "@/components/layout/secciones-rol";
import { cn } from "@/lib/utils";
import type { Rol } from "@/types/db";

export type SesionMenu = {
  nombre: string;
  apellido: string;
  rol?: Rol | null;
  avatarUrl?: string | null;
  ajuste?: { x: number; y: number; zoom: number } | null;
  cursosPendientes?: number;
};

export function etiquetaRol(rol?: Rol | null): string {
  if (rol === "empresa") return "Empresa";
  if (rol === "municipalidad") return "Oficina de empleo";
  return "Postulante";
}

const CLASE_ITEM =
  "mx-1 flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition hover:bg-surface-tinted hover:text-primary focus-visible:bg-surface-tinted focus-visible:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

/**
 * Botón con la foto, el nombre y el rol que despliega el menú con todas las
 * secciones del panel del rol y "Cerrar sesión". El mismo componente sirve en
 * escritorio y en el celular (ahí el botón muestra solo la foto). Teclado:
 * flechas y Inicio/Fin recorren el menú, Escape lo cierra y devuelve el foco
 * al botón, Tab lo cierra.
 */
export function MenuUsuario({ sesion }: { sesion: SesionMenu }) {
  const pathname = usePathname();
  const idMenu = useId();
  // Ruta en la que se abrió: al navegar, el menú se cierra solo.
  const [abiertoEn, setAbiertoEn] = useState<string | null>(null);
  const abierto = abiertoEn === pathname;
  const contenedorRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Al abrir con el teclado, el foco pasa al primer ítem.
  const enfocarAlAbrir = useRef(false);

  const secciones = seccionesDeRol(sesion.rol);
  const actual = seccionActual(secciones, pathname);
  const cursosPendientes = sesion.rol === "postulante" ? sesion.cursosPendientes ?? 0 : 0;
  const nombreCompleto = `${sesion.nombre} ${sesion.apellido}`.trim();
  const rol = etiquetaRol(sesion.rol);


  function cerrar(devolverFoco = false) {
    setAbiertoEn(null);
    if (devolverFoco) botonRef.current?.focus();
  }

  useEffect(() => {
    if (!abierto) return;
    if (enfocarAlAbrir.current) {
      enfocarAlAbrir.current = false;
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    }

    function alClic(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbiertoEn(null);
      }
    }
    document.addEventListener("mousedown", alClic);
    return () => document.removeEventListener("mousedown", alClic);
  }, [abierto]);

  function alTeclearMenu(e: React.KeyboardEvent<HTMLDivElement>) {
    const lista = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    const i = lista.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      cerrar(true);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      lista[(i + 1) % lista.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      lista[(i - 1 + lista.length) % lista.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      lista[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      lista[lista.length - 1]?.focus();
    } else if (e.key === "Tab") {
      cerrar();
    }
  }

  function alTeclearBoton(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      enfocarAlAbrir.current = true;
      setAbiertoEn(pathname);
    } else if (e.key === "Escape" && abierto) {
      cerrar();
    }
  }

  return (
    <div ref={contenedorRef} className="relative">
      <button
        ref={botonRef}
        type="button"
        onClick={() => (abierto ? cerrar() : setAbiertoEn(pathname))}
        onKeyDown={alTeclearBoton}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? idMenu : undefined}
        aria-label={`Menú de ${nombreCompleto} (${rol})`}
        className="flex min-h-11 items-center gap-2.5 rounded-lg px-1.5 transition hover:bg-surface-tinted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 lg:px-2"
      >
        <AvatarAjustado
          src={sesion.avatarUrl}
          alt=""
          ajuste={sesion.ajuste ?? undefined}
          size="sm"
        />
        <span className="hidden text-left leading-tight lg:block">
          <span className="block max-w-44 truncate text-sm font-medium text-foreground">
            {nombreCompleto}
          </span>
          <span className="block text-xs text-muted-foreground">{rol}</span>
        </span>
        {cursosPendientes > 0 && (
          <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
        )}
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
            abierto && "rotate-180",
          )}
        />
      </button>

      {abierto && (
        <div
          ref={menuRef}
          id={idMenu}
          role="menu"
          aria-label={`Secciones de ${rol}`}
          onKeyDown={alTeclearMenu}
          className="fixed inset-x-4 top-16 z-50 mt-1 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-xl border border-border bg-white py-1 shadow-md sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:w-64"
        >
          <div className="border-b border-border px-4 pb-2 pt-1.5 lg:hidden" role="none">
            <p className="truncate text-sm font-semibold text-foreground">{nombreCompleto}</p>
            <p className="text-xs text-muted-foreground">{rol}</p>
          </div>

          <div className="py-1" role="none">
            {secciones.map(({ label, href, Icono }) => {
              const esActual = href === actual;
              const pendientes = href === "/mis-cursos" ? cursosPendientes : 0;
              return (
                <Link
                  key={href}
                  href={href}
                  role="menuitem"
                  aria-current={esActual ? "page" : undefined}
                  onClick={() => cerrar()}
                  className={cn(
                    CLASE_ITEM,
                    esActual ? "bg-secondary font-semibold text-primary" : "text-foreground",
                  )}
                >
                  <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {label}
                  {pendientes > 0 && (
                    <span
                      className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-white"
                      aria-label={`${pendientes} curso${pendientes === 1 ? "" : "s"} pendiente${pendientes === 1 ? "" : "s"}`}
                    >
                      {pendientes}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="border-t border-border pt-1" role="none">
            <form action={logout} role="none">
              <BotonFormulario
                rol="menuitem"
                icono={<LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />}
                textoPendiente="Cerrando sesión…"
                className={cn(CLASE_ITEM, "w-[calc(100%-0.5rem)] text-foreground disabled:opacity-60")}
              >
                Cerrar sesión
              </BotonFormulario>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
