"use client";

import { Suspense, useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Bell } from "lucide-react";
import {
  abrirCampanaNotificaciones,
  obtenerNotificacionesRecientes,
} from "@/app/(dashboard)/notificaciones/actions";
import type { Notificacion, ResumenNotificaciones } from "@/lib/notificaciones";
import { BotonFormulario } from "@/components/ui/boton-formulario";
import { Spinner } from "@/components/ui/spinner";
import { useAccion } from "@/lib/use-accion";
import { formatFechaHora, formatFechaRelativa } from "@/lib/fechas";
import { cn } from "@/lib/utils";
import { IconoNotificacion } from "./icono-notificacion";
import { EVENTO_NOTIFICACIONES_CAMBIARON } from "./eventos";
import { FormAbrirNotificacion } from "./form-abrir-notificacion";

const RESUMEN_VACIO: ResumenNotificaciones = { noLeidas: 0, ultimas: [] };

function todasLeidas(r: ResumenNotificaciones): ResumenNotificaciones {
  const ahora = new Date().toISOString();
  return {
    noLeidas: 0,
    ultimas: r.ultimas.map((n) => (n.leida_en ? n : { ...n, leida_en: ahora })),
  };
}

/**
 * Campanita de la navegación para los tres roles: al pie de la sidebar en
 * escritorio y en la barra superior del celular (`variante`). Los layouts no se vuelven a
 * ejecutar al navegar, así que el contador no viene del layout: se pide con
 * una server action al montar, en cada cambio de ruta y cuando el listado
 * avisa que marcó notificaciones como leídas.
 *
 * Al abrirla, el contador pasa a cero y una sola acción trae las últimas y
 * marca todas como leídas. Mientras el panel sigue abierto, las que eran
 * nuevas se ven resaltadas; al cerrarlo quedan como leídas.
 *
 * El panel se cierra al abrir una notificación y en cada cambio de pantalla
 * (también al volver con "Volver" o con Atrás): la campanita vive en el
 * layout y no se desmonta, así que si no se cerrara reaparecería abierta.
 */
export function CampanaNotificaciones({
  rutaListado,
  variante,
}: {
  rutaListado: string;
  /**
   * "sidebar": el panel se abre al costado de la sidebar, pegado abajo.
   * "barra": el panel se abre hacia abajo desde la barra del celular.
   */
  variante: "sidebar" | "barra";
}) {
  const pathname = usePathname();
  const [abierta, setAbierta] = useState(false);
  const abiertaRef = useRef(false);
  const botonRef = useRef<HTMLButtonElement>(null);

  const [resumen, setResumen] = useState<ResumenNotificaciones | null>(null);
  const [cargando, startCarga] = useTransition();
  const { pendiente, ejecutar } = useAccion();
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    abiertaRef.current = abierta;
  }, [abierta]);

  const refrescar = useCallback(() => {
    startCarga(async () => {
      const res = await obtenerNotificacionesRecientes();
      // Con el panel abierto no se pisa lo que se está mostrando.
      if (res.ok && res.data && !abiertaRef.current) setResumen(res.data);
    });
  }, []);

  useEffect(() => {
    refrescar();
  }, [pathname, refrescar]);

  useEffect(() => {
    window.addEventListener(EVENTO_NOTIFICACIONES_CAMBIARON, refrescar);
    return () => window.removeEventListener(EVENTO_NOTIFICACIONES_CAMBIARON, refrescar);
  }, [refrescar]);

  const cerrar = useCallback(() => {
    abiertaRef.current = false;
    setAbierta(false);
    setResumen((r) => r && todasLeidas(r));
  }, []);

  useEffect(() => {
    if (!abierta) return;
    function alTeclear(e: KeyboardEvent) {
      if (e.key === "Escape") {
        cerrar();
        botonRef.current?.focus();
      }
    }
    function alClic(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        cerrar();
      }
    }
    document.addEventListener("keydown", alTeclear);
    document.addEventListener("mousedown", alClic);
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.removeEventListener("mousedown", alClic);
    };
  }, [abierta, cerrar]);

  function alternar() {
    if (abierta) {
      cerrar();
      return;
    }
    abiertaRef.current = true;
    setAbierta(true);
    setResumen((r) => r && { ...r, noLeidas: 0 });
    ejecutar(async () => {
      try {
        const res = await abrirCampanaNotificaciones();
        if (!res.ok || !res.data) return;
        const datos = res.data;
        // Si ya se cerró, lo que llega se guarda como leído.
        setResumen(abiertaRef.current ? { ...datos, noLeidas: 0 } : todasLeidas(datos));
      } catch {
        // Sin aviso: el marcado se reintenta la próxima vez que se abra.
      }
    });
  }

  const { noLeidas, ultimas } = resumen ?? RESUMEN_VACIO;

  return (
    <div ref={contenedorRef} className="relative">
      <Suspense fallback={null}>
        <CerrarAlNavegar alNavegar={cerrar} />
      </Suspense>
      <button
        ref={botonRef}
        type="button"
        onClick={alternar}
        aria-haspopup="dialog"
        aria-expanded={abierta}
        aria-label={
          noLeidas > 0
            ? `Notificaciones: ${noLeidas} sin leer`
            : "Notificaciones"
        }
        className={cn(
          "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-white transition-colors duration-150 hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
          abierta && "bg-white/12",
        )}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {noLeidas > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-primary bg-accent px-1 text-[11px] font-extrabold leading-none text-accent-foreground"
          >
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        )}
      </button>

      {abierta && (
        <div
          role="dialog"
          aria-label="Notificaciones"
          className={cn(
            "z-50 rounded-xl border border-border bg-white text-foreground shadow-[var(--sombra-dialogo)]",
            variante === "sidebar"
              ? "fixed bottom-4 left-[calc(var(--ancho-sidebar)+12px)] w-96"
              : "fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96",
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
            <p className="flex min-h-11 items-center gap-2 text-sm font-semibold text-foreground">
              Notificaciones
              {(cargando || pendiente) && (
                <Spinner className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </p>
          </div>

          {resumen === null ? (
            <div className="flex justify-center px-4 py-8">
              <Spinner className="h-5 w-5 text-muted-foreground" />
            </div>
          ) : ultimas.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No tenés notificaciones.
            </p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
              {ultimas.map((n) => (
                <ItemNotificacion key={n.id} notificacion={n} alAbrir={cerrar} />
              ))}
            </ul>
          )}

          <div className="border-t border-border px-2 py-1">
            <Link
              href={rutaListado}
              className="flex min-h-11 items-center justify-center rounded-lg text-sm font-medium text-primary transition hover:bg-surface-tinted"
            >
              Ver todas las notificaciones
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Avisa cada cambio de pantalla (ruta o query), no el primero. Aparte y en
 * Suspense porque usa useSearchParams.
 */
function CerrarAlNavegar({ alNavegar }: { alNavegar: () => void }) {
  const pantalla = `${usePathname()}?${useSearchParams().toString()}`;
  const anterior = useRef(pantalla);
  useEffect(() => {
    if (anterior.current === pantalla) return;
    anterior.current = pantalla;
    alNavegar();
  }, [pantalla, alNavegar]);
  return null;
}

/** Las que estaban sin leer al abrir el panel se resaltan como nuevas. */
function ItemNotificacion({
  notificacion: n,
  alAbrir,
}: {
  notificacion: Notificacion;
  alAbrir: () => void;
}) {
  const nueva = !n.leida_en;
  return (
    <li className={cn("px-2 py-1", nueva && "bg-secondary/40")}>
      <FormAbrirNotificacion id={n.id} alEnviar={alAbrir}>
        <BotonFormulario className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-surface-tinted disabled:opacity-60">
          <IconoNotificacion tipo={n.tipo} />
          <span className="min-w-0 flex-1">
            <span className="flex items-start gap-2">
              <span className="block flex-1 text-sm font-medium text-foreground">
                {n.titulo}
                {nueva && <span className="sr-only"> (nueva)</span>}
              </span>
              {nueva && (
                <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
              )}
            </span>
            <span className="block break-words text-sm text-muted-foreground-strong">
              {n.mensaje}
            </span>
            <time
              dateTime={n.created_at}
              title={formatFechaHora(n.created_at)}
              className="mt-0.5 block text-xs text-muted-foreground"
            >
              {formatFechaRelativa(n.created_at)}
            </time>
          </span>
        </BotonFormulario>
      </FormAbrirNotificacion>
    </li>
  );
}
