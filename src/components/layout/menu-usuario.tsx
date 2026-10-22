"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronUp, LogOut, User } from "lucide-react";
import { logout } from "@/app/auth/actions";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { BotonFormulario } from "@/components/ui/boton-formulario";
import { etiquetaRol, rutaPerfil } from "@/components/layout/secciones-rol";
import { inicialesDeEmpresa, inicialesDePersona } from "@/lib/iniciales";
import type { Rol } from "@/types/db";

export type SesionMenu = {
  nombre: string;
  apellido: string;
  rol?: Rol | null;
  avatarUrl?: string | null;
  ajuste?: { x: number; y: number; zoom: number } | null;
};

/**
 * Bloque del usuario al pie de la sidebar: foto, nombre y rol. Abre hacia
 * arriba un menú con "Mi perfil" y "Cerrar sesión". Teclado: al abrir, el foco
 * pasa al primer ítem; flechas e Inicio/Fin lo recorren; Escape lo cierra y
 * devuelve el foco al botón; Tab lo cierra. Con la sidebar contraída solo se
 * ve la foto (lo resuelve el CSS).
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

  const nombreCompleto = `${sesion.nombre} ${sesion.apellido}`.trim();
  const rol = etiquetaRol(sesion.rol);
  const iniciales =
    sesion.rol === "empresa"
      ? inicialesDeEmpresa(sesion.nombre)
      : inicialesDePersona(sesion.nombre, sesion.apellido);

  function cerrar(devolverFoco = false) {
    setAbiertoEn(null);
    if (devolverFoco) botonRef.current?.focus();
  }

  useEffect(() => {
    if (!abierto) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

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
      // Que no cierre también el panel del celular.
      e.stopPropagation();
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
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      setAbiertoEn(pathname);
    } else if (e.key === "Escape" && abierto) {
      e.stopPropagation();
      cerrar();
    }
  }

  return (
    <div ref={contenedorRef} className="menu-usuario" data-tooltip={nombreCompleto}>
      <button
        ref={botonRef}
        type="button"
        onClick={() => (abierto ? cerrar() : setAbiertoEn(pathname))}
        onKeyDown={alTeclearBoton}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? idMenu : undefined}
        aria-label={`Menú de ${nombreCompleto} (${rol})`}
        className="menu-usuario-boton"
      >
        <AvatarAjustado
          src={sesion.avatarUrl}
          alt=""
          ajuste={sesion.ajuste ?? undefined}
          iniciales={iniciales}
          size="nav"
          className="border-2 border-white"
        />
        <span className="sidebar-texto min-w-0 flex-1 text-left leading-tight">
          <span className="block truncate text-sm font-bold text-white">{nombreCompleto}</span>
          <span className="block truncate text-xs text-sidebar-suave">{rol}</span>
        </span>
        <ChevronUp
          aria-hidden="true"
          className={`sidebar-texto h-4 w-4 shrink-0 text-sidebar-suave transition-transform duration-200 ${abierto ? "" : "rotate-180"}`}
        />
      </button>

      {abierto && (
        <div
          ref={menuRef}
          id={idMenu}
          role="menu"
          aria-label={`Opciones de ${nombreCompleto}`}
          onKeyDown={alTeclearMenu}
          className="menu-usuario-popup"
        >
          <Link
            href={rutaPerfil(sesion.rol)}
            role="menuitem"
            onClick={() => cerrar()}
            className="menu-usuario-item menu-usuario-escalonado"
            style={{ "--i": 0 } as React.CSSProperties}
          >
            <User aria-hidden="true" />
            Mi perfil
          </Link>
          <div role="separator" className="my-1 h-px bg-border" />
          <form
            action={logout}
            role="none"
            className="menu-usuario-escalonado"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            <BotonFormulario
              rol="menuitem"
              icono={<LogOut aria-hidden="true" />}
              textoPendiente="Cerrando sesión…"
              className="menu-usuario-item menu-usuario-item--peligro"
            >
              Cerrar sesión
            </BotonFormulario>
          </form>
        </div>
      )}
    </div>
  );
}
