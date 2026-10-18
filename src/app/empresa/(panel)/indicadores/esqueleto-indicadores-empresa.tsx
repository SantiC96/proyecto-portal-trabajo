import { Esqueleto } from "@/components/ui/esqueleto";
import { EsqueletoGrupo } from "@/components/indicadores/esqueleto-grupo";

/** Misma estructura que el contenido de /empresa/indicadores. */
export function EsqueletoIndicadoresEmpresa() {
  return (
    <div className="mt-8 flex flex-col gap-8" aria-busy="true" aria-label="Cargando indicadores">
      <div>
        <Esqueleto className="h-6 w-40" />
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <EsqueletoGrupo items={5} />
          <EsqueletoGrupo items={2} />
        </div>
      </div>
      <div>
        <Esqueleto className="h-6 w-56" />
        <div className="mt-4">
          <EsqueletoGrupo items={5} />
        </div>
      </div>
      <div>
        <Esqueleto className="h-6 w-32" />
        <Esqueleto className="mt-4 h-56 rounded-[var(--radius-lg)]" />
      </div>
    </div>
  );
}
