"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SesionActivaModal } from "@/components/auth/sesion-activa-modal";

interface Props {
  nombre: string;
  rol: string | null;
  redirectTo: string;
  accion?: "registro" | "login";
  profileHref?: string;
}

export function SesionActivaLanding({ nombre, rol, redirectTo, accion = "registro", profileHref }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <SesionActivaModal
      nombre={nombre}
      rol={rol}
      redirectTo={redirectTo}
      accion={accion}
      profileHref={profileHref}
      onClose={() => {
        setOpen(false);
        router.replace("/");
      }}
    />
  );
}
