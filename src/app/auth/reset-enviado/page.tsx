import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { AvisoSpam } from "@/components/auth/aviso-spam";
import { PantallaRecuperacion } from "@/components/auth/pantalla-recuperacion";

export const metadata: Metadata = {
  title: "Email enviado | Portal de Empleo Funes",
  description: "Revisá tu correo para restablecer tu contraseña.",
};

export default function ResetEnviadoPage() {
  return (
    <PantallaRecuperacion
      titulo="Revisá tu email"
      icono={<Mail aria-hidden="true" />}
      bajada="Si existe una cuenta con ese email, te enviamos un enlace para crear una nueva contraseña. El enlace expira en 1 hora."
    >
      <AvisoSpam />
      <p className="text-sm text-muted-foreground">
        ¿Ya cambiaste tu contraseña?{" "}
        <Link href="/auth/login" className="login-link">
          Iniciá sesión
        </Link>
      </p>
    </PantallaRecuperacion>
  );
}
