import { BotonVolver } from "@/components/ui/boton-volver";
import { ContenedorEsqueleto, Esqueleto } from "@/components/ui/esqueleto";
import { EsqueletoCandidatos, EsqueletoYaSePostularon } from "./esqueleto";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section">
      <BotonVolver href="/admin/ofertas" />
      <div aria-hidden="true">
        <Esqueleto className="mt-4 h-8 w-96 max-w-full sm:h-9" />
        <Esqueleto className="mt-2 h-4 w-48" />
        <Esqueleto className="mt-4 h-28 w-full rounded-[var(--radius-lg)]" />
      </div>
      <EsqueletoCandidatos />
      <EsqueletoYaSePostularon />
    </ContenedorEsqueleto>
  );
}
