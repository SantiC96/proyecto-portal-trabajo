import type { Metadata } from "next";
import Link from "next/link";
import { Info, Mail } from "lucide-react";
import { AvisoSpam } from "@/components/auth/aviso-spam";
import { PantallaAuth } from "@/components/auth/pantalla-auth";
import { Aviso } from "@/components/ui/aviso";

export const metadata: Metadata = {
  title: "Verificá tu correo | Portal de Empleo Funes",
  description: "Revisá tu correo electrónico para confirmar tu cuenta.",
};

export default async function VerificarEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ comprobante?: string }>;
}) {
  // registrarPostulante: la cuenta se creó pero no se pudo subir el comprobante.
  const { comprobante } = await searchParams;
  const comprobanteSinSubir = comprobante === "pendiente";

  return (
    <PantallaAuth
      panel={{
        volanta: "Ya casi estás",
        titulo: "Confirmá tu email y empezá a postularte.",
        bajada: "Te mandamos un link para activar tu cuenta del Portal de Empleo.",
      }}
      titulo="Revisá tu correo"
      icono={<Mail aria-hidden="true" />}
      bajada="Te enviamos un correo de confirmación. Hacé clic en el enlace para activar tu cuenta y empezar a buscar empleo."
    >
      <AvisoSpam />
      {comprobanteSinSubir && (
        <Aviso tono="warning" icono={Info}>
          Tu cuenta se creó, pero no pudimos subir tu comprobante de domicilio. Podés
          subirlo desde tu perfil, en la sección «Procedencia».
        </Aviso>
      )}
      <div className="rounded-[var(--radius-lg)] border border-border bg-secondary px-4 py-3.5 text-[15px] text-muted-foreground-strong">
        <p className="font-bold text-heading">¿Qué sigue después de confirmar?</p>
        <p className="mt-1">
          Una vez que actives tu cuenta, iniciá sesión y completá tu perfil: agregá tu foto, subí tu CV en PDF y seleccioná los rubros que te interesan. Cuanto más completo esté tu perfil, más fácil te va a resultar postularte a las ofertas disponibles.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        ¿Ya confirmaste?{" "}
        <Link href="/auth/login" className="login-link">
          Iniciá sesión
        </Link>
      </p>
    </PantallaAuth>
  );
}
