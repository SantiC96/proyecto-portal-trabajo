"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, UserCheck } from "lucide-react";
import { logout } from "@/app/auth/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { useMounted } from "@/lib/use-mounted";
import type { Rol } from "@/types/db";

const ROL_LABEL: Record<string, string> = {
  postulante: "Postulante",
  empresa: "Empresa",
  municipalidad: "Oficina de Empleo",
};

function listarRoles(roles: Rol[]): string {
  const labels = roles.map((r) => ROL_LABEL[r]);
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} o ${labels[labels.length - 1]}`;
}

interface Props {
  nombre: string;
  rol: Rol | null;
  redirectTo: string;
  /** "otro-rol": la sesión es de un rol distinto al de la página pedida. */
  accion: "registro" | "login" | "otro-rol";
  /** Solo con "otro-rol": roles de la página pedida. */
  rolesDestino?: Rol[];
  profileHref?: string;
  onClose: () => void;
}

export function SesionActivaModal({
  nombre,
  rol,
  redirectTo,
  accion,
  rolesDestino = [],
  profileHref,
  onClose,
}: Props) {
  const mounted = useMounted();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const rolLabel = (rol && ROL_LABEL[rol]) ?? "Postulante";
  const otroRol = accion === "otro-rol";
  const destinoLabel = listarRoles(rolesDestino);

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
          ref={otroRol ? cancelRef : undefined}
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
            {otroRol ? "Este enlace es para otra cuenta" : "Ya tenés una sesión iniciada"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {otroRol
              ? `${destinoLabel ? `El enlace que abriste es para una cuenta de ${destinoLabel}.` : "El enlace que abriste es para otro tipo de cuenta."} Iniciaste sesión como ${nombre} con una cuenta de ${rolLabel}.`
              : accion === "login"
                ? `Estás conectado como ${nombre} (${rolLabel}). Si querés entrar con otra cuenta, primero tenés que cerrar la sesión actual.`
                : `Estás conectado como ${nombre} (${rolLabel}). Para crear una cuenta nueva, primero tenés que cerrar la sesión actual.`}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <form action={logout}>
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <SubmitButton pendingText="Cerrando sesión…">
              {otroRol
                ? "Cerrar sesión e ingresar con otra cuenta"
                : accion === "login"
                  ? "Cerrar sesión y entrar con otra cuenta"
                  : "Cerrar sesión y registrarme"}
            </SubmitButton>
          </form>

          {accion !== "registro" && profileHref && (
            <a
              href={profileHref}
              className="flex h-11 w-full items-center justify-center rounded-xl border border-border bg-white text-sm font-medium text-foreground transition hover:bg-surface-tinted"
            >
              {otroRol ? "Ir a mi panel" : "Ir a mi perfil"}
            </a>
          )}

          {!otroRol && (
            <button
              ref={cancelRef}
              type="button"
              onClick={onClose}
              className="flex h-11 w-full items-center justify-center rounded-xl border border-border bg-white text-sm font-medium text-foreground transition hover:bg-surface-tinted"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
