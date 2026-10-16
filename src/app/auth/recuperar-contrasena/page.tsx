import type { Metadata } from "next";
import Link from "next/link";
import { Mail, AlertCircle } from "lucide-react";
import { PublicFooter } from "@/components/public/public-footer";
import { RecuperarContrasenaForm } from "./form";

export const metadata: Metadata = {
  title: "Recuperar contraseña | Portal de Empleo Funes",
  description: "Ingresá tu email y te enviamos un enlace para restablecer tu contraseña.",
};

export default async function RecuperarContrasenaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const linkVencido = error === "link-vencido";

  return (
    <>
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-white px-8 py-10 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Recuperar contraseña
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ingresá tu email y te enviamos un enlace para crear una nueva
              contraseña.
            </p>
          </div>

          {linkVencido && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 mb-1">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>El enlace venció o ya fue usado. Pedí uno nuevo.</span>
            </div>
          )}

          <RecuperarContrasenaForm />

          <p className="mt-6 text-center text-xs text-muted-icon">
            <Link
              href="/auth/login"
              className="hover:text-primary hover:underline"
            >
              ← Volver al inicio de sesión
            </Link>
          </p>
        </div>
      </main>

      <PublicFooter />
    </>
  );
}
