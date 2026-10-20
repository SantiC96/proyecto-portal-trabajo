"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, CheckCircle, ExternalLink, FileText } from "lucide-react";
import { postularme } from "@/app/(dashboard)/postulaciones/actions";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BotonesDialogo, CLASE_ACCION_DIALOGO } from "@/components/ui/dialogo-confirmacion";
import type { Enum, Tabla } from "@/types/db";
import { formatFecha } from "@/lib/fechas";
import type { CvVista } from "@/lib/cvs";
import { cn } from "@/lib/utils";

const ESTADO_LABEL: Record<Enum<"estado_postulacion">, string> = {
  recibida: "Recibida",
  en_revision: "En revisión",
  derivada: "Enviada a la empresa",
  rechazada_municipalidad: "No seleccionada",
  oferta_retirada: "Cerrada",
  retirada_postulante: "Retirada",
};

export type Postulacion = Pick<Tabla<"postulaciones">, "id" | "estado" | "created_at">;

type Variant = "sin-sesion" | "puede-postularse" | "sin-cv" | "ya-postulado" | "otro-rol";

interface Props {
  variant: Variant;
  ofertaId: string;
  ofertaTitulo: string;
  ofertaEmpresa: string;
  loginHref: string;
  /** CVs disponibles, del más nuevo al más viejo (solo para "puede-postularse"). */
  cvs?: CvVista[];
  postulacion?: Postulacion;
  autoOpen?: boolean;
}

export function PostularseCta({
  variant,
  ofertaId,
  ofertaTitulo,
  ofertaEmpresa,
  loginHref,
  cvs = [],
  postulacion,
  autoOpen = false,
}: Props) {
  const router = useRouter();
  // Initialize open from autoOpen so the overlay shows immediately on first render
  // without needing a setState call inside an effect
  const [open, setOpen] = useState(autoOpen);
  const { pendiente: isPending, ejecutar } = useAccion();
  // El más reciente, salvo que el postulante elija otro.
  const [cvElegidoId, setCvElegidoId] = useState<string | null>(null);
  const cvElegido = cvs.find((cv) => cv.id === cvElegidoId) ?? cvs[0] ?? null;

  // Clean the ?accion=postular param from the URL after the auto-open
  useEffect(() => {
    if (autoOpen) {
      const url = new URL(window.location.href);
      url.searchParams.delete("accion");
      router.replace(url.pathname + (url.search || ""), { scroll: false });
    }
  }, [autoOpen, router]);

  // Mientras se envía la postulación el diálogo no se cierra.
  function cambiarAbierto(abierto: boolean) {
    if (!isPending) setOpen(abierto);
  }

  function handleConfirm() {
    if (!cvElegido) return;
    const cvId = cvElegido.id;
    ejecutar(async () => {
      const result = await postularme(ofertaId, cvId);
      mostrarAviso(result);
      if (result.ok) {
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
    const fecha = formatFecha(postulacion.created_at);
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

        <Dialog open={open} onOpenChange={cambiarAbierto}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Necesitás cargar tu CV</DialogTitle>
              <DialogDescription>
                Para postularte a{" "}
                <span className="font-medium text-foreground">{ofertaTitulo}</span> necesitás
                tener tu CV cargado en tu perfil.
              </DialogDescription>
            </DialogHeader>
            <BotonesDialogo pendiente={false} onCancelar={() => setOpen(false)}>
              <Link
                href="/perfil"
                onClick={() => setOpen(false)}
                className={CLASE_ACCION_DIALOGO.primario}
              >
                Ir a mi perfil
              </Link>
            </BotonesDialogo>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // --- puede postularse ---
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

      <Dialog open={open} onOpenChange={cambiarAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Postularte a {ofertaTitulo}</DialogTitle>
            <DialogDescription>
              Te postulás en <span className="font-medium text-foreground">{ofertaEmpresa}</span>.
              {cvs.length > 1
                ? " La Oficina de Empleo va a revisar tu postulación junto con el CV que elijas."
                : " La Oficina de Empleo va a revisar tu postulación junto con este CV."}
            </DialogDescription>
          </DialogHeader>

          {cvs.length === 1 && cvElegido ? (
            <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-tinted px-4 py-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <DatosCv cv={cvElegido} />
            </div>
          ) : (
            <fieldset disabled={isPending} className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium text-foreground">
                ¿Con qué CV te postulás?
              </legend>
              {cvs.map((cv) => {
                const elegido = cv.id === cvElegido?.id;
                return (
                  <label
                    key={cv.id}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition",
                      elegido
                        ? "border-primary bg-surface-tinted"
                        : "border-border bg-surface hover:bg-surface-tinted",
                    )}
                  >
                    <input
                      type="radio"
                      name="cv-postulacion"
                      value={cv.id}
                      checked={elegido}
                      onChange={() => setCvElegidoId(cv.id)}
                      className="mt-1 h-4 w-4 shrink-0 accent-primary"
                    />
                    <DatosCv cv={cv} />
                  </label>
                );
              })}
            </fieldset>
          )}

          <BotonesDialogo
            pendiente={isPending}
            onCancelar={() => cambiarAbierto(false)}
            onConfirmar={handleConfirm}
            textoConfirmar="Confirmar postulación"
            textoPendiente="Enviando…"
            deshabilitado={!cvElegido}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function DatosCv({ cv }: { cv: CvVista }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="break-all text-sm font-medium text-foreground">{cv.nombreOriginal}</p>
      <p className="text-xs text-muted-foreground">Subido el {formatFecha(cv.subidoEn)}</p>
      {cv.url && (
        <a
          href={cv.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline sm:min-h-0"
        >
          Ver CV
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
