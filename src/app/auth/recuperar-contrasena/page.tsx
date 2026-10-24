import type { Metadata } from "next";
import { PantallaRecuperacion } from "@/components/auth/pantalla-recuperacion";
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
    <PantallaRecuperacion
      titulo="Recuperar contraseña"
      bajada="Ingresá tu email y te enviamos un enlace para crear una nueva contraseña."
    >
      {linkVencido && (
        <Aviso tono="danger">El enlace venció o ya fue usado. Pedí uno nuevo.</Aviso>
      )}

      <RecuperarContrasenaForm />
    </PantallaRecuperacion>
  );
}
