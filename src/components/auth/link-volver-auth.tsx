"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { volverAPantallaAnterior } from "@/lib/navegacion-interna";

/**
 * "Volver" de las pantallas de /auth. Como BotonVolver, lleva a la pantalla
 * anterior del sitio en esta pestaña salteando las de /auth; si no la hay, va
 * a `href` (el inicio o el login). Con `saltearAuth={false}` (el registro) va a
 * la pantalla inmediatamente anterior aunque sea de /auth, como el login. Con
 * `usarHistorial={false}` es un link común a `href` (el login lo usa para
 * "Volver al inicio").
 */
export function LinkVolverAuth({
  href = "/",
  claro = false,
  texto = "Volver",
  usarHistorial = true,
  saltearAuth = true,
  className,
}: {
  href?: string;
  /** Sobre el panel verde (registro en el celular). */
  claro?: boolean;
  texto?: string;
  usarHistorial?: boolean;
  saltearAuth?: boolean;
  className?: string;
}) {
  const router = useRouter();

  function alHacerClic(e: MouseEvent<HTMLAnchorElement>) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    if (volverAPantallaAnterior(router, { saltearAuth })) e.preventDefault();
  }

  return (
    <Link
      href={href}
      onClick={usarHistorial ? alHacerClic : undefined}
      aria-label={usarHistorial ? "Volver a la pantalla anterior" : undefined}
      className={cn("auth-volver", claro && "auth-volver--claro", className)}
    >
      <ArrowLeft aria-hidden="true" />
      {texto}
    </Link>
  );
}
