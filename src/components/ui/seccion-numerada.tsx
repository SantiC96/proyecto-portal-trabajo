import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  numero: number;
  titulo: string;
  /** id del título, para aria-labelledby de la sección. */
  id: string;
  descripcion?: ReactNode;
  /** "tarjeta": cada sección en su propia tarjeta (formulario de oferta); "plana": dentro de otra tarjeta (registro). */
  variante?: "tarjeta" | "plana";
  children: ReactNode;
  className?: string;
};

/**
 * Sección de un formulario largo: el número en un círculo verde de 28 px y
 * el título de 18 px 800, con sus campos debajo.
 */
export function SeccionNumerada({
  numero,
  titulo,
  id,
  descripcion,
  variante = "tarjeta",
  children,
  className,
}: Props) {
  return (
    <section
      aria-labelledby={id}
      className={cn(variante === "tarjeta" && "tarjeta px-4 py-5 sm:p-6", className)}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground"
        >
          {numero}
        </span>
        <h2 id={id} className="text-lg leading-snug font-extrabold text-heading">
          <span className="sr-only">{numero}. </span>
          {titulo}
        </h2>
      </div>
      {descripcion && <p className="mt-1.5 text-sm text-muted-foreground sm:pl-10">{descripcion}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
