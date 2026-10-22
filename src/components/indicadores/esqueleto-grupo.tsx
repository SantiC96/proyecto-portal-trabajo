import { Esqueleto } from "@/components/ui/esqueleto";

/** Misma forma que GrupoIndicadores con `items` indicadores. */
export function EsqueletoGrupo({ items }: { items: number }) {
  return (
    <div className="tarjeta p-4 sm:p-5">
      <Esqueleto className="h-6 w-32" />
      <div className="mt-4 grid grid-cols-2 gap-2">
        {Array.from({ length: items }, (_, i) => (
          <Esqueleto key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}
