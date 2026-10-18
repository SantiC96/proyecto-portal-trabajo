import Link from "next/link";
import {
  PERIODOS,
  PERIODO_LABEL,
  hrefPeriodo,
  type Periodo,
} from "@/lib/indicadores-periodo";

export function SelectorPeriodo({ ruta, periodo }: { ruta: string; periodo: Periodo }) {
  return (
    <nav
      aria-label="Período"
      className="mt-6 grid grid-cols-2 gap-1 rounded-[var(--radius-md)] border border-border bg-surface p-1 sm:flex"
    >
      {PERIODOS.map((p) => (
        <Link
          key={p}
          href={hrefPeriodo(ruta, p)}
          aria-current={p === periodo ? "page" : undefined}
          className={
            p === periodo
              ? "flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-sm)] bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground"
              : "flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-sm)] px-3 py-2 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          }
        >
          {PERIODO_LABEL[p]}
        </Link>
      ))}
    </nav>
  );
}
