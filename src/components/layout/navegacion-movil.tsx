"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import type { PendientesOficina } from "@/lib/admin/pendientes";
import type { SesionData } from "@/lib/sesion";

const FOCOABLES = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Celular y tablet (menos de 1024 px): barra fija arriba y la sidebar completa
 * como panel desde la izquierda. El panel se cierra con la X, tocando el
 * fondo, con Escape o al elegir una sección; mientras está abierto bloquea el
 * scroll de la página y retiene el foco, y al cerrarse lo devuelve al botón
 * de menú.
 */
export function NavegacionMovil({
  sesion,
  pendientes,
  campana,
  esEscritorio,
  onRegistrarme,
}: {
  sesion: SesionData | null;
  pendientes: PendientesOficina | null;
  campana?: ReactNode;
  esEscritorio: boolean | null;
  onRegistrarme: () => void;
}) {
  const pathname = usePathname();
  // Ruta en la que se abrió: al navegar, el panel se cierra solo. Si la
  // pantalla pasa a escritorio, también.
  const [abiertoEn, setAbiertoEn] = useState<string | null>(null);
  const abierto = abiertoEn === pathname && esEscritorio !== true;
  const botonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const idPanel = useId();

  const cerrar = useCallback(() => setAbiertoEn(null), []);

  useEffect(() => {
    if (!abierto) return;
    const boton = botonRef.current;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("[data-foco-inicial]")?.focus();
    return () => {
      document.body.style.overflow = overflowAnterior;
      boton?.focus();
    };
  }, [abierto]);

  function alTeclear(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      cerrar();
      return;
    }
    if (e.key !== "Tab") return;
    const focoables = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCOABLES) ?? []);
    if (focoables.length === 0) return;
    const primero = focoables[0];
    const ultimo = focoables[focoables.length - 1];
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  }

  return (
    <>
      <header className="barra-movil">
        <button
          ref={botonRef}
          type="button"
          onClick={() => setAbiertoEn(pathname)}
          aria-label="Abrir menú"
          aria-expanded={abierto}
          aria-controls={abierto ? idPanel : undefined}
          className="barra-movil-boton"
        >
          <Menu aria-hidden="true" className="h-6 w-6" />
        </button>

        <Link href="/" className="barra-movil-marca">
          <span className="barra-movil-trebol" aria-hidden="true">
            <Image src="/images/trebol.png" alt="" width={28} height={28} loading="eager" />
          </span>
          Portal de Empleo
        </Link>

        <div className="ml-auto flex items-center">
          {sesion ? (
            campana
          ) : (
            <Link href="/auth/login" className="barra-movil-ingresar">
              Ingresar
            </Link>
          )}
        </div>
      </header>

      {abierto && (
        <div className="panel-movil">
          <div className="panel-movil-fondo" aria-hidden="true" onClick={cerrar} />
          <div
            ref={panelRef}
            id={idPanel}
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            onKeyDown={alTeclear}
            className="panel-movil-contenido"
          >
            <Sidebar
              modo="panel"
              sesion={sesion}
              pendientes={pendientes}
              onNavegar={cerrar}
              onRegistrarme={() => {
                cerrar();
                onRegistrarme();
              }}
              botonCerrar={
                <button
                  type="button"
                  onClick={cerrar}
                  aria-label="Cerrar menú"
                  data-foco-inicial
                  className="panel-movil-cerrar"
                >
                  <X aria-hidden="true" className="h-6 w-6" />
                </button>
              }
            />
          </div>
        </div>
      )}
    </>
  );
}
