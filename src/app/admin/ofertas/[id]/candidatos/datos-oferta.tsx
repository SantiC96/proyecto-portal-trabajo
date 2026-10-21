import { Briefcase, ChevronDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

/** Requisitos que se ven sin desplegar; el resto queda en "Ver más". */
const REQUISITOS_VISIBLES = 3;

/**
 * Datos de la oferta arriba de la búsqueda, con los mismos valores que el
 * detalle público (/ofertas/[id]). Las filas vacías no se muestran.
 */
export function DatosOferta({
  rubros,
  requisitos,
  modalidad,
  ubicacion,
  jornada,
  className,
}: {
  rubros: string[];
  requisitos: string[];
  modalidad: string | null;
  ubicacion: string | null;
  jornada: string | null;
  className?: string;
}) {
  const lugar = ubicacion?.trim();
  const visibles = requisitos.slice(0, REQUISITOS_VISIBLES);
  const ocultos = requisitos.slice(REQUISITOS_VISIBLES);

  if (!rubros.length && !requisitos.length && !modalidad && !lugar && !jornada) return null;

  return (
    <dl
      className={cn(
        "grid grid-cols-1 gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4 text-sm sm:grid-cols-3 sm:gap-x-6",
        className,
      )}
    >
      {rubros.length > 0 && (
        <Fila etiqueta="Rubros" className="sm:col-span-3">
          <ul className="flex flex-wrap gap-1.5">
            {rubros.map((r) => (
              <li
                key={r}
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
              >
                <Briefcase className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="break-words">{r}</span>
              </li>
            ))}
          </ul>
        </Fila>
      )}
      {modalidad && <Fila etiqueta="Modalidad">{modalidad}</Fila>}
      {lugar && (
        <Fila etiqueta="Lugar de trabajo">
          <span className="inline-flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="break-words">{lugar}</span>
          </span>
        </Fila>
      )}
      {jornada && <Fila etiqueta="Jornada">{jornada}</Fila>}
      {requisitos.length > 0 && (
        <Fila etiqueta="Requisitos" className="sm:col-span-3">
          <ListaRequisitos items={visibles} />
          {ocultos.length > 0 && (
            <details className="group mt-2">
              <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-lg text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:min-h-9 [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">Ver {ocultos.length} más</span>
                <span className="hidden group-open:inline">Ver menos</span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </summary>
              <ListaRequisitos items={ocultos} className="mt-1" />
            </details>
          )}
        </Fila>
      )}
    </dl>
  );
}

function Fila({
  etiqueta,
  className,
  children,
}: {
  etiqueta: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className="mt-1 font-medium text-foreground">{children}</dd>
    </div>
  );
}

/** Misma viñeta que RequisitosList del detalle público, en versión compacta. */
function ListaRequisitos({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-1.5", className)}>
      {items.map((req, i) => (
        <li key={i} className="flex items-start gap-2 font-normal text-muted-foreground-strong">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          <span className="min-w-0 break-words">{req}</span>
        </li>
      ))}
    </ul>
  );
}
