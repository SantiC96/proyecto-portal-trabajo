"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, AlertCircle, Briefcase, CheckCircle, AlertTriangle } from "lucide-react";
import { useMounted } from "@/lib/use-mounted";
import { retirarPostulacion } from "@/app/(dashboard)/postulaciones/actions";
import { formatFecha } from "@/lib/fechas";
import { getOfertaEstadoBadge } from "@/lib/oferta-estados";

type EstadoPostulacion = "recibida" | "en_revision" | "derivada" | "rechazada_municipalidad";

type Postulacion = {
  id: string;
  estado: EstadoPostulacion;
  created_at: string;
  oferta: {
    id: string;
    titulo: string;
    empresa_nombre: string;
    estado: string;
    contenido_editado_en: string | null;
  } | null;
};

function getBadgeEstado(estado: EstadoPostulacion) {
  switch (estado) {
    case "recibida":
      return { label: "Recibida", className: "bg-gray-100 text-gray-700" };
    case "en_revision":
      return { label: "En revisión", className: "bg-amber-100 text-amber-800" };
    case "derivada":
      return { label: "Enviada a la empresa", className: "bg-blue-100 text-blue-800" };
    case "rechazada_municipalidad":
      return { label: "No seleccionada", className: "bg-red-100 text-red-700" };
  }
}

function RetirarBoton({
  postulacionId,
  onSuccess,
}: {
  postulacionId: string;
  onSuccess: () => void;
}) {
  const mounted = useMounted();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => confirmRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) {
        setOpen(false);
        setError(null);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, isPending]);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await retirarPostulacion(postulacionId);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
        onSuccess();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="mt-2 text-xs font-medium text-red-600 underline-offset-2 hover:underline"
      >
        Retirar postulación
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="retirar-titulo"
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
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <Briefcase className="h-6 w-6" />
                </div>
                <h3 id="retirar-titulo" className="text-xl font-bold text-foreground">
                  ¿Retirar postulación?
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tu postulación se va a eliminar y la Oficina de Empleo ya no la va a ver. Si cambiás de opinión, podés volver a postularte mientras la oferta siga publicada.
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
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-red-700 disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Retirando…
                    </>
                  ) : (
                    "Sí, retirar"
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
                  className="flex h-11 w-full items-center justify-center rounded-xl border border-border bg-white text-sm font-medium text-foreground transition hover:bg-surface-tinted disabled:opacity-40"
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

interface Props {
  postulaciones: Postulacion[];
}

export function MisPostulacionesLista({ postulaciones }: Props) {
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (!toastVisible) return;
    const timer = setTimeout(() => setToastVisible(false), 4000);
    return () => clearTimeout(timer);
  }, [toastVisible]);

  return (
    <div className="flex flex-col gap-4">
      {toastVisible && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          Retiraste tu postulación.
        </div>
      )}

      {postulaciones.map((p) => {
        const badge = getBadgeEstado(p.estado);
        const oferta = p.oferta;
        const ofertaActiva = oferta?.estado === "activa";
        const ofertaBadge = getOfertaEstadoBadge(oferta?.estado);
        const fecha = formatFecha(p.created_at);

        // Indicador: la oferta fue editada DESPUÉS de que el postulante se postuló.
        const modificada =
          oferta?.contenido_editado_en != null &&
          oferta.contenido_editado_en > p.created_at;

        return (
          <article
            key={p.id}
            className="rounded-xl border border-border bg-white p-4 shadow-xs sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {oferta ? (
                  ofertaActiva ? (
                    <Link
                      href={`/ofertas/${oferta.id}`}
                      className="text-base font-semibold text-foreground underline-offset-2 hover:text-primary hover:underline"
                    >
                      {oferta.titulo}
                    </Link>
                  ) : (
                    <span className="text-base font-semibold text-muted-foreground-strong">
                      {oferta.titulo}
                    </span>
                  )
                ) : (
                  <span className="text-base font-semibold text-muted-foreground-strong">
                    Oferta no disponible
                  </span>
                )}
                {oferta && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{oferta.empresa_nombre}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {ofertaBadge && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ofertaBadge.className}`}
                  >
                    {ofertaBadge.label}
                  </span>
                )}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
            </div>

            {ofertaBadge?.descripcion && (
              <p className="mt-2 text-xs text-amber-700">{ofertaBadge.descripcion}</p>
            )}

            <p className="mt-2 text-xs text-muted-foreground">Postulado el {fecha}</p>

            {modificada && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span>
                  Modificada después de tu postulación
                  {" "}({formatFecha(oferta!.contenido_editado_en!)})
                  {ofertaActiva && (
                    <>
                      {" — "}
                      <Link
                        href={`/ofertas/${oferta!.id}`}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Ver oferta actualizada
                      </Link>
                    </>
                  )}
                </span>
              </div>
            )}

            {p.estado === "recibida" && (
              <RetirarBoton
                postulacionId={p.id}
                onSuccess={() => setToastVisible(true)}
              />
            )}
          </article>
        );
      })}

      {/* Estado legend */}
      <section className="mt-2 rounded-xl border border-border bg-surface-tinted p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          ¿Qué significa cada estado?
        </p>
        <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground-strong">
          <li>
            <span className="font-medium text-gray-700">Recibida</span>
            {" — "}Tu postulación llegó y está esperando revisión por la Oficina de Empleo.
          </li>
          <li>
            <span className="font-medium text-amber-700">En revisión</span>
            {" — "}La Oficina de Empleo está evaluando tu perfil para esta oferta.
          </li>
          <li>
            <span className="font-medium text-blue-700">Enviada a la empresa</span>
            {" — "}La Oficina de Empleo derivó tu postulación a la empresa.
          </li>
          <li>
            <span className="font-medium text-red-700">No seleccionada</span>
            {" — "}La Oficina de Empleo no seleccionó tu perfil para esta búsqueda.
          </li>
        </ul>
      </section>
    </div>
  );
}
