import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { AlertCircle } from "lucide-react";
import { PublicFooter } from "@/components/public/public-footer";
import { INVITACION_COOKIE } from "@/lib/session-config";
import { NuevaContrasenaForm } from "../nueva-contrasena/form";

export const metadata: Metadata = {
  title: "Activá tu cuenta | Portal de Empleo Funes",
};

// Link del email de invitación de la oficina:
// /auth/aceptar-invitacion?token_hash=…&type=invite. Igual que en la
// recuperación de contraseña, el token no se consume al abrir la página sino
// al enviar el formulario (aceptarInvitacion).
export default async function AceptarInvitacionPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const { token_hash, type } = await searchParams;
  const tokenHash = type === "invite" ? (token_hash ?? "") : "";
  const hayReintento = !!(await cookies()).get(INVITACION_COOKIE);

  return (
    <>
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        {tokenHash || hayReintento ? (
          <NuevaContrasenaForm tokenHash={tokenHash} variante="invitacion" />
        ) : (
          <div className="w-full max-w-md rounded-2xl border border-border bg-white px-5 py-8 text-center shadow-sm sm:px-8 sm:py-10">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircle className="h-7 w-7" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              El link de invitación no es válido
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Puede haber vencido o ya haberse usado. Si ya elegiste tu contraseña,
              iniciá sesión. Si no, pedí una invitación nueva a la Oficina de Empleo.
            </p>
            <Link href="/auth/login" className="btn-primario mt-6 min-h-11 justify-center px-6">
              Ir a iniciar sesión
            </Link>
          </div>
        )}
      </main>
      <PublicFooter />
    </>
  );
}
