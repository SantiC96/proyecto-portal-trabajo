import { EsqueletoEncabezadoIndicadores } from "@/components/indicadores/esqueletos";
import { EsqueletoIndicadoresEmpresa } from "./esqueleto-indicadores-empresa";

export default function Loading() {
  return (
    <section className="flex flex-col gap-6">
      <EsqueletoEncabezadoIndicadores />
      <EsqueletoIndicadoresEmpresa />
    </section>
  );
}
