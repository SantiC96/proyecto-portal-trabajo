import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { PublicFooter } from "@/components/public/public-footer";

export const metadata: Metadata = {
  title: "Email enviado | Portal de Empleo Funes",
  description: "Revisá tu correo para restablecer tu contraseña.",
};

export default function ResetEnviadoPage() {
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
            Si existe una cuenta con ese email, te enviamos un enlace para
            crear una nueva contraseña. El enlace expira en 24 horas.
          </p>
          <p className="mt-6 text-xs text-muted-icon">
            ¿Ya cambiaste tu contraseña?{" "}
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
