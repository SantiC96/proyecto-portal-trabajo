import type { ReactNode } from "react";
import Image from "next/image";
import { LinkVolverAuth } from "@/components/auth/link-volver-auth";
import { PanelMarca } from "@/components/auth/panel-marca";

/**
 * Recuperar la contraseña (recuperar-contrasena, reset-enviado y
 * nueva-contrasena): la estructura del login, con el mismo panel en las tres
 * para que se lean como un solo recorrido. "Volver" va a la pantalla anterior
 * y, si no la hay, al login.
 *
 * Sin `titulo`, el contenido trae su propio encabezado (el formulario de la
 * contraseña nueva, que también usa la invitación de la oficina).
 */
export function PantallaRecuperacion({
  titulo,
  bajada,
  icono,
  children,
}: {
  titulo?: string;
  bajada?: ReactNode;
  /** Ícono de lucide; va en un círculo verde claro de 56 px arriba del título. */
  icono?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="login-pantalla">
      <PanelMarca
        volanta="Recuperá tu acceso"
        titulo="Volvé a entrar al Portal de Empleo."
        bajada="Te mandamos un email con un link para crear una contraseña nueva."
        volver={<LinkVolverAuth claro href="/auth/login" />}
      />

      <div className="login-columna">
        <div className="w-full max-w-[460px]">
          {/* En el celular el link va dentro del panel verde. */}
          <div className="hidden lg:block">
            <LinkVolverAuth href="/auth/login" />
          </div>
          <div className="auth-tarjeta login-tarjeta login-entrada login-entrada--demorada">
            <Image
              src="/images/logo-funes-verde.png"
              alt="Municipalidad de Funes"
              width={120}
              height={34}
              className="hidden h-auto w-[120px] lg:block"
              loading="eager"
            />

            {titulo && (
              <div>
                {icono && (
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary [&_svg]:h-7 [&_svg]:w-7">
                    {icono}
                  </div>
                )}
                <h1 className="login-titulo login-titulo--sin-volanta">{titulo}</h1>
                {bajada && <p className="mt-3 text-[15px] text-muted-foreground">{bajada}</p>}
              </div>
            )}

            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
