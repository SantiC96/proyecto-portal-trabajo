import { Esqueleto, EsqueletoLista, EsqueletoTarjeta } from "@/components/ui/esqueleto";
import { EsqueletoGrupo } from "@/components/indicadores/esqueleto-grupo";

// Misma forma que cada bloque de /panel: los usan los Suspense de la página y
// loading.tsx.

function EsqueletoTituloBloque() {
  return <Esqueleto className="h-6 w-44" />;
}

export function EsqueletoIndicadores() {
  return (
    <div aria-busy="true" aria-label="Cargando tus indicadores">
      <EsqueletoTituloBloque />
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EsqueletoGrupo items={4} />
        <EsqueletoGrupo items={3} />
      </div>
    </div>
  );
}

export function EsqueletoListaBloque({ filas, etiqueta }: { filas: number; etiqueta: string }) {
  return (
    <div aria-busy="true" aria-label={etiqueta}>
      <EsqueletoTituloBloque />
      <EsqueletoLista filas={filas} className="mt-4" />
    </div>
  );
}

export function EsqueletoPerfil() {
  return (
    <div aria-busy="true" aria-label="Cargando tu perfil">
      <EsqueletoTarjeta />
    </div>
  );
}
