"use client";

import { useEffect, type ComponentType, type SVGProps } from "react";
import { Building2, ChevronRight, User, X } from "lucide-react";
import { AuthLink } from "@/components/auth/auth-link";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

interface RegisterModalProps {
  onClose: () => void;
}

/** Diálogo "Registrarme": elegir entre la cuenta de postulante y la de empresa. */
export function RegisterModal({ onClose }: RegisterModalProps) {
  // AppShell lo desmonta al cerrar: el foco vuelve a donde estaba.
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    return () => {
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []);

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[calc(100%-1.5rem)] sm:max-w-[480px]"
      >
        <DialogClose
          aria-label="Cerrar"
          className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-[var(--radius-md)] text-muted-foreground outline-none transition-colors hover:bg-surface-tinted hover:text-heading focus-visible:shadow-[var(--sombra-foco)] sm:top-4 sm:right-4"
        >
          <X className="size-5" aria-hidden="true" />
        </DialogClose>

        <div className="pr-10">
          <DialogTitle className="text-xl leading-tight font-extrabold text-heading">
            Crear una cuenta
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-[15px] text-muted-foreground">
            Elegí cómo vas a usar el Portal de Empleo.
          </DialogDescription>
        </div>

        <div className="flex flex-col gap-3">
          <OpcionCuenta
            href="/auth/registro"
            onClick={onClose}
            Icono={User}
            titulo="Busco trabajo"
            descripcion="Creá tu perfil y postulate a ofertas de empresas de Funes."
          />
          <OpcionCuenta
            href="/auth/registro?tipo=empresa"
            onClick={onClose}
            Icono={Building2}
            titulo="Quiero publicar ofertas"
            descripcion="Registrá tu empresa y recibí candidatos preseleccionados por la Oficina de Empleo."
          />
        </div>

        <p className="text-center text-[15px] text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <AuthLink
            href="/auth/login"
            onClick={onClose}
            className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] font-bold text-primary outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]"
          >
            Iniciá sesión
          </AuthLink>
        </p>
      </DialogContent>
    </Dialog>
  );
}

function OpcionCuenta({
  href,
  onClick,
  Icono,
  titulo,
  descripcion,
}: {
  href: string;
  onClick: () => void;
  Icono: ComponentType<SVGProps<SVGSVGElement>>;
  titulo: string;
  descripcion: string;
}) {
  return (
    <AuthLink
      href={href}
      onClick={onClick}
      className="flex min-h-[88px] items-center gap-4 rounded-2xl border-[1.5px] border-border bg-surface p-5 text-left outline-none transition-colors hover:border-primary hover:bg-background focus-visible:border-primary focus-visible:shadow-[var(--sombra-foco)]"
    >
      <span
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"
      >
        <Icono className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] leading-snug font-extrabold text-heading">{titulo}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{descripcion}</span>
      </span>
      <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-icon" />
    </AuthLink>
  );
}
