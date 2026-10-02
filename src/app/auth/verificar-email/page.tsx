import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { PublicFooter } from "@/components/public/public-footer";

export const metadata: Metadata = {
  title: "Verificá tu correo | Portal de Empleo Funes",
  description: "Revisá tu correo electrónico para confirmar tu cuenta.",
};

export default function VerificarEmailPage() {
  return (
    <>
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-white px-8 py-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Revisá tu correo
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Te enviamos un correo de confirmación. Hacé clic en el enlace para
            activar tu cuenta y empezar a buscar empleo.
          </p>
          <div className="mt-4 rounded-lg border border-border bg-secondary px-4 py-3 text-left text-sm text-muted-foreground-strong">
            <p className="font-semibold text-foreground">¿Qué sigue después de confirmar?</p>
            <p className="mt-1">
              Una vez que actives tu cuenta, iniciá sesión y completá tu perfil: agregá tu foto, subí tu CV en PDF y seleccioná los rubros que te interesan. Cuanto más completo esté tu perfil, más fácil te va a resultar postularte a las ofertas disponibles.
            </p>
          </div>
          <p className="mt-6 text-xs text-muted-icon">
            ¿Ya confirmaste?{" "}
            <Link
              href="/auth/login"
              className="font-semibold text-primary hover:underline"
            >
              Iniciá sesión
            </Link>
          </p>
        </div>
      </main>

      <PublicFooter />
    </>
  );
}
