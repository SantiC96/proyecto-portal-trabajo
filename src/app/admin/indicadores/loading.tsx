import { Esqueleto, EsqueletoTitulo } from "@/components/ui/esqueleto";
import { EsqueletoIndicadores } from "./esqueleto-indicadores";

export default function Loading() {
  return (
    <section>
      <Esqueleto className="h-4 w-32" />
      <EsqueletoTitulo className="mt-4" />
      <Esqueleto className="mt-6 h-12 w-full" />
      <EsqueletoIndicadores />
    </section>
  );
}
