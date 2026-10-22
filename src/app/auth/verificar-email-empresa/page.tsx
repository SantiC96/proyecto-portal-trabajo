import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Verificá tu correo | Portal de Empleo Funes",
};

export default function VerificarEmailEmpresaPage() {
  return (
    <AuthShell>
        <div>
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
    </AuthShell>
  );
}
