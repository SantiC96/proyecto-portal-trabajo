import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { PublicFooter } from "@/components/public/public-footer";
import { RecuperarContrasenaForm } from "./form";
import { BotonVolver } from "@/components/ui/boton-volver";
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
    <>
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">
          <BotonVolver href="/auth/login" className="mb-3">
            Volver al inicio de sesión
          </BotonVolver>
          <div className="rounded-2xl border border-border bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10">
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
        </div>
      </main>

      <PublicFooter />
    </>
  );
}
