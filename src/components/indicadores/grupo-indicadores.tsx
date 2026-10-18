import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

export type Indicador = {
  etiqueta: string;
  /** Valor ya formateado ("1.234", "62,5 %", "—"). */
  valor: string;
  /** Aclaración corta debajo de la etiqueta (por ejemplo, por qué no hay valor). */
  detalle?: string;
  /** Pantalla donde se ve el listado correspondiente. */
  href?: string;
};

const NUMERO = new Intl.NumberFormat("es-AR");
const DECIMAL = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export function formatNumero(valor: number): string {
  return NUMERO.format(valor);
}

export function formatDecimal(valor: number): string {
  return DECIMAL.format(valor);
}

export function GrupoIndicadores({
  titulo,
  icono: Icono,
  indicadores,
}: {
  titulo: string;
  icono: LucideIcon;
  indicadores: Indicador[];
}) {
  return (
    <section
      aria-label={titulo}
      className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-xs sm:p-5"
    >
      <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-primary">
          <Icono className="h-4 w-4" aria-hidden="true" />
        </span>
        {titulo}
      </h3>
      <ul className="mt-4 grid grid-cols-2 gap-2">
        {indicadores.map((indicador) => (
          <li key={indicador.etiqueta}>
            <ItemIndicador indicador={indicador} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ItemIndicador({ indicador }: { indicador: Indicador }) {
  const contenido = (
    <>
      <span className="text-2xl font-bold tabular-nums text-foreground">{indicador.valor}</span>
      <span className="mt-0.5 text-sm text-muted-foreground-strong">{indicador.etiqueta}</span>
      {indicador.detalle && (
        <span className="mt-0.5 text-xs text-muted-foreground">{indicador.detalle}</span>
      )}
    </>
  );

  const base = "flex min-h-11 h-full flex-col rounded-[var(--radius-md)] bg-surface-tinted px-3 py-2.5";

  if (!indicador.href) return <div className={base}>{contenido}</div>;

  return (
    <Link
      href={indicador.href}
      className={`${base} relative pr-8 transition-colors hover:bg-secondary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30`}
    >
      {contenido}
      <ChevronRight
        className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-icon"
        aria-hidden="true"
      />
    </Link>
  );
}
