"use client";

import { useId, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, PanelLeftClose, PanelLeftOpen, UserPlus } from "lucide-react";
import { MenuUsuario } from "@/components/layout/menu-usuario";
import {
  seccionActual,
  seccionesDeRol,
  textoConContador,
  type SeccionRol,
} from "@/components/layout/secciones-rol";
import { alternarSidebar, useSidebarColapsada } from "@/components/layout/use-sidebar-colapsada";
import type { PendientesOficina } from "@/lib/admin/pendientes";
import type { SesionData } from "@/lib/sesion";
import { cn } from "@/lib/utils";

type Bloque = { grupo?: string; separador: boolean; secciones: SeccionRol[] };

/** Agrupa las secciones seguidas que comparten grupo (o separador). */
function enBloques(secciones: SeccionRol[]): Bloque[] {
  const bloques: Bloque[] = [];
  for (const s of secciones) {
    const ultimo = bloques[bloques.length - 1];
    if (ultimo && ultimo.grupo === s.grupo && !s.separadorAntes) {
      ultimo.secciones.push(s);
    } else {
      bloques.push({ grupo: s.grupo, separador: !!s.separadorAntes, secciones: [s] });
    }
  }
  return bloques;
}

type Tooltip = { texto: string; top: number; left: number };

/**
 * Contenido de la navegación lateral: logo, secciones del rol y pie con el
 * usuario (o Ingresar/Registrarme). Se usa en dos lugares:
 * - "escritorio": la sidebar fija desde lg, que se puede contraer a 72 px.
 * - "panel": el panel que se abre desde la barra del celular (siempre completo).
 *
 * Contraída, cada ícono muestra su nombre en un tooltip al pasar el mouse o
 * con el foco del teclado. El tooltip es fijo (position: fixed) porque la
 * lista tiene scroll y lo recortaría.
 */
export function Sidebar({
  modo,
  sesion,
  pendientes,
  campana,
  botonCerrar,
  onNavegar,
  onRegistrarme,
}: {
  modo: "escritorio" | "panel";
  sesion: SesionData | null;
  pendientes: PendientesOficina | null;
  /** Campanita del pie (solo escritorio; en el celular va en la barra). */
  campana?: ReactNode;
  /** X para cerrar el panel del celular. */
  botonCerrar?: ReactNode;
  onNavegar?: () => void;
  onRegistrarme: () => void;
}) {
  const pathname = usePathname();
  const colapsada = useSidebarColapsada() && modo === "escritorio";
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const idBase = useId();

  const secciones = seccionesDeRol(sesion?.rol, !!sesion);
  const actual = seccionActual(secciones, pathname);

  function mostrarTooltip(objetivo: EventTarget, soloTeclado: boolean) {
    if (!colapsada || !(objetivo instanceof Element)) return;
    const el = objetivo.closest<HTMLElement>("[data-tooltip]");
    // Dentro de los menús abiertos (usuario, campanita) no hay tooltip.
    if (!el || objetivo.closest('[role="menu"], [role="dialog"]')) {
      setTooltip(null);
      return;
    }
    if (soloTeclado && !objetivo.matches(":focus-visible")) return;
    const r = el.getBoundingClientRect();
    setTooltip({ texto: el.dataset.tooltip ?? "", top: r.top + r.height / 2, left: r.right + 10 });
  }

  return (
    <div
      className="sidebar"
      data-modo={modo}
      onMouseOver={(e) => mostrarTooltip(e.target, false)}
      onMouseLeave={() => setTooltip(null)}
      onFocus={(e) => mostrarTooltip(e.target, true)}
      onBlur={() => setTooltip(null)}
    >
      <div className="sidebar-cabecera">
        <Link
          href="/"
          onClick={onNavegar}
          aria-label="Portal de Empleo de la Municipalidad de Funes: ir al inicio"
          className="sidebar-marca"
        >
          <Image
            src="/images/logo-funes-blanco.png"
            alt=""
            width={170}
            height={48}
            loading="eager"
            className="sidebar-logo"
          />
          <span className="sidebar-trebol" aria-hidden="true">
            <Image src="/images/trebol.png" alt="" width={34} height={34} loading="eager" />
          </span>
          <span className="sidebar-subtitulo">Portal de empleo</span>
        </Link>
        {botonCerrar}
      </div>

      <nav
        aria-label="Navegación principal"
        className="sidebar-nav"
        onScroll={() => setTooltip(null)}
      >
        {enBloques(secciones).map((bloque, i) => {
          const idTitulo = `${idBase}-grupo-${i}`;
          return (
            <div
              key={bloque.secciones[0].href}
              role={bloque.grupo ? "group" : undefined}
              aria-labelledby={bloque.grupo ? idTitulo : undefined}
            >
              {bloque.separador && <div role="separator" className="sidebar-separador" />}
              {bloque.grupo && (
                <>
                  <p id={idTitulo} className="sidebar-grupo">
                    {bloque.grupo}
                  </p>
                  <div aria-hidden="true" className="sidebar-grupo-linea" />
                </>
              )}
              <ul className="sidebar-lista">
                {bloque.secciones.map((s) => (
                  <li key={s.href}>
                    <LinkSeccion
                      seccion={s}
                      activa={s.href === actual}
                      cantidad={s.contador ? pendientes?.[s.contador] : undefined}
                      onNavegar={onNavegar}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-pie">
        {sesion ? (
          <div className="sidebar-usuario">
            <MenuUsuario sesion={sesion} />
            {campana && (
              <div className="shrink-0" data-tooltip="Notificaciones">
                {campana}
              </div>
            )}
          </div>
        ) : (
          <div className="sidebar-visitante">
            <Link
              href="/auth/login"
              onClick={onNavegar}
              aria-label="Ingresar"
              data-tooltip="Ingresar"
              className="sidebar-boton sidebar-boton--claro"
            >
              <LogIn aria-hidden="true" />
              <span className="sidebar-texto">Ingresar</span>
            </Link>
            <button
              type="button"
              onClick={onRegistrarme}
              aria-label="Registrarme"
              data-tooltip="Registrarme"
              className="sidebar-boton sidebar-boton--borde"
            >
              <UserPlus aria-hidden="true" />
              <span className="sidebar-texto">Registrarme</span>
            </button>
          </div>
        )}

        {modo === "escritorio" && (
          <button
            type="button"
            onClick={() => {
              setTooltip(null);
              alternarSidebar();
            }}
            aria-label={colapsada ? "Expandir menú" : "Contraer menú"}
            data-tooltip="Expandir menú"
            className="sidebar-contraer"
          >
            <PanelLeftClose aria-hidden="true" className="solo-expandida" />
            <PanelLeftOpen aria-hidden="true" className="solo-colapsada" />
            <span className="sidebar-texto">Contraer menú</span>
          </button>
        )}
      </div>

      {tooltip && (
        <div
          aria-hidden="true"
          className="sidebar-tooltip"
          style={{ top: tooltip.top, left: tooltip.left }}
        >
          {tooltip.texto}
        </div>
      )}
    </div>
  );
}

function LinkSeccion({
  seccion: { label, href, Icono, variante },
  activa,
  cantidad,
  onNavegar,
}: {
  seccion: SeccionRol;
  activa: boolean;
  cantidad: number | undefined;
  onNavegar?: () => void;
}) {
  const nombre = textoConContador(label, cantidad);
  return (
    <Link
      href={href}
      onClick={onNavegar}
      aria-current={activa ? "page" : undefined}
      aria-label={nombre}
      data-tooltip={nombre}
      className={cn(
        "sidebar-link",
        variante === "destacada" && "sidebar-link--destacada",
        activa && "sidebar-link--activa",
      )}
    >
      <Icono aria-hidden="true" className="sidebar-icono" />
      <span className="sidebar-texto sidebar-link-texto">{label}</span>
      {cantidad ? (
        <span aria-hidden="true" className="sidebar-contador">
          {cantidad > 99 ? "99+" : cantidad}
        </span>
      ) : null}
    </Link>
  );
}
