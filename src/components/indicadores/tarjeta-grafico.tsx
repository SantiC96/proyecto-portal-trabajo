import type { ReactNode } from "react";
import { ChevronDown, Lightbulb, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DesplegarTabla } from "./desplegar-tabla";

/** Los mismos números del gráfico, para "Ver datos". La primera celda de cada fila es su rótulo. */
export type TablaDatos = {
  /** Caption de la tabla (lectores de pantalla). */
  titulo: string;
  columnas: string[];
  filas: { clave: string; celdas: string[] }[];
};

type Props = {
  titulo: string;
  /** Ícono verde antes del título (indicadores de la oficina). */
  icono?: LucideIcon;
  descripcion?: ReactNode;
  /** Algo arriba a la derecha, en lugar del destacado: una leyenda, "Ver todas →". */
  accion?: ReactNode;
  /** Valor destacado arriba a la derecha (por ejemplo, el total). */
  destacado?: { valor: string; etiqueta: string };
  /** La conclusión del gráfico, calculada con los datos. */
  conclusion?: string;
  iconoConclusion?: LucideIcon;
  /** Algo entre la conclusión y el gráfico (una leyenda). */
  encabezado?: ReactNode;
  tabla?: TablaDatos;
  /**
   * Indicadores de la empresa: la conclusión va debajo del gráfico, en un
   * recuadro verde suave, y la tabla se despliega con "Ver datos en tabla"
   * desde el encabezado (en lugar de "Ver datos" al pie).
   */
  variante?: "estandar" | "empresa";
  /** Con `variante="empresa"`: la tabla va con "Ver datos en tabla" en el encabezado. */
  tablaEnEncabezado?: boolean;
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
  icono: Icono,
  descripcion,
  accion,
  destacado,
  conclusion,
  iconoConclusion: IconoConclusion = Lightbulb,
  encabezado,
  tabla,
  variante = "estandar",
  tablaEnEncabezado = false,
  children,
  className,
}: Props) {
  const empresa = variante === "empresa";
  const tablaArriba = empresa && tablaEnEncabezado && tabla;

  const titulos = (
    <div className="min-w-0 flex-1 basis-60">
      <h2
        className={cn(
          "text-lg leading-snug font-extrabold text-heading",
          Icono && "flex items-center gap-2",
        )}
      >
        {Icono && <Icono aria-hidden="true" className="size-5 shrink-0 text-primary" />}
        {titulo}
      </h2>
      {descripcion && <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>}
    </div>
  );

  const parrafoConclusion = conclusion && (
    <p
      className={cn(
        "flex items-start gap-2 text-[15px] leading-snug font-bold text-primary-hover",
        empresa ? "mt-5 rounded-[var(--radius-lg)] bg-surface-tinted px-4 py-3" : "mt-4",
      )}
    >
      <IconoConclusion aria-hidden="true" className="mt-px size-[18px] shrink-0" />
      {conclusion}
    </p>
  );

  return (
    <section
      aria-label={titulo}
      className={cn("tarjeta flex min-w-0 flex-col px-4 py-[18px] sm:p-6", className)}
    >
      {tablaArriba ? (
        <DesplegarTabla encabezado={titulos} tabla={<TablaDeDatos tabla={tabla} />} />
      ) : (
        <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          {titulos}
          {accion && <div className="shrink-0">{accion}</div>}
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
      )}

      {!empresa && parrafoConclusion}

      {encabezado && <div className="mt-4">{encabezado}</div>}

      <div className="mt-5 min-w-0 flex-1">{children}</div>

      {empresa && parrafoConclusion}

      {tabla && !tablaArriba && <VerDatos tabla={tabla} />}
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
      <TablaDeDatos tabla={tabla} className="mt-2" />
    </details>
  );
}

/** La tabla con los números de un gráfico (la alternativa accesible). */
export function TablaDeDatos({ tabla, className }: { tabla: TablaDatos; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
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
