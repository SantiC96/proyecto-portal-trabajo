"use client";

import { Lock } from "lucide-react";
import { SeccionContrasena } from "@/components/perfil/seccion-contrasena";

// "Contraseña" con el candado (perfil de la empresa y de la oficina). El ícono
// es una función: se elige de este lado para no pasarlo desde la página del
// servidor.
export function SeccionContrasenaCandado() {
  return <SeccionContrasena icono={Lock} />;
}
