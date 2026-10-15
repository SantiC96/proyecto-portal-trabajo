"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import {
  abrirNotificacion,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  obtenerNotificacionesRecientes,
} from "@/app/admin/notificaciones/actions";
import type { Notificacion, ResumenNotificaciones } from "@/lib/notificaciones";
import { BotonFormulario } from "@/components/ui/boton-formulario";
import { Spinner } from "@/components/ui/spinner";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { formatFechaHora } from "@/lib/fechas";
import { cn } from "@/lib/utils";

export function CampanaNotificaciones({ resumen: inicial }: { resumen: ResumenNotificaciones }) {
  const pathname = usePathname();
  // Ruta en la que se abrió: al navegar, el panel se cierra solo.
  const [abiertaEn, setAbiertaEn] = useState<string | null>(null);
  const abierta = abiertaEn === pathname;

  // Los datos llegan del layout raíz; cuando el servidor los revalida se
  // reemplaza el estado local.
  const [resumen, setResumen] = useState(inicial);
  const [inicialPrevio, setInicialPrevio] = useState(inicial);
  if (inicial !== inicialPrevio) {
    setInicialPrevio(inicial);
    setResumen(inicial);
  }

  const [cargando, startCarga] = useTransition();
  const { pendiente, ejecutar } = useAccion();
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierta) return;
    function alTeclear(e: KeyboardEvent) {
      if (e.key === "Escape") setAbiertaEn(null);
    }
    function alClic(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbiertaEn(null);
      }
    }
    document.addEventListener("keydown", alTeclear);
    document.addEventListener("mousedown", alClic);
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.removeEventListener("mousedown", alClic);
    };
  }, [abierta]);

  function alternar() {
    if (abierta) {
      setAbiertaEn(null);
      return;
    }
    setAbiertaEn(pathname);
    startCarga(async () => {
      const res = await obtenerNotificacionesRecientes();
      if (res.ok && res.data) setResumen(res.data);
    });
  }

  function marcarUna(id: string) {
    ejecutar(async () => {
      const res = await marcarNotificacionLeida(id);
      if (!res.ok) {
        mostrarAviso(res);
        return;
      }
      const ahora = new Date().toISOString();
      setResumen((r) => ({
        noLeidas: Math.max(0, r.noLeidas - 1),
        ultimas: r.ultimas.map((n) => (n.id === id ? { ...n, leida_en: ahora } : n)),
      }));
    });
  }

  function marcarTodas() {
    ejecutar(async () => {
      const res = await marcarTodasLeidas();
      mostrarAviso(res);
      if (!res.ok) return;
      const ahora = new Date().toISOString();
      setResumen((r) => ({
        noLeidas: 0,
        ultimas: r.ultimas.map((n) => (n.leida_en ? n : { ...n, leida_en: ahora })),
      }));
    });
  }

  const { noLeidas, ultimas } = resumen;

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={alternar}
        aria-haspopup="dialog"
        aria-expanded={abierta}
        aria-label={
          noLeidas > 0
            ? `Notificaciones: ${noLeidas} sin leer`
            : "Notificaciones"
        }
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-foreground transition hover:bg-surface-tinted focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {noLeidas > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-semibold text-white"
          >
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        )}
      </button>

      {abierta && (
        <div
          role="dialog"
          aria-label="Notificaciones"
          className="fixed inset-x-4 top-16 z-50 mt-1 rounded-xl border border-border bg-white shadow-md sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:w-96"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              Notificaciones
              {cargando && <Spinner className="h-3.5 w-3.5 text-muted-foreground" />}
            </p>
            {noLeidas > 0 && (
              <button
                type="button"
                onClick={marcarTodas}
                disabled={pendiente}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-primary transition hover:bg-surface-tinted disabled:opacity-60"
              >
                {pendiente ? <Spinner className="h-3.5 w-3.5" /> : <CheckCheck className="h-4 w-4" />}
                Marcar todas como leídas
              </button>
            )}
          </div>

          {ultimas.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No tenés notificaciones.
            </p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
              {ultimas.map((n) => (
                <ItemNotificacion
                  key={n.id}
                  notificacion={n}
                  deshabilitado={pendiente}
                  onMarcarLeida={() => marcarUna(n.id)}
                />
              ))}
            </ul>
          )}

          <div className="border-t border-border px-2 py-1">
            <Link
              href="/admin/notificaciones"
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

function ItemNotificacion({
  notificacion: n,
  deshabilitado,
  onMarcarLeida,
}: {
  notificacion: Notificacion;
  deshabilitado: boolean;
  onMarcarLeida: () => void;
}) {
  const noLeida = !n.leida_en;
  return (
    <li className={cn("px-2 py-1", noLeida && "bg-secondary/40")}>
      <form action={abrirNotificacion.bind(null, n.id)}>
        <BotonFormulario className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-surface-tinted disabled:opacity-60">
          <span
            aria-hidden="true"
            className={cn(
              "mt-1.5 h-2 w-2 shrink-0 rounded-full",
              noLeida ? "bg-amber-500" : "bg-transparent",
            )}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-foreground">
              {n.titulo}
              {noLeida && <span className="sr-only"> (sin leer)</span>}
            </span>
            <span className="block break-words text-sm text-muted-foreground-strong">
              {n.mensaje}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {formatFechaHora(n.created_at)}
            </span>
          </span>
        </BotonFormulario>
      </form>
      {noLeida && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onMarcarLeida}
            disabled={deshabilitado}
            className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-medium text-muted-foreground-strong transition hover:bg-surface-tinted hover:text-primary disabled:opacity-60"
          >
            Marcar como leída
          </button>
        </div>
      )}
    </li>
  );
}
