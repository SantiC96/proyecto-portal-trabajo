import Image from "next/image";
import { LinkVolverAuth } from "@/components/auth/link-volver-auth";

/**
 * Pantallas de /auth sin navegación (recuperar y nueva contraseña, verificar
 * email, invitación): fondo claro, contenido centrado de 460 px, "Volver" y
 * el contenido en una tarjeta con el logo arriba, como la del login. El login
 * y el registro tienen su propio diseño con el panel verde (PanelMarca).
 */
export function AuthShell({
  children,
  volverHref,
}: {
  children: React.ReactNode;
  /** Destino de "Volver" si no hay una pantalla anterior del sitio. */
  volverHref?: string;
}) {
  return (
    <main className="auth-fondo">
      <div className="w-full max-w-[460px]">
        <LinkVolverAuth href={volverHref} />
        <div className="auth-tarjeta">
          <Image
            src="/images/logo-funes-verde.png"
            alt="Municipalidad de Funes"
            width={120}
            height={34}
            className="mx-auto mb-6 h-auto w-[120px]"
            loading="eager"
          />
          {children}
        </div>
      </div>
    </main>
  );
}
