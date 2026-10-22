import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** Link "Volver al inicio" de las pantallas de /auth (también lo usa el login). */
export function LinkVolverAuth({
  href = "/",
  children = "Volver al inicio",
}: {
  href?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link href={href} className="auth-volver">
      <ArrowLeft aria-hidden="true" />
      {children}
    </Link>
  );
}

/**
 * Pantallas de /auth sin navegación (registro, recuperar y nueva contraseña,
 * verificar email, invitación): fondo claro, contenido centrado, link de
 * vuelta y el contenido en una tarjeta con el logo arriba, como la del login.
 */
export function AuthShell({
  children,
  ancho = "normal",
  volver,
}: {
  children: React.ReactNode;
  /** "amplio" (640 px) para el registro, que tiene más campos. */
  ancho?: "normal" | "amplio";
  volver?: { href: string; texto: string };
}) {
  return (
    <main className="auth-fondo">
      <div className={cn("w-full", ancho === "amplio" ? "max-w-[640px]" : "max-w-[460px]")}>
        <LinkVolverAuth href={volver?.href}>{volver?.texto}</LinkVolverAuth>
        <div className="auth-tarjeta">
          <Image
            src="/images/logo-funes-color.png"
            alt="Municipalidad de Funes"
            width={120}
            height={34}
            className="mx-auto mb-6 h-auto"
            loading="eager"
          />
          {children}
        </div>
      </div>
    </main>
  );
}
