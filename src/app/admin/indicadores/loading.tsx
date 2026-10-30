import { EsqueletoEncabezadoIndicadoresOficina, EsqueletoIndicadores } from "./esqueleto-indicadores";

export default function Loading() {
  return (
    <section className="flex flex-col gap-6">
      <EsqueletoEncabezadoIndicadoresOficina />
      <EsqueletoIndicadores />
    </section>
  );
}
