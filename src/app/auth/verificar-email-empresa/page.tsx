import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { AvisoSpam } from "@/components/auth/aviso-spam";
import { PantallaAuth } from "@/components/auth/pantalla-auth";

export const metadata: Metadata = {
  title: "Verificá tu correo | Portal de Empleo Funes",
};

const PASOS = [
  {
    titulo: "Confirmá tu correo electrónico",
    texto: "Hacé clic en el enlace que te enviamos para verificar tu dirección de email.",
  },
  {
    titulo: "Esperá la aprobación de la Oficina de Empleo",
    texto:
      "Una vez confirmado el email, nuestro equipo revisará tu solicitud. Te avisaremos cuando esté lista.",
  },
];

export default function VerificarEmailEmpresaPage() {
  return (
    <PantallaAuth
      panel={{
        volanta: "Empresas de Funes",
        titulo: "Confirmá tu email y esperá la aprobación.",
        bajada: "La Oficina de Empleo revisa cada empresa antes de que pueda publicar ofertas.",
      }}
      titulo="Revisá tu correo"
      icono={<Mail aria-hidden="true" />}
      bajada="Tu solicitud fue enviada. Seguí estos dos pasos para activar tu cuenta:"
    >
      <ol className="flex flex-col gap-4">
        {PASOS.map((paso, i) => (
          <li key={paso.titulo} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground"
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-[15px] leading-snug font-bold text-heading">{paso.titulo}</p>
              <p className="mt-1 text-sm text-muted-foreground">{paso.texto}</p>
            </div>
          </li>
        ))}
      </ol>

      <AvisoSpam />

      <p className="text-sm text-muted-foreground">
        ¿Ya confirmaste?{" "}
        <Link href="/auth/login" className="login-link">
          Iniciá sesión acá
        </Link>
      </p>
    </PantallaAuth>
  );
}
