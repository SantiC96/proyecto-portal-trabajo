"use client";

import Link from "next/link";
import { AuthLink } from "@/components/auth/auth-link";
import { useSesion } from "@/components/layout/sesion-provider";

interface Props {
  className?: string;
}

export function EmpresaPanelLink({ className }: Props) {
  const sesion = useSesion();

  if (sesion?.rol === "empresa") {
    return (
      <Link href="/empresa" className={className}>
        Acceso a panel de empresa
      </Link>
    );
  }

  return (
    <AuthLink href="/auth/login" className={className}>
      Acceso a panel de empresa
    </AuthLink>
  );
}
