"use client";

import Link from "next/link";
import { X, UserPlus, User, Building2 } from "lucide-react";

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
      <div className="relative w-full max-w-md rounded-2xl border border-[#d8ddd7] bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1.5 text-[#6e7772] transition hover:bg-gray-100 hover:text-[#1b2926]"
          aria-label="Cerrar ventana"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#0f5b53]/10 text-[#0f5b53]">
            <UserPlus className="h-6 w-6" />
          </div>
          <h3 id="register-dialog-title" className="text-xl font-bold text-[#1b2926]">
            Crear una cuenta
          </h3>
          <p className="mt-1 text-sm text-[#6e7772]">
            Seleccioná el tipo de registro que corresponde a tu perfil:
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/registro/postulante"
            onClick={onClose}
            className="group flex items-start gap-4 rounded-xl border border-[#d8ddd7] p-4 text-left transition hover:border-[#0f5b53] hover:bg-[#f3f7f4]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0f5b53]/10 text-[#0f5b53] transition-colors group-hover:bg-[#0f5b53] group-hover:text-white">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#1b2926] group-hover:text-[#0f5b53]">
                Soy Postulante (Persona física)
              </h4>
              <p className="mt-1 text-xs text-[#6e7772]">
                Buscás empleo en Funes, querés cargar tu CV y postularte a ofertas laborales del portal.
              </p>
            </div>
          </Link>

          <Link
            href="/registro/empresa"
            onClick={onClose}
            className="group flex items-start gap-4 rounded-xl border border-[#d8ddd7] p-4 text-left transition hover:border-[#0f5b53] hover:bg-[#f3f7f4]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0f5b53]/10 text-[#0f5b53] transition-colors group-hover:bg-[#0f5b53] group-hover:text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#1b2926] group-hover:text-[#0f5b53]">
                Soy Empresa (Persona jurídica)
              </h4>
              <p className="mt-1 text-xs text-[#6e7772]">
                Tenés un comercio o empresa en Funes o la región y querés publicar vacantes y recibir preselecciones de candidatos.
              </p>
            </div>
          </Link>
        </div>

        <div className="mt-5 border-t border-[#d8ddd7] pt-4 text-center">
          <p className="text-xs text-[#6e7772]">
            ¿Ya tenés una cuenta?{" "}
            <Link
              href="/login"
              onClick={onClose}
              className="font-semibold text-[#0f5b53] hover:underline"
            >
              Iniciá sesión acá
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
