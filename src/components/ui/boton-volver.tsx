import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Enlace para volver a la página padre. Va arriba del título, en todas las
 * páginas internas. El destino es explícito (no el historial del navegador)
 * para que funcione igual cuando se entra desde un link de un email.
 */
export function BotonVolver({
  href,
  children = "Volver",
  className,
}: {
  href: string;
  /** Texto después de la flecha: "Volver a mis ofertas". */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground-strong transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </Link>
  );
}
