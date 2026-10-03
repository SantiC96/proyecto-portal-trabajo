import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { PublicFooter } from "@/components/public/public-footer";

export const metadata: Metadata = {
  title: "Verificá tu correo | Portal de Empleo Funes",
};

export default function VerificarEmailEmpresaPage() {
  return (
    <>
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-white px-8 py-10 shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-7 w-7" />
          </div>
          <h1 className="text-center text-2xl font-bold tracking-tight text-foreground">
            Revisá tu correo
          </h1>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Tu solicitud fue enviada. Seguí estos dos pasos para activar tu
            cuenta:
          </p>

          <ol className="mt-6 flex flex-col gap-4">
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                1
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Confirmá tu correo electrónico
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Hacé clic en el enlace que te enviamos para verificar tu
                  dirección de email.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                2
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Esperá la aprobación de la Oficina de Empleo
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Una vez confirmado el email, nuestro equipo revisará tu
                  solicitud. Te avisaremos cuando esté lista.
                </p>
              </div>
            </li>
          </ol>

          <p className="mt-8 text-center text-xs text-muted-icon">
            ¿Ya confirmaste?{" "}
            <Link
              href="/auth/login"
              className="font-semibold text-primary hover:underline"
            >
              Iniciá sesión acá
            </Link>
          </p>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
