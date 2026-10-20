"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SesionActivaModal } from "@/components/auth/sesion-activa-modal";
import type { Rol } from "@/types/db";

interface Props {
  nombre: string;
  rol: Rol | null;
  redirectTo: string;
  accion?: "registro" | "login" | "otro-rol";
  rolesDestino?: Rol[];
  profileHref?: string;
}

export function SesionActivaLanding({
  nombre,
  rol,
  redirectTo,
  accion = "registro",
  rolesDestino,
  profileHref,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <SesionActivaModal
      nombre={nombre}
      rol={rol}
      redirectTo={redirectTo}
      accion={accion}
      rolesDestino={rolesDestino}
      profileHref={profileHref}
      onClose={() => {
        setOpen(false);
        router.replace("/");
      }}
    />
  );
}
