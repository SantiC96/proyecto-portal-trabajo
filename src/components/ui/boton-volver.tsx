"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { volverAPantallaAnterior } from "@/lib/navegacion-interna";

/**
 * "Volver", arriba del título en todas las páginas internas. Lleva a la
 * pantalla anterior de esta pestaña, con su query, salteando formularios ya
 * enviados y pantallas de /auth (volverAPantallaAnterior). Solo si no hay una
 * pantalla anterior del sitio (pestaña nueva, link de un email, link directo)
 * navega a `href`. Es siempre un <a href> real: se puede abrir en otra
 * pestaña y solo se intercepta el clic simple.
 */
export function BotonVolver({
  href,
  destacado = false,
  className,
}: {
  /** Destino de respaldo: la página padre. */
  href: string;
  /** Estilo del rediseño de las pantallas del postulante: 15 px 700, verde, flecha de 18 px. */
  destacado?: boolean;
  className?: string;
}) {
  const router = useRouter();

  function alHacerClic(e: MouseEvent<HTMLAnchorElement>) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    if (volverAPantallaAnterior(router)) e.preventDefault();
  }

  return (
    <Link
      href={href}
      onClick={alHacerClic}
      aria-label="Volver a la pantalla anterior"
      className={cn(
        "-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground-strong transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        destacado &&
          "w-fit text-[15px] font-bold text-primary hover:text-primary-hover hover:underline [&_svg]:size-[18px]",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
      Volver
    </Link>
  );
}
