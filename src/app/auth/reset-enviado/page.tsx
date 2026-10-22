import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Email enviado | Portal de Empleo Funes",
  description: "Revisá tu correo para restablecer tu contraseña.",
};

export default function ResetEnviadoPage() {
  return (
    <AuthShell>
        <div className="text-center">
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
    </AuthShell>
  );
}
