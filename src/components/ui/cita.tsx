import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Texto citado (la nota de la Oficina de Empleo): 16 px con interlineado 1,6
 * y borde izquierdo verde de 3 px; la firma debajo, en 13 px.
 */
export function Cita({
  children,
  firma,
  className,
}: {
  children: ReactNode;
  /** Quién y cuándo, si se sabe. */
  firma?: ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <blockquote className="border-l-[3px] border-primary px-4 py-1 text-base leading-[1.6] whitespace-pre-line break-words text-texto-parrafo">
        {children}
      </blockquote>
      {firma && <figcaption className="text-[13px] text-muted-foreground">{firma}</figcaption>}
    </figure>
  );
}
