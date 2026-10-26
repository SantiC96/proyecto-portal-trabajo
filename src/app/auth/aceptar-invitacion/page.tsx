import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { AlertCircle } from "lucide-react";
import { PantallaAuth } from "@/components/auth/pantalla-auth";
import { INVITACION_COOKIE } from "@/lib/session-config";
import { NuevaContrasenaForm } from "../nueva-contrasena/form";

export const metadata: Metadata = {
  title: "Activá tu cuenta | Portal de Empleo Funes",
};

const PANEL = {
  volanta: "Oficina de Empleo",
  titulo: "Sumate al equipo de la Oficina.",
  bajada: "Elegí tu contraseña para entrar al panel de la Oficina de Empleo.",
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

  if (tokenHash || hayReintento) {
    return (
      <PantallaAuth panel={PANEL}>
        <NuevaContrasenaForm tokenHash={tokenHash} variante="invitacion" />
      </PantallaAuth>
    );
  }

  return (
    <PantallaAuth
      panel={PANEL}
      titulo="El link de invitación no es válido"
      icono={<AlertCircle aria-hidden="true" />}
      tonoIcono="peligro"
      bajada="Puede haber vencido o ya haberse usado. Si ya elegiste tu contraseña, iniciá sesión. Si no, pedí una invitación nueva a la Oficina de Empleo."
    >
      <Link href="/auth/login" className="btn-primario login-enviar">
        Ir a iniciar sesión
      </Link>
    </PantallaAuth>
  );
}
