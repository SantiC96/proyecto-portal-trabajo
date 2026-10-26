import type { ReactNode } from "react";
import Image from "next/image";
import { LinkVolverAuth } from "@/components/auth/link-volver-auth";
import { PanelMarca } from "@/components/auth/panel-marca";
import { cn } from "@/lib/utils";

type PropsPanel = {
  volanta: string;
  titulo: ReactNode;
  bajada: string;
};

/**
 * Pantallas de /auth de una tarjeta (recuperar la contraseña, verificar el
 * email, aceptar la invitación): la estructura del login, con `PanelMarca` a
 * la izquierda (arriba en el celular) y la columna clara con la tarjeta de
 * 460 px. "Volver" va a la pantalla anterior y, si no la hay, a `volverHref`.
 *
 * Sin `titulo`, el contenido trae su propio encabezado (el formulario de la
 * contraseña nueva, que usa `EncabezadoTarjetaAuth`).
 */
export function PantallaAuth({
  panel,
  volverHref = "/",
  titulo,
  bajada,
  icono,
  tonoIcono,
  children,
}: {
  panel: PropsPanel;
  volverHref?: string;
  titulo?: string;
  bajada?: ReactNode;
  icono?: ReactNode;
  tonoIcono?: TonoIcono;
  children: ReactNode;
}) {
  return (
    <main className="login-pantalla">
      <PanelMarca {...panel} volver={<LinkVolverAuth claro href={volverHref} />} />

      <div className="login-columna">
        <div className="w-full max-w-[460px]">
          {/* En el celular el link va dentro del panel verde. */}
          <div className="hidden lg:block">
            <LinkVolverAuth href={volverHref} />
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
              <EncabezadoTarjetaAuth
                titulo={titulo}
                bajada={bajada}
                icono={icono}
                tonoIcono={tonoIcono}
              />
            )}

            {children}
          </div>
        </div>
      </div>
    </main>
  );
}

type TonoIcono = "primario" | "peligro";

/**
 * Encabezado de la tarjeta: el ícono (opcional) en un círculo de 56 px, el
 * título en Georgia y la bajada de 15 px.
 */
export function EncabezadoTarjetaAuth({
  titulo,
  bajada,
  icono,
  tonoIcono = "primario",
  className,
}: {
  titulo: string;
  bajada?: ReactNode;
  /** Ícono de lucide con aria-hidden. */
  icono?: ReactNode;
  /** "peligro" para un link inválido; por defecto, verde claro. */
  tonoIcono?: TonoIcono;
  className?: string;
}) {
  return (
    <div className={className}>
      {icono && (
        <div
          className={cn(
            "mb-5 flex h-14 w-14 items-center justify-center rounded-full [&_svg]:h-7 [&_svg]:w-7",
            tonoIcono === "peligro" ? "bg-danger text-white" : "bg-primary/10 text-primary",
          )}
        >
          {icono}
        </div>
      )}
      <h1 className="login-titulo login-titulo--sin-volanta">{titulo}</h1>
      {bajada && <p className="mt-3 text-[15px] text-muted-foreground">{bajada}</p>}
    </div>
  );
}
