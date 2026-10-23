import { EsqueletoEncabezadoIndicadores } from "@/components/indicadores/esqueletos";
import { EsqueletoIndicadores } from "./esqueleto-indicadores";

export default function Loading() {
  return (
    <section className="flex flex-col gap-6">
      <EsqueletoEncabezadoIndicadores />
      <EsqueletoIndicadores />
    </section>
  );
}
