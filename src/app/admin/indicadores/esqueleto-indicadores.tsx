import { Esqueleto } from "@/components/ui/esqueleto";

function EsqueletoGrupo({ items }: { items: number }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-xs sm:p-5">
      <Esqueleto className="h-6 w-32" />
      <div className="mt-4 grid grid-cols-2 gap-2">
        {Array.from({ length: items }, (_, i) => (
          <Esqueleto key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}

/** Misma estructura que el contenido de /admin/indicadores. */
export function EsqueletoIndicadores() {
  return (
    <div className="mt-8 flex flex-col gap-8" aria-busy="true" aria-label="Cargando indicadores">
      <div>
        <Esqueleto className="h-6 w-40" />
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <EsqueletoGrupo items={2} />
          <EsqueletoGrupo items={3} />
        </div>
      </div>
      <div>
        <Esqueleto className="h-6 w-56" />
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <EsqueletoGrupo items={8} />
          <div className="flex flex-col gap-4">
            <EsqueletoGrupo items={2} />
            <Esqueleto className="h-72 rounded-[var(--radius-lg)]" />
          </div>
        </div>
      </div>
      <Esqueleto className="h-72 rounded-[var(--radius-lg)]" />
    </div>
  );
}
