import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { RecuperarContrasenaForm } from "./form";
import { Aviso } from "@/components/ui/aviso";

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
    <AuthShell volverHref="/auth/login">
          <div>
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
            <Aviso tono="danger" className="mb-1">
              El enlace venció o ya fue usado. Pedí uno nuevo.
            </Aviso>
          )}

          <RecuperarContrasenaForm />
          </div>
    </AuthShell>
  );
}
