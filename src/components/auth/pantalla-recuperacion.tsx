import type { ComponentProps } from "react";
import { PantallaAuth } from "@/components/auth/pantalla-auth";

const PANEL = {
  volanta: "Recuperá tu acceso",
  titulo: "Volvé a entrar al Portal de Empleo.",
  bajada: "Te mandamos un email con un link para crear una contraseña nueva.",
};

/**
 * Recuperar la contraseña (recuperar-contrasena, reset-enviado y
 * nueva-contrasena): `PantallaAuth` con el mismo panel en las tres para que
 * se lean como un solo recorrido. "Volver" va a la pantalla anterior y, si no
 * la hay, al login.
 */
export function PantallaRecuperacion(
  props: Omit<ComponentProps<typeof PantallaAuth>, "panel" | "volverHref">,
) {
  return <PantallaAuth panel={PANEL} volverHref="/auth/login" {...props} />;
}
