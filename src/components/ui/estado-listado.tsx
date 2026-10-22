import type { ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, SearchX, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const CONTENEDOR =
  "flex flex-col items-center gap-3 rounded-[var(--radius-xl)] border border-dashed border-border-strong bg-surface px-4 py-12 text-center sm:px-8";

const ICONO = "flex h-12 w-12 items-center justify-center rounded-full";

type PropsVacio =
  | {
      /** Todavía no hay registros: no se ofrece limpiar filtros. */
      tipo: "sin-registros";
      titulo: string;
      descripcion?: string;
      icono?: LucideIcon;
      /** Acción útil opcional (por ejemplo "Publicar oferta"). */
      accion?: ReactNode;
      className?: string;
    }
  | {
      /** Hay registros, pero la búsqueda o los filtros no devuelven ninguno. */
      tipo: "sin-resultados";
      titulo?: string;
      descripcion?: string;
      hrefLimpiar: string;
      textoLimpiar?: string;
      className?: string;
    };

export function EstadoVacio(props: PropsVacio) {
  if (props.tipo === "sin-resultados") {
    return (
      <div className={cn(CONTENEDOR, props.className)}>
        <div className={cn(ICONO, "bg-surface-tinted text-muted-foreground")}>
          <SearchX className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <p className="font-semibold text-foreground">
            {props.titulo ?? "No hay resultados para tu búsqueda"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {props.descripcion ??
              "Probá con otras palabras o quitá algunos filtros."}
          </p>
        </div>
        <Link
          href={props.hrefLimpiar}
          className="btn-secundario mt-1 inline-flex min-h-11 items-center gap-1.5 px-4 text-sm font-medium"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {props.textoLimpiar ?? "Limpiar filtros"}
        </Link>
      </div>
    );
  }

  const Icono = props.icono;
  return (
    <div className={cn(CONTENEDOR, props.className)}>
      {Icono && (
        <div className={cn(ICONO, "bg-secondary text-primary")}>
          <Icono className="h-6 w-6" aria-hidden="true" />
        </div>
      )}
      <div>
        <p className="font-semibold text-foreground">{props.titulo}</p>
        {props.descripcion && (
          <p className="mt-1 text-sm text-muted-foreground">{props.descripcion}</p>
        )}
      </div>
      {props.accion && <div className="mt-1">{props.accion}</div>}
    </div>
  );
}

type PropsError = {
  mensaje?: string;
  /** Código devuelto por logError; se muestra para que el usuario lo informe. */
  refError?: string;
  className?: string;
};

export function ErrorListado({ mensaje, refError, className }: PropsError) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-2 rounded-[var(--radius-lg)] bg-danger px-4 py-10 text-center text-white sm:px-8",
        className,
      )}
    >
      <AlertCircle className="h-6 w-6" aria-hidden="true" />
      <p className="font-semibold">
        {mensaje ?? "No pudimos cargar el listado. Intentá de nuevo en unos minutos."}
      </p>
      {refError && (
        <p className="text-sm text-white/90">
          Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código:{" "}
          <span className="font-mono">{refError}</span>
        </p>
      )}
    </div>
  );
}
