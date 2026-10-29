"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { obtenerPendientesNavegacion } from "@/app/admin/actions";
import { RegisterModal } from "@/components/auth/register-modal";
import { Footer } from "@/components/layout/footer";
import { NavegacionMovil } from "@/components/layout/navegacion-movil";
import { RegistroNavegacion } from "@/components/layout/registro-navegacion";
import { Sidebar } from "@/components/layout/sidebar";
import { CampanaNotificaciones } from "@/components/notificaciones/campana-notificaciones";
import type { PendientesOficina } from "@/lib/admin/pendientes";
import type { SesionData } from "@/lib/sesion";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAccion } from "@/lib/use-accion";
import { cn } from "@/lib/utils";

/** Login, registro, recuperación de contraseña, verificación e invitación. */
export function esRutaSinNavegacion(pathname: string): boolean {
  return pathname === "/auth" || pathname.startsWith("/auth/");
}

const CONSULTA_ESCRITORIO = "(min-width: 1024px)";

function suscribirEscritorio(avisar: () => void) {
  const consulta = window.matchMedia(CONSULTA_ESCRITORIO);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}

/** null en el servidor y durante la hidratación. */
function useEsEscritorio(): boolean | null {
  return useSyncExternalStore(
    suscribirEscritorio,
    () => window.matchMedia(CONSULTA_ESCRITORIO).matches,
    () => null,
  );
}

/**
 * Estructura de todas las páginas. El layout raíz no se vuelve a renderizar
 * al navegar del lado del cliente, así que qué rutas llevan navegación se
 * decide acá, con usePathname, y no leyendo encabezados en el servidor.
 *
 * - /auth/*: solo el contenido.
 * - El resto: sidebar a la izquierda (desde lg) o barra con panel (celular),
 *   y el contenido a todo el ancho restante.
 */
export function AppShell({
  sesion,
  children,
}: {
  sesion: SesionData | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const conNavegacion = !esRutaSinNavegacion(pathname);
  const esOficina = sesion?.rol === "municipalidad";
  const esEscritorio = useEsEscritorio();
  const [registroAbierto, setRegistroAbierto] = useState(false);
  const [pendientes, setPendientes] = useState<PendientesOficina | null>(null);
  const { ejecutar } = useAccion();

  // Cualquier pantalla puede pedir el diálogo de registro con este evento.
  useEffect(() => {
    const abrir = () => setRegistroAbierto(true);
    window.addEventListener("portal:open-register-modal", abrir);
    return () => window.removeEventListener("portal:open-register-modal", abrir);
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    // On each navigation, check if the server-rendered session matches the browser's.
    // A mismatch means the layout is stale (e.g. inactivity signOut mid-navigation).
    supabase.auth.getSession().then(({ data: { session: clientSession } }) => {
      if (cancelled) return;
      const clientHasSession = clientSession !== null;
      const serverHasSession = sesion !== null;
      if (clientHasSession !== serverHasSession) {
        router.refresh();
      }
    });

    // Also refresh when auth state changes in another tab (e.g. sign-out from another window)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, clientSession) => {
      const clientHasSession = clientSession !== null;
      const serverHasSession = sesion !== null;
      if (clientHasSession !== serverHasSession) {
        router.refresh();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [pathname, sesion, router]);

  // Contadores de la oficina: como la campanita, se piden al montar y en cada
  // cambio de ruta. useAccion descarta el pedido si el anterior sigue en curso.
  useEffect(() => {
    if (!esOficina || !conNavegacion) return;
    ejecutar(async () => {
      try {
        const res = await obtenerPendientesNavegacion();
        setPendientes(res.ok && res.data ? res.data : null);
      } catch {
        // Sin contadores: el error ya quedó registrado en el servidor si fue de la base.
        setPendientes(null);
      }
    });
  }, [pathname, esOficina, conNavegacion, ejecutar]);

  const modalRegistro = !sesion && registroAbierto && (
    <RegisterModal onClose={() => setRegistroAbierto(false)} />
  );

  // También en /auth: BotonVolver necesita saber si lo anterior era de ahí.
  const registroNavegacion = (
    <Suspense fallback={null}>
      <RegistroNavegacion />
    </Suspense>
  );

  if (!conNavegacion) {
    return (
      <>
        {children}
        {modalRegistro}
        {registroNavegacion}
      </>
    );
  }

  const pendientesVisibles = esOficina ? pendientes : null;
  const abrirRegistro = () => setRegistroAbierto(true);
  // Una sola campanita montada (cada una pide sus datos): la de la sidebar en
  // escritorio o la de la barra en el celular. Hasta saberlo, un hueco del
  // mismo tamaño.
  const campana = (dondeVa: "sidebar" | "barra") => {
    if (!sesion?.notificacionesHref) return null;
    const visible = dondeVa === "sidebar" ? esEscritorio === true : esEscritorio === false;
    return visible ? (
      <CampanaNotificaciones rutaListado={sesion.notificacionesHref} variante={dondeVa} />
    ) : (
      <span aria-hidden="true" className="block h-11 w-11" />
    );
  };

  return (
    <div className="app-shell">
      <div className="sidebar-escritorio">
        <Sidebar
          modo="escritorio"
          sesion={sesion}
          pendientes={pendientesVisibles}
          campana={campana("sidebar")}
          onRegistrarme={abrirRegistro}
        />
      </div>

      <NavegacionMovil
        sesion={sesion}
        pendientes={pendientesVisibles}
        campana={campana("barra")}
        esEscritorio={esEscritorio}
        onRegistrarme={abrirRegistro}
      />

      {/* El inicio no lleva el fondo decorado: su decoración es el hero. */}
      <div className={cn("app-contenido", pathname === "/" && "app-contenido--inicio")}>
        <div className="app-pagina">{children}</div>
        <Footer sesion={sesion} onRegistrarme={abrirRegistro} />
      </div>
      {modalRegistro}
      {registroNavegacion}
    </div>
  );
}
