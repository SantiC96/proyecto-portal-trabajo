import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Clases de una pastilla de filtro: 44 px en el celular, 40 px desde sm. */
export function clasePastilla(activa: boolean, className?: string): string {
  return cn(
    "inline-flex h-11 shrink-0 items-center justify-center rounded-[20px] border-[1.5px] px-4 text-[15px] font-semibold whitespace-nowrap outline-none transition-colors duration-150 focus-visible:shadow-[var(--sombra-foco)] sm:h-10",
    activa
      ? "border-primary bg-primary text-primary-foreground hover:bg-primary-hover"
      : "border-border-campo bg-surface text-control-foreground hover:border-primary hover:text-primary",
    className,
  );
}

/**
 * Pastilla de filtro que es un link (el filtro vive en la URL). La activa se
 * marca con aria-current: aria-pressed no es válido en un link.
 */
export function PastillaFiltro({
  href,
  activa,
  children,
}: {
  href: string;
  activa: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={activa ? "true" : undefined}
      className={clasePastilla(activa)}
    >
      {children}
    </Link>
  );
}

/**
 * Grupo de pastillas con su título. En el celular, una sola fila con scroll
 * horizontal; desde sm bajan de renglón.
 */
export function GrupoPastillas({
  id,
  titulo,
  children,
  className,
}: {
  id: string;
  titulo: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span id={id} className="text-[13px] font-bold text-muted-foreground-strong">
        {titulo}
      </span>
      <div
        role="group"
        aria-labelledby={id}
        className="sin-barra-scroll -mx-4 -my-1 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        {children}
      </div>
    </div>
  );
}
