"use client";

import { X, UserPlus, User, Building2 } from "lucide-react";
import { AuthLink } from "@/components/auth/auth-link";

interface RegisterModalProps {
  onClose: () => void;
}

export function RegisterModal({ onClose }: RegisterModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-dialog-title"
      onClick={(e) => {
        // Cierra al hacer clic en el fondo oscuro
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
            <UserPlus className="h-6 w-6" />
          </div>
          <h3 id="register-dialog-title" className="text-xl font-bold text-foreground">
            Crear una cuenta
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Seleccioná el tipo de registro que corresponde a tu perfil:
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <AuthLink
            href="/auth/registro"
            onClick={onClose}
            className="group flex items-start gap-4 rounded-xl border border-border p-4 text-left transition hover:border-primary hover:bg-surface-tinted"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground group-hover:text-primary">
                Soy Postulante (Persona física)
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Buscás empleo en Funes, querés cargar tu CV y postularte a ofertas laborales del portal.
              </p>
            </div>
          </AuthLink>

          <AuthLink
            href="/auth/registro?tipo=empresa"
            onClick={onClose}
            className="group flex items-start gap-4 rounded-xl border border-border p-4 text-left transition hover:border-primary hover:bg-surface-tinted"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground group-hover:text-primary">
                Soy Empresa (Persona jurídica)
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Tenés un comercio o empresa en Funes o la región y querés publicar vacantes y recibir preselecciones de candidatos.
              </p>
            </div>
          </AuthLink>
        </div>

        <div className="mt-5 border-t border-border pt-4 text-center">
          <p className="text-xs text-muted-foreground">
            ¿Ya tenés una cuenta?{" "}
            <AuthLink
              href="/auth/login"
              onClick={onClose}
              className="font-semibold text-primary hover:underline"
            >
              Iniciá sesión acá
            </AuthLink>
          </p>
        </div>
      </div>
    </div>
  );
}
