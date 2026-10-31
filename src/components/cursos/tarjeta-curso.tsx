import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconoCuadro } from "@/components/ui/icono-cuadro";

/**
 * Tarjeta de un curso (Mis cursos del postulante, Cursos de la oficina y la
 * vista previa de Crear curso): BookOpen en un cuadrado verde, el nombre con
 * su badge, una línea gris opcional, la descripción (3 líneas como máximo) y
 * lo que siga en `children`. El link del nombre cubre toda la tarjeta; los
 * botones de `children` quedan por encima (`relative z-10`).
 *
 * `pista`: el link de la derecha ("Ver curso ›"; abajo en el celular). Sin
 * `etiqueta` es solo la pista visual (aria-hidden: lo dice el link del
 * nombre); con `etiqueta` es un link propio con ese nombre accesible.
 *
 * `ejemplo` (vista previa): el nombre o la descripción son texto de ejemplo,
 * en gris (`placeholder`, 4,5:1) e itálica.
 */
export function TarjetaCurso({
  href,
  nombre,
  badge,
  detalle,
  descripcion,
  pista,
  ejemplo,
  children,
  className,
}: {
  href: string;
  nombre: string;
  badge: ReactNode;
  detalle?: ReactNode;
  descripcion?: ReactNode;
  pista: { texto: string; etiqueta?: string };
  ejemplo?: { nombre?: boolean; descripcion?: boolean };
  children?: ReactNode;
  className?: string;
}) {
  const clasePista =
    "col-start-2 inline-flex items-center gap-1 text-[15px] font-bold whitespace-nowrap text-primary group-hover:underline sm:col-start-3 sm:row-start-1 sm:self-center";

  return (
    <article
      className={cn(
        "tarjeta tarjeta-panel tarjeta-clickeable group relative grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4",
        className,
      )}
    >
      <IconoCuadro icono={BookOpen} />

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h2 className="text-[17px] leading-snug font-extrabold break-words">
            <Link
              href={href}
              className={cn(
                "outline-none group-hover:underline after:absolute after:inset-0 after:rounded-[var(--radius-indicador)] focus-visible:after:shadow-[var(--sombra-foco)]",
                ejemplo?.nombre ? "text-placeholder italic" : "text-primary",
              )}
            >
              {nombre}
            </Link>
          </h2>
          {badge}
        </div>
        {detalle && <div className="mt-1 text-sm text-muted-foreground">{detalle}</div>}

        {descripcion && (
          <p
            className={cn(
              "mt-2.5 line-clamp-3 text-[15px] leading-normal break-words",
              ejemplo?.descripcion ? "text-placeholder italic" : "text-foreground",
            )}
          >
            {descripcion}
          </p>
        )}

        {children}
      </div>

      {pista.etiqueta ? (
        <Link
          href={href}
          aria-label={pista.etiqueta}
          className={cn(
            clasePista,
            "relative z-10 -my-2 min-h-11 rounded-[var(--radius-md)] outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]",
          )}
        >
          {pista.texto}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span aria-hidden="true" className={clasePista}>
          {pista.texto}
          <ChevronRight className="size-4" />
        </span>
      )}
    </article>
  );
}

/** "Ir al curso" de la tarjeta del postulante: abre el link del curso en otra pestaña. */
export function BotonIrAlCurso({ link }: { link: string }) {
  return (
    <div className="mt-3">
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="relative z-10 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
      >
        Ir al curso
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
