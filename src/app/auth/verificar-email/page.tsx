import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { NavbarSimple } from "@/components/public/navbar-simple";
import { PublicFooter } from "@/components/public/public-footer";

export const metadata: Metadata = {
  title: "Verificá tu correo | Portal de Empleo Funes",
  description: "Revisá tu correo electrónico para confirmar tu cuenta.",
};

export default function VerificarEmailPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8f8f4] text-[#1b2926]">
      <NavbarSimple />

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-2xl border border-[#d8ddd7] bg-white px-8 py-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#0f5b53]/10 text-[#0f5b53]">
            <Mail className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1b2926]">
            Revisá tu correo
          </h1>
          <p className="mt-3 text-sm text-[#6e7772]">
            Te enviamos un correo de confirmación. Hacé clic en el enlace para
            activar tu cuenta y empezar a buscar empleo.
          </p>
          <p className="mt-6 text-xs text-[#9ca3a0]">
            ¿Ya confirmaste?{" "}
            <Link
              href="/auth/login"
              className="font-semibold text-[#0f5b53] hover:underline"
            >
              Iniciá sesión
            </Link>
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
