import type { ReactNode } from "react";
import { ChevronDown, Lightbulb, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Los mismos números del gráfico, para "Ver datos". La primera celda de cada fila es su rótulo. */
export type TablaDatos = {
  /** Caption de la tabla (lectores de pantalla). */
  titulo: string;
  columnas: string[];
  filas: { clave: string; celdas: string[] }[];
};

type Props = {
  titulo: string;
  descripcion?: ReactNode;
  /** Valor destacado arriba a la derecha (por ejemplo, el total). */
  destacado?: { valor: string; etiqueta: string };
  /** La conclusión del gráfico, calculada con los datos. */
  conclusion?: string;
  iconoConclusion?: LucideIcon;
  /** Algo entre la conclusión y el gráfico (una leyenda). */
  encabezado?: ReactNode;
  tabla?: TablaDatos;
  children: ReactNode;
  className?: string;
};

/**
 * Tarjeta de un gráfico: título, descripción, valor destacado opcional, la
 * conclusión en una línea verde, el gráfico y "Ver datos" con la tabla de los
 * mismos números (la alternativa accesible al gráfico).
 */
export function TarjetaGrafico({
  titulo,
  descripcion,
  destacado,
  conclusion,
  iconoConclusion: IconoConclusion = Lightbulb,
  encabezado,
  tabla,
  children,
  className,
}: Props) {
  return (
    <section
      aria-label={titulo}
      className={cn("tarjeta flex min-w-0 flex-col px-4 py-[18px] sm:p-6", className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-60">
          <h2 className="text-lg leading-snug font-extrabold text-heading">{titulo}</h2>
          {descripcion && <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>}
        </div>
        {destacado && (
          <p className="flex shrink-0 flex-col items-start sm:items-end">
            <span className="text-[30px] leading-none font-extrabold text-heading tabular-nums">
              {destacado.valor}
            </span>
            <span className="mt-1 text-[13px] font-semibold text-muted-foreground">
              {destacado.etiqueta}
            </span>
          </p>
        )}
      </header>

      {conclusion && (
        <p className="mt-4 flex items-start gap-2 text-[15px] leading-snug font-bold text-primary-hover">
          <IconoConclusion aria-hidden="true" className="mt-px size-[18px] shrink-0" />
          {conclusion}
        </p>
      )}

      {encabezado && <div className="mt-4">{encabezado}</div>}

      <div className="mt-5 min-w-0 flex-1">{children}</div>

      {tabla && <VerDatos tabla={tabla} />}
    </section>
  );
}

/** "Ver datos": la tabla con los números del gráfico, plegada. */
export function VerDatos({ tabla, className }: { tabla: TablaDatos; className?: string }) {
  return (
    <details className={cn("group mt-5 border-t border-tabla-borde pt-2", className)}>
      <summary className="inline-flex min-h-11 list-none items-center gap-1.5 rounded-[var(--radius-sm)] text-[15px] font-bold text-primary outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)] [&::-webkit-details-marker]:hidden">
        <ChevronDown
          aria-hidden="true"
          className="size-[18px] transition-transform duration-150 group-open:rotate-180"
        />
        <span className="group-open:hidden">Ver datos</span>
        <span className="hidden group-open:inline">Ocultar datos</span>
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-sm">
          <caption className="sr-only">{tabla.titulo}</caption>
          <thead>
            <tr className="bg-tabla-cabecera">
              {tabla.columnas.map((c, i) => (
                <th
                  key={c}
                  scope="col"
                  className={cn(
                    "px-3 py-2 text-xs font-bold tracking-[0.06em] text-neutral uppercase",
                    i === 0 ? "text-left" : "text-right",
                  )}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabla.filas.map((f) => (
              <tr key={f.clave} className="border-b border-tabla-borde last:border-b-0">
                {f.celdas.map((celda, i) =>
                  i === 0 ? (
                    <th
                      key={i}
                      scope="row"
                      className="px-3 py-2 text-left font-semibold text-control-foreground"
                    >
                      {celda}
                    </th>
                  ) : (
                    <td key={i} className="px-3 py-2 text-right text-foreground tabular-nums">
                      {celda}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Indicador chico de una tarjeta de resumen: ícono en un cuadrado gris, número y texto. */
export function IndicadorChico({
  icono: Icono,
  valor,
  texto,
}: {
  icono: LucideIcon;
  valor: string;
  texto: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-2.5">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-secondary text-primary"
      >
        <Icono className="size-5" />
      </span>
      <span className="text-[22px] leading-none font-extrabold text-heading tabular-nums">
        {valor}
      </span>
      <span className="text-[13px] leading-snug text-muted-foreground-strong">{texto}</span>
    </div>
  );
}
