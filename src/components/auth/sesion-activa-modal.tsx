"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, UserCheck } from "lucide-react";
import { logout } from "@/app/auth/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { useMounted } from "@/lib/use-mounted";

const ROL_LABEL: Record<string, string> = {
  empresa: "Empresa",
  municipalidad: "Oficina de Empleo",
};

interface Props {
  nombre: string;
  rol: string | null;
  redirectTo: string;
  accion: "registro" | "login";
  profileHref?: string;
  onClose: () => void;
}

export function SesionActivaModal({ nombre, rol, redirectTo, accion, profileHref, onClose }: Props) {
  const mounted = useMounted();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const rolLabel = (rol && ROL_LABEL[rol]) ?? "Postulante";

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sesion-activa-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1.5 text-muted-foreground transition hover:bg-gray-100 hover:text-foreground"
          aria-label="Cerrar ventana"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserCheck className="h-6 w-6" />
          </div>
          <h3 id="sesion-activa-titulo" className="text-xl font-bold text-foreground">
            Ya tenés una sesión iniciada
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {accion === "login"
              ? `Estás conectado como ${nombre} (${rolLabel}). Si querés entrar con otra cuenta, primero tenés que cerrar la sesión actual.`
              : `Estás conectado como ${nombre} (${rolLabel}). Para crear una cuenta nueva, primero tenés que cerrar la sesión actual.`}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <form action={logout}>
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <SubmitButton pendingText="Cerrando sesión…">
              {accion === "login" ? "Cerrar sesión y entrar con otra cuenta" : "Cerrar sesión y registrarme"}
            </SubmitButton>
          </form>

          {accion === "login" && profileHref && (
            <a
              href={profileHref}
              className="flex h-11 w-full items-center justify-center rounded-xl border border-border bg-white text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Ir a mi perfil
            </a>
          )}

          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            className="flex h-11 w-full items-center justify-center rounded-xl border border-border bg-white text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
