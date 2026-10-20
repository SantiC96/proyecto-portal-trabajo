"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, CheckCircle } from "lucide-react";
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
  const router = useRouter();
  // Initialize open from autoOpen so the overlay shows immediately on first render
  // without needing a setState call inside an effect
  const [open, setOpen] = useState(autoOpen);
  const { pendiente: isPending, ejecutar } = useAccion();

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
    ejecutar(async () => {
      const result = await postularme(ofertaId);
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
              La Oficina de Empleo va a revisar tu postulación junto con tu CV:{" "}
              <span className="font-medium text-foreground">{cvNombre}</span>.
            </DialogDescription>
          </DialogHeader>
          <BotonesDialogo
            pendiente={isPending}
            onCancelar={() => cambiarAbierto(false)}
            onConfirmar={handleConfirm}
            textoConfirmar="Confirmar postulación"
            textoPendiente="Enviando…"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
