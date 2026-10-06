"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Briefcase, CheckCircle, FileText, AlertCircle } from "lucide-react";
import { useMounted } from "@/lib/use-mounted";
import { postularme } from "@/app/(dashboard)/postulaciones/actions";

const ESTADO_LABEL: Record<string, string> = {
  recibida: "Recibida",
  en_revision: "En revisión",
  derivada: "Enviada a la empresa",
  rechazada_municipalidad: "No seleccionada",
};

type Postulacion = {
  id: string;
  estado: string;
  created_at: string;
};

type Variant = "sin-sesion" | "puede-postularse" | "sin-cv" | "ya-postulado" | "otro-rol";

interface Props {
  variant: Variant;
  ofertaId: string;
  ofertaTitulo: string;
  ofertaEmpresa: string;
  loginHref: string;
  cvNombre?: string;
  postulacion?: Postulacion;
  autoOpen?: boolean;
}

export function PostularseCta({
  variant,
  ofertaId,
  ofertaTitulo,
  ofertaEmpresa,
  loginHref,
  cvNombre,
  postulacion,
  autoOpen = false,
}: Props) {
  const mounted = useMounted();
  const router = useRouter();
  // Initialize open from autoOpen so the overlay shows immediately on first render
  // without needing a setState call inside an effect
  const [open, setOpen] = useState(autoOpen);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Clean the ?accion=postular param from the URL after the auto-open
  useEffect(() => {
    if (autoOpen) {
      const url = new URL(window.location.href);
      url.searchParams.delete("accion");
      router.replace(url.pathname + (url.search || ""), { scroll: false });
    }
  }, [autoOpen, router]);

  // Focus confirm button when overlay opens
  useEffect(() => {
    if (open) {
      setTimeout(() => confirmRef.current?.focus(), 50);
    }
  }, [open]);

  // Escape closes overlay
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setError(null);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await postularme(ofertaId);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  const buttonBase =
    "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-primary-hover disabled:opacity-60";

  // --- sin sesión ---
  if (variant === "sin-sesion") {
    return (
      <Link href={loginHref} className={buttonBase}>
        <Briefcase className="h-4 w-4" />
        Postularme
      </Link>
    );
  }

  // --- otro rol ---
  if (variant === "otro-rol") {
    return (
      <p className="text-xs text-muted-foreground italic">
        Las postulaciones son exclusivas para postulantes registrados.
      </p>
    );
  }

  // --- ya postulado ---
  if (variant === "ya-postulado" && postulacion) {
    const fecha = new Date(postulacion.created_at).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return (
      <div className="flex flex-col gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-800">
            Ya te postulaste el {fecha}
          </span>
        </div>
        <div className="flex items-center gap-2 pl-6">
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            {ESTADO_LABEL[postulacion.estado] ?? postulacion.estado}
          </span>
          <Link
            href="/mis-postulaciones"
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            Ver mis postulaciones
          </Link>
        </div>
      </div>
    );
  }

  // --- sin CV ---
  if (variant === "sin-cv") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={buttonBase}
        >
          <Briefcase className="h-4 w-4" />
          Postularme
        </button>

        {mounted &&
          open &&
          createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="sin-cv-titulo"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
              onClick={(e) => {
                if (e.target === e.currentTarget) setOpen(false);
              }}
            >
              <div className="relative w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="absolute top-4 right-4 rounded-full p-1.5 text-muted-foreground transition hover:bg-gray-100 hover:text-foreground"
                  aria-label="Cerrar ventana"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="mb-5 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h3 id="sin-cv-titulo" className="text-xl font-bold text-foreground">
                    Necesitás cargar tu CV
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Para postularte a <span className="font-medium text-foreground">{ofertaTitulo}</span> necesitás tener tu CV cargado en tu perfil.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <Link
                    href="/perfil"
                    className="flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white shadow-xs transition hover:bg-primary-hover"
                    onClick={() => setOpen(false)}
                  >
                    Ir a mi perfil
                  </Link>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex h-11 w-full items-center justify-center rounded-xl border border-border bg-white text-sm font-medium text-foreground transition hover:bg-muted"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}
      </>
    );
  }

  // --- puede postularse ---
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className={buttonBase}
      >
        <Briefcase className="h-4 w-4" />
        Postularme
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="postularse-titulo"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isPending) {
                setOpen(false);
                setError(null);
              }
            }}
          >
            <div className="relative w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl">
              <button
                type="button"
                onClick={() => {
                  if (!isPending) {
                    setOpen(false);
                    setError(null);
                  }
                }}
                disabled={isPending}
                className="absolute top-4 right-4 rounded-full p-1.5 text-muted-foreground transition hover:bg-gray-100 hover:text-foreground disabled:opacity-40"
                aria-label="Cerrar ventana"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Briefcase className="h-6 w-6" />
                </div>
                <h3 id="postularse-titulo" className="text-xl font-bold text-foreground">
                  Postularte a {ofertaTitulo}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Te postulás en <span className="font-medium text-foreground">{ofertaEmpresa}</span>. La Oficina de Empleo va a revisar tu postulación junto con tu CV:{" "}
                  <span className="font-medium text-foreground">{cvNombre}</span>.
                </p>
              </div>

              {error && (
                <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  ref={confirmRef}
                  type="button"
                  onClick={handleConfirm}
                  disabled={isPending}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white shadow-xs transition hover:bg-primary-hover disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Enviando…
                    </>
                  ) : (
                    "Confirmar postulación"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isPending) {
                      setOpen(false);
                      setError(null);
                    }
                  }}
                  disabled={isPending}
                  className="flex h-11 w-full items-center justify-center rounded-xl border border-border bg-white text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-40"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
