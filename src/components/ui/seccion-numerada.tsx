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
  /** Clases del contenedor de los campos (por ejemplo, para que crezca con la sección). */
  classNameCuerpo?: string;
};

/**
 * Sección de un formulario largo: el número en un círculo verde y el título,
 * con sus campos debajo. En la tarjeta (formulario de oferta), círculo de
 * 34 px, título de 19 px 800 y bajada de 14 px; plana (registro), círculo de
 * 28 px y título de 18 px 800.
 */
export function SeccionNumerada({
  numero,
  titulo,
  id,
  descripcion,
  variante = "tarjeta",
  children,
  className,
  classNameCuerpo,
}: Props) {
  const tarjeta = variante === "tarjeta";
  return (
    <section
      aria-labelledby={id}
      className={cn(tarjeta && "tarjeta px-4 py-5 sm:p-6", className)}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-primary font-extrabold text-primary-foreground",
            tarjeta ? "size-[34px] text-[15px]" : "size-7 text-sm",
          )}
        >
          {numero}
        </span>
        <h2
          id={id}
          className={cn(
            "leading-snug font-extrabold text-heading",
            tarjeta ? "text-[19px]" : "text-lg",
          )}
        >
          <span className="sr-only">{numero}. </span>
          {titulo}
        </h2>
      </div>
      {descripcion && (
        <p
          className={cn(
            "mt-1.5 text-sm text-muted-foreground",
            tarjeta ? "sm:pl-[46px]" : "sm:pl-10",
          )}
        >
          {descripcion}
        </p>
      )}
      <div className={cn("mt-5", classNameCuerpo)}>{children}</div>
    </section>
  );
}
