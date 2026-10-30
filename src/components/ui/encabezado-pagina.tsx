import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DecoracionBanda } from "@/components/ui/decoracion-banda";

type Props = {
  titulo: ReactNode;
  bajada?: ReactNode;
  /** Botones a la derecha, alineados abajo; en el celular pasan debajo del título. */
  acciones?: ReactNode;
  /** Título de portada: Georgia 400 de 52 px (36 en el celular) y bajada de 17 px (indicadores de la oficina). */
  grande?: boolean;
  /**
   * Banda verde con anillo y escudo (pantallas del postulante): título
   * Georgia 400 blanco de 48 px (34 en el celular). En las acciones, el
   * `.btn-primario` va blanco y los `.btn-secundario`/`.btn-neutro`,
   * transparentes con borde blanco; en el celular, a todo el ancho.
   */
  banda?: boolean;
  /**
   * Solo con `banda` (pantallas de la empresa): todos los botones de las
   * acciones van blancos con texto `primary`, también los secundarios y los
   * de baja.
   */
  botonesBlancos?: boolean;
  /** Solo con `banda`: algo al lado del título, como el badge del estado. */
  junto?: ReactNode;
  className?: string;
};

/** Título de la página en Georgia (32 px 700; 26 px en el celular) con su bajada y acciones opcionales. */
export function EncabezadoPagina({
  titulo,
  bajada,
  acciones,
  grande = false,
  banda = false,
  botonesBlancos = false,
  junto,
  className,
}: Props) {
  if (banda) {
    const h1 = (
      <h1 className="titulo-portada min-w-0 text-[34px] leading-[1.1] break-words text-primary-foreground sm:text-5xl">
        {titulo}
      </h1>
    );
    return (
      <header
        className={cn(
          "encabezado-banda flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6",
          className,
        )}
      >
        <DecoracionBanda />
        <div className="min-w-0">
          {junto ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {h1}
              {junto}
            </div>
          ) : (
            h1
          )}
          {bajada && (
            <p className="mt-2 text-[15px] leading-normal text-sidebar-texto sm:text-[17px]">
              {bajada}
            </p>
          )}
        </div>
        {acciones && (
          <div
            className={cn(
              "encabezado-banda-acciones flex shrink-0 flex-col gap-3 sm:flex-row sm:flex-wrap",
              botonesBlancos && "encabezado-banda-acciones--blancos",
            )}
          >
            {acciones}
          </div>
        )}
      </header>
    );
  }

  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1
          className={cn(
            "break-words text-heading",
            grande
              ? "titulo-portada text-[36px] leading-[1.05] sm:text-[52px]"
              : "titulo-display text-[26px] leading-[1.15] sm:text-[32px]",
          )}
        >
          {titulo}
        </h1>
        {bajada && (
          <p className={cn("mt-1.5 text-muted-foreground", grande ? "text-[17px]" : "text-base")}>
            {bajada}
          </p>
        )}
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap gap-3">{acciones}</div>}
    </header>
  );
}
