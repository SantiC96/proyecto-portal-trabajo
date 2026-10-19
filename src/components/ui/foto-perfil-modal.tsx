"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UserRound, X, ZoomIn, ZoomOut } from "lucide-react";
import { useMounted } from "@/lib/use-mounted";
import { FotoPrivada } from "@/components/ui/foto-privada";
import { ajustarAvatar } from "@/app/(dashboard)/perfil/actions";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { Spinner } from "@/components/ui/spinner";

interface FotoPerfilModalProps {
  src: string;
  nombre: string;
  ajusteInicial: { x: number; y: number; zoom: number };
  modoInicial?: "ver" | "ajustar";
  onClose: () => void;
  onGuardado: (ajuste: { x: number; y: number; zoom: number }) => void;
}

const DEFAULT_AJUSTE = { x: 50, y: 50, zoom: 1 };
const PREVIEW_SIZE = 280;

export function FotoPerfilModal({
  src,
  nombre,
  ajusteInicial,
  modoInicial = "ver",
  onClose,
  onGuardado,
}: FotoPerfilModalProps) {
  const mounted = useMounted();
  const [modo, setModo] = useState<"ver" | "ajustar">(modoInicial);
  const [ajuste, setAjuste] = useState(ajusteInicial);
  const { pendiente: guardando, ejecutar } = useAccion();

  const previewRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ px: number; py: number; ax: number; ay: number } | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !guardando) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, guardando]);

  const abrirAjuste = () => {
    setAjuste(ajusteInicial);
    setModo("ajustar");
  };

  const cancelarAjuste = () => {
    setAjuste(ajusteInicial);
    setModo("ver");
  };

  const handleGuardar = () => {
    ejecutar(async () => {
      const result = await ajustarAvatar(ajuste);
      mostrarAviso(result);
      if (result.ok) onGuardado(ajuste);
    });
  };

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { px: e.clientX, py: e.clientY, ax: ajuste.x, ay: ajuste.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current || !previewRef.current) return;
    const w = previewRef.current.offsetWidth || PREVIEW_SIZE;
    const h = previewRef.current.offsetHeight || PREVIEW_SIZE;
    const dx = e.clientX - dragStart.current.px;
    const dy = e.clientY - dragStart.current.py;
    // Dragging in one direction shifts the visible area the opposite way
    const newX = Math.min(100, Math.max(0, dragStart.current.ax - (dx / w) * 100));
    const newY = Math.min(100, Math.max(0, dragStart.current.ay - (dy / h) * 100));
    setAjuste((prev) => ({ ...prev, x: newX, y: newY }));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragStart.current = null;
  };

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Foto de perfil"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !guardando) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-white shadow-xl">
        <button
          type="button"
          onClick={onClose}
          disabled={guardando}
          className="absolute top-3 right-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface-tinted hover:text-foreground disabled:opacity-40"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* ── Vista: ver ─────────────────────────────────────────────────── */}
        {modo === "ver" && (
          <div className="flex flex-col items-center gap-5 p-6 pt-10">
            {/* width/height solo reservan espacio: el estilo "auto" mantiene el tamaño natural de la foto */}
            <FotoPrivada
              src={src}
              alt={`Foto de ${nombre}`}
              width={464}
              height={464}
              loading="eager"
              style={{
                width: "auto",
                height: "auto",
                maxHeight: "80vh",
                maxWidth: "90vw",
                objectFit: "contain",
              }}
              className="rounded-xl"
              fallback={
                <div
                  aria-label={`Foto de ${nombre}`}
                  className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground"
                >
                  <UserRound className="h-12 w-12" />
                </div>
              }
            />
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={abrirAjuste}
                className="flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                Ajustar posición
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 items-center gap-2 rounded-lg border border-border bg-white px-5 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* ── Vista: ajustar ─────────────────────────────────────────────── */}
        {modo === "ajustar" && (
          <div className="flex flex-col items-center gap-5 p-6 pt-10">
            <p className="text-base font-semibold text-foreground">Ajustá la posición de tu foto</p>
            <p className="text-xs text-muted-foreground -mt-3 text-center px-4">
              Arrastrá la imagen para centrarla. Usá el control de zoom para acercar o alejar.
            </p>

            {/* Vista previa circular con drag */}
            <div
              ref={previewRef}
              className="cursor-grab active:cursor-grabbing select-none rounded-full overflow-hidden shrink-0"
              style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE, touchAction: "none" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <FotoPrivada
                src={src}
                alt=""
                aria-hidden
                width={PREVIEW_SIZE}
                height={PREVIEW_SIZE}
                loading="eager"
                draggable={false}
                fallback={
                  <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground">
                    <UserRound className="h-24 w-24" />
                  </div>
                }
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: `${ajuste.x}% ${ajuste.y}%`,
                  transform: `scale(${ajuste.zoom})`,
                  transformOrigin: `${ajuste.x}% ${ajuste.y}%`,
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              />
            </div>

            {/* Slider de zoom */}
            <div className="flex w-full max-w-xs items-center gap-3">
              <button
                type="button"
                aria-label="Reducir zoom"
                onClick={() =>
                  setAjuste((a) => ({
                    ...a,
                    zoom: Math.max(1, Math.round((a.zoom - 0.05) * 100) / 100),
                  }))
                }
                className="rounded-lg border border-border p-1.5 text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={ajuste.zoom}
                onChange={(e) =>
                  setAjuste((a) => ({ ...a, zoom: Number(e.target.value) }))
                }
                className="flex-1 accent-primary"
                aria-label="Nivel de zoom"
              />
              <button
                type="button"
                aria-label="Aumentar zoom"
                onClick={() =>
                  setAjuste((a) => ({
                    ...a,
                    zoom: Math.min(3, Math.round((a.zoom + 0.05) * 100) / 100),
                  }))
                }
                className="rounded-lg border border-border p-1.5 text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>


            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => setAjuste(DEFAULT_AJUSTE)}
                className="flex h-10 items-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
              >
                Restablecer
              </button>
              <button
                type="button"
                onClick={handleGuardar}
                disabled={guardando}
                aria-busy={guardando}
                className="flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
              >
                {guardando && <Spinner />}
                {guardando ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={cancelarAjuste}
                disabled={guardando}
                className="flex h-10 items-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
