import { Esqueleto, EsqueletoTitulo } from "@/components/ui/esqueleto";
import { EsqueletoIndicadores } from "./esqueleto-indicadores";

export default function Loading() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Esqueleto className="h-4 w-32" />
      <EsqueletoTitulo className="mt-4" />
      <Esqueleto className="mt-6 h-12 w-full" />
      <EsqueletoIndicadores />
    </section>
  );
}
