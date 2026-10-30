"use client";

import { Lock } from "lucide-react";
import { SeccionContrasena } from "@/components/perfil/seccion-contrasena";

// El ícono es una función: se elige de este lado para no pasarlo desde la
// página del servidor.
export function SeccionContrasenaEmpresa() {
  return <SeccionContrasena icono={Lock} />;
}
